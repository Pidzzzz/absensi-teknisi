const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/sync', (req, res) => {
  try {
    const { records } = req.body;
    
    const insert = db.prepare('INSERT INTO attendance (user_id, type, timestamp, lat, lng, synced) VALUES (?, ?, ?, ?, ?, 1)');
    
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.user_id, item.type, item.timestamp, item.lat, item.lng);
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
    
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];
    
    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }
    
    if (date) {
      query += ' AND DATE(timestamp) = ?';
      params.push(date);
    }
    
    query += ' ORDER BY timestamp DESC';
    
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

module.exports = router;
