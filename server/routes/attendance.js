const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/sync', (req, res) => {
  try {
    const { records } = req.body;
    
    const insert = db.prepare('INSERT INTO attendance (user_id, type, timestamp, lat, lng, synced, assignment_id, location_id) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
    
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(
          item.user_id,
          item.type,
          item.timestamp,
          item.lat,
          item.lng,
          item.assignment_id !== undefined ? item.assignment_id : null,
          item.location_id !== undefined ? item.location_id : null
        );
      }
    });
    
    insertMany(records);
    res.json({ message: 'Sync successful', count: records.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  try {
    const { user_id, date } = req.query;
    
    let query = `
      SELECT a.*, l.name AS location_name 
      FROM attendance a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE 1=1
    `;
    const params = [];
    
    if (user_id) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    }
    
    if (date) {
      query += ' AND DATE(a.timestamp) = ?';
      params.push(date);
    }
    
    query += ' ORDER BY a.timestamp DESC';
    
    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', (req, res) => {
  try {
    const { user_id } = req.query;
    
    const lastCheckIn = db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? AND type = 'check-in' 
      ORDER BY timestamp DESC LIMIT 1
    `).get(user_id);
    
    const lastCheckOut = db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? AND type = 'check-out' 
      ORDER BY timestamp DESC LIMIT 1
    `).get(user_id);
    
    const isCheckedIn = lastCheckIn && (!lastCheckOut || lastCheckOut.timestamp < lastCheckIn.timestamp);
    
    res.json({ 
      isCheckedIn, 
      lastCheckIn, 
      lastCheckOut 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check and mark missing check-outs as "tidak masuk"
router.post('/check-missing-checkout', (req, res) => {
  try {
    const { date } = req.body;
    const checkDate = date || new Date().toISOString().split('T')[0];
    
    // Find all technicians
    const technicians = db.prepare("SELECT id, name FROM users WHERE role = 'technician'").all();
    
    const results = [];
    
    for (const tech of technicians) {
      // Check if technician has check-in on this date
      const checkIn = db.prepare(`
        SELECT * FROM attendance 
        WHERE user_id = ? AND type = 'check-in' AND DATE(timestamp) = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(tech.id, checkDate);
      
      // Check if technician has check-out on this date
      const checkOut = db.prepare(`
        SELECT * FROM attendance 
        WHERE user_id = ? AND type = 'check-out' AND DATE(timestamp) = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(tech.id, checkDate);
      
      // Mark as "tidak masuk" if:
      // 1. Has check-in but no check-out (forgot to checkout)
      // 2. Has check-out but no check-in (incomplete data)
      if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
        const targetId = checkIn ? checkIn.id : checkOut.id;
        db.prepare(`
          UPDATE attendance SET status = 'tidak masuk' 
          WHERE id = ? AND status = 'hadir'
        `).run(targetId);
        
        results.push({ 
          user_id: tech.id, 
          name: tech.name, 
          status: 'tidak masuk',
          message: checkIn 
            ? `${tech.name} tidak checkout pada ${checkDate}`
            : `${tech.name} tidak checkin pada ${checkDate}`
        });
      }
    }
    
    res.json({ 
      message: `Diperiksa ${technicians.length} teknisi, ${results.length} ditemukan bermasalah`,
      marked: results 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily attendance summary
router.get('/daily-summary', (req, res) => {
  try {
    const { date } = req.query;
    const summaryDate = date || new Date().toISOString().split('T')[0];
    
    const technicians = db.prepare("SELECT id, name FROM users WHERE role = 'technician'").all();
    
    const summary = technicians.map(tech => {
      const checkIn = db.prepare(`
        SELECT * FROM attendance 
        WHERE user_id = ? AND type = 'check-in' AND DATE(timestamp) = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(tech.id, summaryDate);
      
      const checkOut = db.prepare(`
        SELECT * FROM attendance 
        WHERE user_id = ? AND type = 'check-out' AND DATE(timestamp) = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(tech.id, summaryDate);
      
      let status = 'tidak ada data';
      if (checkIn && checkOut) {
        // Check if marked as "tidak masuk" by admin
        status = (checkIn.status === 'tidak masuk' || checkOut.status === 'tidak masuk') 
          ? 'tidak masuk' 
          : 'hadir';
      } else if (checkIn && !checkOut) {
        status = checkIn.status === 'tidak masuk' ? 'tidak masuk' : 'belum checkout';
      } else if (!checkIn && checkOut) {
        status = checkOut.status === 'tidak masuk' ? 'tidak masuk' : 'belum checkout';
      }
      
      return {
        user_id: tech.id,
        name: tech.name,
        check_in: checkIn ? checkIn.timestamp : null,
        check_out: checkOut ? checkOut.timestamp : null,
        status
      };
    });
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ WARNING & EXCUSE ENDPOINTS ============

// Admin: Send warning/request explanation to technician
router.post('/warnings', (req, res) => {
  try {
    const { user_id, attendance_date, warning_type, message, admin_id } = req.body;
    
    if (!user_id || !attendance_date || !warning_type || !message || !admin_id) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    
    if (!['request_explanation', 'reprimand'].includes(warning_type)) {
      return res.status(400).json({ error: 'Tipe warning tidak valid' });
    }
    
    const result = db.prepare(`
      INSERT INTO absence_warnings (user_id, attendance_date, warning_type, message, admin_id) 
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, attendance_date, warning_type, message, admin_id);
    
    // Send notification to technician
    const admin = db.prepare('SELECT name FROM users WHERE id = ?').get(admin_id);
    const adminName = admin ? admin.name : 'Admin';
    
    const notifTitle = warning_type === 'reprimand' ? '⚠️ Teguran dari Admin' : '📋 Permintaan Keterangan';
    const notifMessage = warning_type === 'reprimand' 
      ? `${adminName} memberikan teguran untuk absensi tanggal ${attendance_date}: ${message}`
      : `${adminName} meminta keterangan untuk absensi tanggal ${attendance_date}. Silakan berikan alasan.`;
    
    db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)')
      .run(user_id, notifTitle, notifMessage);
    
    res.json({ id: result.lastInsertRowid, message: 'Warning berhasil dikirim' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get warnings for a user on specific date
router.get('/warnings/:userId/:date', (req, res) => {
  try {
    const { userId, date } = req.params;
    const warnings = db.prepare(`
      SELECT aw.*, u.name as admin_name 
      FROM absence_warnings aw 
      JOIN users u ON aw.admin_id = u.id 
      WHERE aw.user_id = ? AND aw.attendance_date = ?
      ORDER BY aw.created_at DESC
    `).all(userId, date);
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Technician: Submit excuse/reason
router.post('/excuses', (req, res) => {
  try {
    const { user_id, attendance_date, reason, description } = req.body;
    
    if (!user_id || !attendance_date || !reason || !description) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    
    if (!['sakit', 'acara_keluarga', 'kendala_lapangan', 'lainnya'].includes(reason)) {
      return res.status(400).json({ error: 'Alasan tidak valid' });
    }
    
    // Check if excuse already exists for this date
    const existing = db.prepare('SELECT * FROM absence_excuses WHERE user_id = ? AND attendance_date = ?').get(user_id, attendance_date);
    if (existing) {
      // Update existing
      db.prepare('UPDATE absence_excuses SET reason = ?, description = ?, status = ? WHERE id = ?')
        .run(reason, description, 'pending', existing.id);
    } else {
      db.prepare('INSERT INTO absence_excuses (user_id, attendance_date, reason, description) VALUES (?, ?, ?, ?)')
        .run(user_id, attendance_date, reason, description);
    }
    
    // Notify admins
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(user_id);
    const userName = user ? user.name : 'Teknisi';
    const reasonLabels = { sakit: 'Sakit', acara_keluarga: 'Acara Keluarga', kendala_lapangan: 'Kendala Lapangan', lainnya: 'Lainnya' };
    
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)')
        .run(admin.id, '📝 Alasan Ketidakhadiran', `${userName} mengajukan alasan "${reasonLabels[reason]}" untuk tanggal ${attendance_date}. Menunggu persetujuan.`);
    }
    
    res.json({ message: 'Alasan berhasil diajukan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get excuses list (Admin)
router.get('/excuses', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ae.*, u.name as user_name, u.email as user_email,
             au.name as reviewed_by_name
      FROM absence_excuses ae
      JOIN users u ON ae.user_id = u.id
      LEFT JOIN users au ON ae.reviewed_by = au.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND ae.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ae.created_at DESC';
    
    const excuses = db.prepare(query).all(...params);
    res.json(excuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get excuses for technician
router.get('/excuses/user/:userId', (req, res) => {
  try {
    const excuses = db.prepare(`
      SELECT * FROM absence_excuses WHERE user_id = ? ORDER BY attendance_date DESC
    `).all(req.params.userId);
    res.json(excuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Review excuse
router.put('/excuses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewed_by } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }
    
    const excuse = db.prepare('SELECT * FROM absence_excuses WHERE id = ?').get(id);
    if (!excuse) {
      return res.status(404).json({ error: 'Alasan tidak ditemukan' });
    }
    
    db.prepare("UPDATE absence_excuses SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
      .run(status, reviewed_by, id);
    
    // Update attendance status if approved
    if (status === 'approved') {
      db.prepare("UPDATE attendance SET status = 'diberi keterangan' WHERE user_id = ? AND DATE(timestamp) = ?")
        .run(excuse.user_id, excuse.attendance_date);
      
      // Notify technician
      const reasonLabels = { sakit: 'Sakit', acara_keluarga: 'Acara Keluarga', kendala_lapangan: 'Kendala Lapangan', lainnya: 'Lainnya' };
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)')
        .run(excuse.user_id, '✅ Alasan Diterima', `Alasan "${reasonLabels[excuse.reason]}" Anda untuk tanggal ${excuse.attendance_date} telah diterima admin.`);
    } else {
      db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)')
        .run(excuse.user_id, '❌ Alasan Ditolak', `Alasan Anda untuk tanggal ${excuse.attendance_date} ditolak admin. Silakan hubungi admin.`);
    }
    
    res.json({ message: `Alasan ${status === 'approved' ? 'diterima' : 'ditolak'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
