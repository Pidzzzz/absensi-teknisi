const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = 'absensi-secret-key-change-in-production';

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads/avatars');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `avatar-${req.params.id}-${Date.now()}${path.extname(file.originalname) || '.jpg'}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File harus berupa gambar'));
    }
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, username } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (name, email, password, role, username) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name, email, hashedPassword, 'technician', username || null);
    
    const user = db.prepare('SELECT id, name, email, role, username FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, identifier } = req.body;
    const loginId = identifier || email;
    
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(loginId, loginId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, username FROM users').all();
  res.json(users);
});

router.put('/users/:id/role', (req, res) => {
  try {
    const { id } = req.params;
    const { role, requester_id } = req.body;
    
    if (!['admin', 'technician'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }
    
    const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(requester_id);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang bisa mengubah role' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    
    const roleLabel = role === 'admin' ? 'Admin' : 'Teknisi';
    createNotification(id, 'Role Berubah', `Role Anda telah diubah menjadi ${roleLabel} oleh admin.`);
    
    res.json({ id: user.id, name: user.name, email: user.email, role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, requester_id } = req.body;

    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(requester_id);
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang bisa mengubah password pengguna' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);

    createNotification(id, 'Password Diubah', 'Password akun Anda telah diubah oleh admin.');

    res.json({ id: user.id, name: user.name });
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
    
    res.json({ id: user.id, name, email, role: user.role, avatar: user.avatar });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/avatar/:id', avatarUpload.single('avatar'), (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!req.file) return res.status(400).json({ error: 'File avatar wajib diupload' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarUrl, id);
    res.json({ avatar: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Forgot Password / Change Password Request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Password baru dan konfirmasi tidak cocok' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'Email tidak ditemukan' });
    }
    
    if (user.role === 'admin') {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
      createNotification(user.id, 'Password Diubah', 'Password Anda telah berhasil diubah.');
      return res.json({ message: 'Password berhasil diubah' });
    }
    
    const existing = db.prepare('SELECT * FROM password_change_requests WHERE user_id = ? AND status = ?').get(user.id, 'pending');
    if (existing) {
      return res.status(400).json({ error: 'Anda sudah memiliki request yang pending. Menunggu persetujuan admin.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('INSERT INTO password_change_requests (user_id, new_password) VALUES (?, ?)').run(user.id, hashedPassword);
    
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    for (const admin of admins) {
      createNotification(admin.id, 'Request Ubah Password', `Teknisi ${user.name} meminta ubah password. Menunggu persetujuan Anda.`);
    }
    
    res.json({ message: 'Request ubah password berhasil dikirim. Menunggu persetujuan admin.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending password change requests (Admin only)
router.get('/password-requests', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT pcr.*, u.name as user_name, u.email as user_email
      FROM password_change_requests pcr
      JOIN users u ON pcr.user_id = u.id
      ORDER BY pcr.created_at DESC
    `).all();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/Reject password change request (Admin only)
router.put('/password-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewed_by } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }
    
    const request = db.prepare('SELECT * FROM password_change_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Request tidak ditemukan' });
    }
    
    db.prepare("UPDATE password_change_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
      .run(status, reviewed_by, id);
    
    if (status === 'approved') {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(request.new_password, request.user_id);
      createNotification(request.user_id, 'Password Disetujui', 'Password Anda telah berhasil diubah oleh admin.');
    } else {
      createNotification(request.user_id, 'Password Ditolak', 'Request ubah password Anda ditolak oleh admin.');
    }
    
    res.json({ message: `Request ${status === 'approved' ? 'disetujui' : 'ditolak'}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function createNotification(userId, title, message) {
  db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)').run(userId, title, message);
}

module.exports = router;
module.exports.createNotification = createNotification;
