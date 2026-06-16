const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const db = require('../db');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/docs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Documentation Items (Admin)
router.get('/items', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM documentation_items ORDER BY created_at DESC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/items', (req, res) => {
  try {
    const { name, description, is_required } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama item wajib diisi' });

    const result = db.prepare(
      'INSERT INTO documentation_items (name, description, is_required) VALUES (?, ?, ?)'
    ).run(name, description || '', is_required !== undefined ? is_required : 1);

    const item = db.prepare('SELECT * FROM documentation_items WHERE id = ?').get(result.lastInsertRowid);
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/items/:id', (req, res) => {
  try {
    const { name, description, is_required } = req.body;
    const item = db.prepare('SELECT * FROM documentation_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' });

    db.prepare('UPDATE documentation_items SET name = ?, description = ?, is_required = ? WHERE id = ?')
      .run(name || item.name, description || item.description, is_required !== undefined ? is_required : item.is_required, req.params.id);

    const updated = db.prepare('SELECT * FROM documentation_items WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/items/:id/toggle', (req, res) => {
  try {
    const { is_required } = req.body;
    db.prepare('UPDATE documentation_items SET is_required = ? WHERE id = ?').run(is_required, req.params.id);
    const updated = db.prepare('SELECT * FROM documentation_items WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/items/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body;
    const stmt = db.prepare('UPDATE documentation_items SET id = ? WHERE id = ?');
    const temp = db.prepare('UPDATE documentation_items SET id = -1 WHERE id = ?');
    const reorder = db.transaction((ids) => {
      for (let i = 0; i < ids.length; i++) {
        temp.run(ids[i]);
      }
      for (let i = 0; i < ids.length; i++) {
        stmt.run(ids[i], -1);
      }
    });
    reorder(orderedIds);
    const items = db.prepare('SELECT * FROM documentation_items ORDER BY id ASC').all();
    res.json(items);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/items/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM documentation_items WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Item tidak ditemukan' });
    res.json({ message: 'Item berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/items/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diupload' });

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let items = [];

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      
      items = data.map(row => {
        const vals = Object.values(row);
        const name = vals[0] || '';
        const description = vals[1] || '';
        const isRequired = vals[2] !== undefined ? (String(vals[2]).toLowerCase() === 'true' || String(vals[2]).toLowerCase() === 'wajib' || String(vals[2]) === '1' ? 1 : 0) : 1;
        return { name: String(name).trim(), description: String(description).trim(), is_required: isRequired };
      }).filter(item => item.name);
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      const lines = result.value.split('\n').filter(l => l.trim());
      items = lines.map(line => {
        const parts = line.split(/\t|;|\||,/).map(p => p.trim());
        return {
          name: parts[0] || '',
          description: parts[1] || '',
          is_required: parts[2] !== undefined ? (String(parts[2]).toLowerCase() === 'true' || String(parts[2]).toLowerCase() === 'wajib' || String(parts[2]) === '1' ? 1 : 0) : 1
        };
      }).filter(item => item.name);
    }

    fs.unlinkSync(filePath);

    if (items.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data item dalam file' });
    }

    const insert = db.prepare('INSERT INTO documentation_items (name, description, is_required) VALUES (?, ?, ?)');
    const insertMany = db.transaction((list) => {
      const results = [];
      for (const item of list) {
        const existing = db.prepare('SELECT * FROM documentation_items WHERE name = ?').get(item.name);
        if (!existing) {
          const r = insert.run(item.name, item.description, item.is_required);
          results.push(r.lastInsertRowid);
        }
      }
      return results;
    });

    const ids = insertMany(items);
    res.json({ message: `${ids.length} item berhasil diimport`, count: ids.length, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload documentation (Technician)
router.get('/uploads/:assignmentId', (req, res) => {
  try {
    const uploads = db.prepare(`
      SELECT du.*, di.name as item_name, di.description as item_description, di.is_required
      FROM documentation_uploads du
      JOIN documentation_items di ON du.item_id = di.id
      WHERE du.assignment_id = ?
      ORDER BY di.created_at ASC
    `).all(req.params.assignmentId);
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/checklist/:assignmentId', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM documentation_items ORDER BY created_at ASC').all();
    const uploads = db.prepare(
      'SELECT * FROM documentation_uploads WHERE assignment_id = ?'
    ).all(req.params.assignmentId);

    const checklist = items.map(item => {
      const upload = uploads.find(u => u.item_id === item.id);
      return {
        ...item,
        uploaded: !!upload,
        upload: upload || null
      };
    });

    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diupload' });

    const { assignment_id, item_id, user_id } = req.body;

    const existing = db.prepare(
      'SELECT * FROM documentation_uploads WHERE assignment_id = ? AND item_id = ?'
    ).get(assignment_id, item_id);

    if (existing) {
      const oldPath = path.join(__dirname, '../uploads/docs', existing.file_name);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      db.prepare('DELETE FROM documentation_uploads WHERE id = ?').run(existing.id);
    }

    const result = db.prepare(
      'INSERT INTO documentation_uploads (assignment_id, item_id, user_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(assignment_id, item_id, user_id, req.file.filename, req.file.path, req.file.mimetype);

    // Notify all admins about the upload
    try {
      const technician = db.prepare('SELECT name FROM users WHERE id = ?').get(user_id);
      const technicianName = technician ? technician.name : 'Teknisi';

      const assignment = db.prepare(`
        SELECT a.*, l.name as location_name 
        FROM assignments a
        JOIN locations l ON a.location_id = l.id
        WHERE a.id = ?
      `).get(assignment_id);
      const locationName = assignment ? assignment.location_name : 'Lokasi';

      const item = db.prepare('SELECT name FROM documentation_items WHERE id = ?').get(item_id);
      const itemName = item ? item.name : 'Dokumen';

      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
      const title = 'Upload Dokumentasi';
      const message = `Teknisi ${technicianName} mengupload ${itemName} untuk lokasi ${locationName}.`;

      for (const admin of admins) {
        db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(admin.id, title, message);
      }
    } catch (notifError) {
      console.error('Failed to generate admin notifications:', notifError);
    }

    res.json({
      id: result.lastInsertRowid,
      file_name: req.file.filename,
      file_path: req.file.path,
      message: 'File berhasil diupload'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/upload/:id', (req, res) => {
  try {
    const upload = db.prepare('SELECT * FROM documentation_uploads WHERE id = ?').get(req.params.id);
    if (!upload) return res.status(404).json({ error: 'Upload tidak ditemukan' });

    const filePath = path.join(__dirname, '../uploads/docs', upload.file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM documentation_uploads WHERE id = ?').run(req.params.id);
    res.json({ message: 'File berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/docs', req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan' });
  res.download(filePath);
});

router.get('/all-uploads', (req, res) => {
  try {
    const { assignment_id, review_status } = req.query;
    let query = `
      SELECT du.*, di.name as item_name, di.description as item_description,
             u.name as user_name, a.visit_date, l.name as location_name, l.site_id
      FROM documentation_uploads du
      JOIN documentation_items di ON du.item_id = di.id
      JOIN users u ON du.user_id = u.id
      JOIN assignments a ON du.assignment_id = a.id
      JOIN locations l ON a.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    if (assignment_id) { query += ' AND du.assignment_id = ?'; params.push(assignment_id); }
    if (review_status) { query += ' AND du.review_status = ?'; params.push(review_status); }
    query += ' ORDER BY du.uploaded_at DESC';
    const uploads = db.prepare(query).all(...params);
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/review/:id', (req, res) => {
  try {
    const { review_status, review_note } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(review_status)) {
      return res.status(400).json({ error: 'Status review tidak valid' });
    }
    const upload = db.prepare('SELECT * FROM documentation_uploads WHERE id = ?').get(req.params.id);
    if (!upload) return res.status(404).json({ error: 'Upload tidak ditemukan' });

    const reviewedAt = review_status === 'pending' ? null : new Date().toISOString();
    db.prepare('UPDATE documentation_uploads SET review_status = ?, review_note = ?, reviewed_at = ? WHERE id = ?')
      .run(review_status, review_note || '', reviewedAt, req.params.id);

    const updated = db.prepare(`
      SELECT du.*, di.name as item_name, u.name as user_name
      FROM documentation_uploads du
      JOIN documentation_items di ON du.item_id = di.id
      JOIN users u ON du.user_id = u.id
      WHERE du.id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
