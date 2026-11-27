const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/conversations/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'admin') {
      const conversations = db.prepare(`
        SELECT c.*, u.id as technician_id, u.name as technician_name, u.email as technician_email,
          (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message,
          (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_sender_id,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) as unread_count
        FROM conversations c
        JOIN users u ON c.technician_id = u.id
        WHERE c.admin_id = ?
        ORDER BY c.last_message_at DESC
      `).all(userId, userId);
      return res.json(conversations);
    }

    const conversations = db.prepare(`
      SELECT c.*, u.id as admin_id, u.name as admin_name, u.email as admin_email
      FROM conversations c
      JOIN users u ON c.admin_id = u.id
      WHERE c.technician_id = ?
      ORDER BY c.last_message_at DESC
    `).all(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `).all(conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send', (req, res) => {
  try {
    const { sender_id, receiver_id, content } = req.body;

    if (!sender_id || !receiver_id || !content?.trim()) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    const sender = db.prepare('SELECT role FROM users WHERE id = ?').get(sender_id);
    const receiver = db.prepare('SELECT role FROM users WHERE id = ?').get(receiver_id);
    if (!sender || !receiver) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    let adminId, technicianId;
    if (sender.role === 'admin') {
      adminId = sender_id;
      technicianId = receiver_id;
    } else {
      adminId = receiver_id;
      technicianId = sender_id;
    }

    let conversation = db.prepare(
      'SELECT id FROM conversations WHERE admin_id = ? AND technician_id = ?'
    ).get(adminId, technicianId);

    if (!conversation) {
      const result = db.prepare(
        'INSERT INTO conversations (admin_id, technician_id) VALUES (?, ?)'
      ).run(adminId, technicianId);
      conversation = { id: result.lastInsertRowid };
    }

    db.prepare('UPDATE conversations SET last_message_at = datetime(\'now\') WHERE id = ?')
      .run(conversation.id);

    const msgResult = db.prepare(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
    ).run(conversation.id, sender_id, content.trim());

    const message = db.prepare(`
      SELECT m.*, u.name as sender_name, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(msgResult.lastInsertRowid);

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/read/:conversationId/:userId', (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    db.prepare(
      'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0'
    ).run(conversationId, userId);
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/unread/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let result;
    if (user.role === 'admin') {
      result = db.prepare(`
        SELECT COUNT(*) as count FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN users sender ON m.sender_id = sender.id
        WHERE c.admin_id = ? AND m.sender_id != ? AND m.is_read = 0 AND sender.role = 'technician'
      `).get(userId, userId);
    } else {
      result = db.prepare(`
        SELECT COUNT(*) as count FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.technician_id = ? AND m.sender_id != ? AND m.is_read = 0
      `).get(userId, userId);
    }
    res.json({ count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/unread-conversation/:conversationId/:userId', (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = 0'
    ).get(conversationId, userId);
    res.json({ count: result.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
