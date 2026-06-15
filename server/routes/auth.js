const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = 'absensi-secret-key-change-in-production';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, email, hashedPassword, 'technician');
    
    res.json({ id: result.lastInsertRowid, name, email, role: 'technician' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role FROM users').all();
  res.json(users);
});

router.put('/users/:id/role', (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'technician'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    
    // Create notification
    const roleLabel = role === 'admin' ? 'Admin' : 'Teknisi';
    createNotification(id, 'Role Berubah', `Role Anda telah diubah menjadi ${roleLabel} oleh admin.`);
    
    res.json({ id: user.id, name: user.name, email: user.email, role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, currentPassword, newPassword } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (currentPassword && newPassword) {
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Password saat ini salah' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?').run(name, email, hashedPassword, id);
    } else {
      db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
    }
    
    res.json({ id: user.id, name, email, role: user.role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Role request routes
router.post('/role-request', (req, res) => {
  try {
    const { user_id, requested_role } = req.body;
    
    const existing = db.prepare('SELECT * FROM role_requests WHERE user_id = ? AND status = ?').get(user_id, 'pending');
    if (existing) {
      return res.status(400).json({ error: 'Anda sudah memiliki request yang pending' });
    }
    
    const result = db.prepare('INSERT INTO role_requests (user_id, requested_role) VALUES (?, ?)').run(user_id, requested_role);
    res.json({ id: result.lastInsertRowid, message: 'Request berhasil dikirim' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/role-requests', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT r.*, u.name as user_name, u.email as user_email 
      FROM role_requests r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/role-requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const request = db.prepare('SELECT * FROM role_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Request tidak ditemukan' });
    }
    
    db.prepare('UPDATE role_requests SET status = ? WHERE id = ?').run(status, id);
    
    if (status === 'approved') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(request.requested_role, request.user_id);
      createNotification(request.user_id, 'Request Diterima', 'Selamat! Request role admin Anda telah diterima.');
    } else {
      createNotification(request.user_id, 'Request Ditolak', 'Maaf, request role admin Anda telah ditolak.');
    }
    
    res.json({ message: `Request ${status === 'approved' ? 'diterima' : 'ditolak'}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/role-request/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const request = db.prepare('SELECT * FROM role_requests WHERE user_id = ? AND status = ?').get(userId, 'pending');
    res.json(request || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notification routes
router.get('/notifications/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notifications/:userId/unread', (req, res) => {
  try {
    const { userId } = req.params;
    const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
    res.json({ count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/notifications/read-all/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function createNotification(userId, title, message) {
  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(userId, title, message);
}

module.exports = router;
module.exports.createNotification = createNotification;
