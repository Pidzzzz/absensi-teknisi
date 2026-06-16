const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'absensi.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'technician'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('check-in', 'check-out')),
    timestamp TEXT NOT NULL,
    lat REAL,
    lng REAL,
    synced INTEGER DEFAULT 0,
    status TEXT DEFAULT 'hadir',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS role_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    requested_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS password_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    new_password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS absence_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    attendance_date TEXT NOT NULL,
    warning_type TEXT NOT NULL CHECK(warning_type IN ('request_explanation', 'reprimand')),
    message TEXT NOT NULL,
    admin_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS absence_excuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    attendance_date TEXT NOT NULL,
    reason TEXT NOT NULL CHECK(reason IN ('sakit', 'acara_keluarga', 'kendala_lapangan', 'lainnya')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    province TEXT,
    site_id TEXT,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    visit_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
  );

  CREATE TABLE IF NOT EXISTS documentation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_required INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documentation_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected')),
    review_note TEXT,
    reviewed_at TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (item_id) REFERENCES documentation_items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try {
  db.exec('ALTER TABLE attendance ADD COLUMN assignment_id INTEGER');
} catch (e) {
  // Column already exists
}

try {
  db.exec('ALTER TABLE attendance ADD COLUMN location_id INTEGER');
} catch (e) {
  // Column already exists
}

try {
  db.exec("ALTER TABLE assignments ADD COLUMN type TEXT DEFAULT 'CORRECTIVE'");
} catch (e) {
  // Column already exists
}

// Migration to support waiting_review status in assignments
try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='assignments'").get();
  if (schema && !schema.sql.includes('waiting_review')) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.transaction(() => {
      db.exec('ALTER TABLE assignments RENAME TO assignments_old');
      db.exec(`
        CREATE TABLE assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          location_id INTEGER NOT NULL,
          visit_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'waiting_review', 'completed', 'cancelled')),
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          type TEXT DEFAULT 'CORRECTIVE',
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (location_id) REFERENCES locations(id)
        )
      `);
      db.exec('INSERT INTO assignments (id, user_id, location_id, visit_date, status, notes, created_at, type) SELECT id, user_id, location_id, visit_date, status, notes, created_at, type FROM assignments_old');
      db.exec('DROP TABLE assignments_old');
    })();
    db.exec('PRAGMA foreign_keys = ON');
    console.log('Migration completed: Added waiting_review to assignments CHECK constraint.');
  }
} catch (e) {
  console.error('Migration failed:', e);
}

// Migration: add review columns to documentation_uploads if missing
try {
  const cols = db.prepare("PRAGMA table_info(documentation_uploads)").all().map(c => c.name);
  if (!cols.includes('review_status')) {
    db.exec("ALTER TABLE documentation_uploads ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'");
    console.log('Migration: Added review_status to documentation_uploads');
  }
  if (!cols.includes('review_note')) {
    db.exec("ALTER TABLE documentation_uploads ADD COLUMN review_note TEXT");
    console.log('Migration: Added review_note to documentation_uploads');
  }
  if (!cols.includes('reviewed_at')) {
    db.exec("ALTER TABLE documentation_uploads ADD COLUMN reviewed_at TEXT");
    console.log('Migration: Added reviewed_at to documentation_uploads');
  }
} catch (e) {
  console.error('Migration review columns failed:', e);
}

// Migration: add status column to attendance if missing
try {
  const attCols = db.prepare("PRAGMA table_info(attendance)").all().map(c => c.name);
  if (!attCols.includes('status')) {
    db.exec("ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'hadir'");
    console.log('Migration: Added status to attendance');
  }
} catch (e) {
  console.error('Migration attendance status failed:', e);
}

module.exports = db;
