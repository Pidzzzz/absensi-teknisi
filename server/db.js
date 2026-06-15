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
    console.log('Migration completed: Added waiting_review to assignments CHECK constraint.');
  }
} catch (e) {
  console.error('Migration failed:', e);
}

module.exports = db;
