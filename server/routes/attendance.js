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

module.exports = router;
