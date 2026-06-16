const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { user_id, date, status } = req.query;
    
    let query = `
      SELECT a.*, l.name as location_name, l.province, l.site_id, l.address, u.name as user_name
      FROM assignments a
      JOIN locations l ON a.location_id = l.id
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (user_id) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    }
    
    if (date) {
      query += ' AND a.visit_date = ?';
      params.push(date);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY a.visit_date DESC, a.created_at DESC';
    
    const assignments = db.prepare(query).all(...params);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const assignment = db.prepare(`
      SELECT a.*, l.name as location_name, l.province, l.site_id, l.address, u.name as user_name
      FROM assignments a
      JOIN locations l ON a.location_id = l.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);
    
    if (!assignment) return res.status(404).json({ error: 'Assignment tidak ditemukan' });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { user_id, location_id, visit_date, notes, type } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(location_id);
    if (!location) return res.status(404).json({ error: 'Lokasi tidak ditemukan' });
    
    const existing = db.prepare(
      'SELECT * FROM assignments WHERE user_id = ? AND location_id = ? AND visit_date = ?'
    ).get(user_id, location_id, visit_date);
    
    if (existing) {
      return res.status(400).json({ error: 'Sudah ada penugasan untuk lokasi ini di tanggal tersebut' });
    }
    
    const result = db.prepare(
      'INSERT INTO assignments (user_id, location_id, visit_date, notes, type) VALUES (?, ?, ?, ?, ?)'
    ).run(user_id, location_id, visit_date, notes || '', type || 'CORRECTIVE');
    
    const assignment = db.prepare(`
      SELECT a.*, l.name as location_name, l.province, l.site_id, l.address, u.name as user_name
      FROM assignments a
      JOIN locations l ON a.location_id = l.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);
    
    res.json(assignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment tidak ditemukan' });
    
    if (status) {
      db.prepare('UPDATE assignments SET status = ? WHERE id = ?').run(status, req.params.id);
      
      try {
        const info = db.prepare(`
          SELECT a.*, l.name as location_name, u.name as user_name, u.id as tech_user_id
          FROM assignments a
          JOIN locations l ON a.location_id = l.id
          JOIN users u ON a.user_id = u.id
          WHERE a.id = ?
        `).get(req.params.id);
        
        if (info) {
          const locationName = info.location_name || 'Lokasi';
          
          if (status === 'waiting_review') {
            const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
            const title = 'Request Pengecekan Penugasan';
            const message = `Teknisi ${info.user_name} menyelesaikan penugasan di ${locationName} dan meminta pengecekan segera.`;
            
            for (const admin of admins) {
              db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(admin.id, title, message);
            }
          } else if (status === 'completed') {
            const title = 'Penugasan Disetujui';
            const message = `Penugasan di ${locationName} telah disetujui dan ditandai selesai oleh admin.`;
            db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(info.tech_user_id, title, message);
          } else if (status === 'in_progress') {
            const title = 'Penugasan Dikembalikan';
            const message = `Penugasan di ${locationName} dikembalikan ke status "Dikerjakan" oleh admin. Silakan periksa catatan dan perbaiki.`;
            db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(info.tech_user_id, title, message);
          } else if (status === 'cancelled') {
            const title = 'Penugasan Dibatalkan';
            const message = `Penugasan di ${locationName} telah dibatalkan oleh admin.`;
            db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(info.tech_user_id, title, message);
          }
        }
      } catch (notifErr) {
        console.error('Failed to send notification on status change:', notifErr);
      }
    }
    if (notes !== undefined) {
      db.prepare('UPDATE assignments SET notes = ? WHERE id = ?').run(notes, req.params.id);
    }
    
    const updated = db.prepare(`
      SELECT a.*, l.name as location_name, l.province, l.site_id, l.address, u.name as user_name
      FROM assignments a
      JOIN locations l ON a.location_id = l.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(req.params.id);
    
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Assignment tidak ditemukan' });
    res.json({ message: 'Penugasan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk', (req, res) => {
  try {
    const { assignments } = req.body;
    
    const insert = db.prepare(
      'INSERT INTO assignments (user_id, location_id, visit_date, notes) VALUES (?, ?, ?, ?)'
    );
    
    const insertMany = db.transaction((items) => {
      const results = [];
      for (const item of items) {
        const existing = db.prepare(
          'SELECT * FROM assignments WHERE user_id = ? AND location_id = ? AND visit_date = ?'
        ).get(item.user_id, item.location_id, item.visit_date);
        
        if (!existing) {
          const result = insert.run(item.user_id, item.location_id, item.visit_date, item.notes || '');
          results.push(result.lastInsertRowid);
        }
      }
      return results;
    });
    
    const ids = insertMany(assignments);
    res.json({ message: `${ids.length} penugasan berhasil dibuat`, count: ids.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/request-check', (req, res) => {
  try {
    const { id } = req.params;
    const assignment = db.prepare(`
      SELECT a.*, l.name as location_name, u.name as user_name
      FROM assignments a
      JOIN locations l ON a.location_id = l.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment tidak ditemukan' });
    }

    const technicianName = assignment.user_name || 'Teknisi';
    const locationName = assignment.location_name || 'Lokasi';

    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    const title = 'Request Pengecekan Penugasan';
    const message = `Teknisi ${technicianName} meminta pengecekan segera untuk penugasan di ${locationName} yang sudah selesai.`;

    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(admin.id, title, message);
    }

    res.json({ message: 'Request pengecekan berhasil dikirim ke admin' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
