const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const db = require('../db');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(docx?|xlsx?|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Gunakan .doc, .docx, .xlsx, .xls, atau .csv'));
    }
  }
});

router.get('/', (req, res) => {
  try {
    const locations = db.prepare('SELECT * FROM locations ORDER BY created_at DESC').all();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
    if (!location) return res.status(404).json({ error: 'Lokasi tidak ditemukan' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Lokasi tidak ditemukan' });
    res.json({ message: 'Lokasi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  try {
    db.prepare('DELETE FROM locations').run();
    res.json({ message: 'Semua lokasi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function findColumnIndices(headers) {
  const map = { name: -1, province: -1, site_id: -1, address: -1 };
  
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    
    if (lower.includes('nama lokasi') || lower === 'nama' || lower === 'name' || lower === 'location' || lower.includes('location name') || lower === 'lokasi') {
      map.name = i;
    } else if (lower.includes('provinsi') || lower === 'province' || lower.includes('propinsi') || lower === 'region') {
      map.province = i;
    } else if (lower.includes('site id') || lower === 'siteid' || lower === 'site_id' || lower === 'id' || lower.includes('site') || lower === 'code') {
      map.site_id = i;
    } else if (lower.includes('alamat') || lower === 'address' || lower === 'addr' || lower.includes('detail')) {
      map.address = i;
    }
  });

  if (map.name === -1) map.name = 0;
  if (map.province === -1) map.province = 1;
  if (map.site_id === -1) map.site_id = 2;
  if (map.address === -1) map.address = 3;

  return map;
}

function mapRow(parts, colMap) {
  return {
    name: parts[colMap.name] || '',
    province: parts[colMap.province] || '',
    site_id: parts[colMap.site_id] || '',
    address: parts[colMap.address] || ''
  };
}

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split('\n').filter(l => l.trim());
  const locations = [];

  if (lines.length === 0) return locations;

  const headerParts = lines[0].split(/\t|;|\||,/).map(p => p.trim());
  const colMap = findColumnIndices(headerParts);

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\t|;|\||,/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 1 && parts[0]) {
      locations.push(mapRow(parts, colMap));
    }
  }
  return locations;
}

function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  
  if (data.length === 0) return [];

  const headers = Object.keys(data[0]);
  const map = { name: '', province: '', site_id: '', address: '' };

  headers.forEach(h => {
    const lower = h.toLowerCase().trim();
    if (lower.includes('nama lokasi') || lower === 'nama' || lower === 'name' || lower === 'location' || lower.includes('location name') || lower === 'lokasi') {
      map.name = h;
    } else if (lower.includes('provinsi') || lower === 'province' || lower.includes('propinsi') || lower === 'region') {
      map.province = h;
    } else if (lower.includes('site id') || lower === 'siteid' || lower === 'site_id' || lower === 'id' || lower.includes('site') || lower === 'code') {
      map.site_id = h;
    } else if (lower.includes('alamat') || lower === 'address' || lower === 'addr' || lower.includes('detail')) {
      map.address = h;
    }
  });

  if (!map.name) map.name = headers[0];
  if (!map.province) map.province = headers[1];
  if (!map.site_id) map.site_id = headers[2];
  if (!map.address) map.address = headers[3];

  return data.map(row => ({
    name: row[map.name] || '',
    province: row[map.province] || '',
    site_id: row[map.site_id] || '',
    address: row[map.address] || ''
  }));
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const locations = [];

  if (lines.length === 0) return locations;

  const headerParts = lines[0].split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
  const colMap = findColumnIndices(headerParts);

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length >= 1 && parts[0]) {
      locations.push(mapRow(parts, colMap));
    }
  }
  return locations;
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let locations = [];

    if (ext === '.docx' || ext === '.doc') {
      locations = await parseDocx(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      locations = parseExcel(filePath);
    } else if (ext === '.csv') {
      locations = parseCSV(filePath);
    }

    fs.unlinkSync(filePath);

    if (locations.length === 0) {
      return res.status(400).json({ error: 'Tidak ada data lokasi yang ditemukan dalam file' });
    }

    const insert = db.prepare('INSERT INTO locations (name, province, site_id, address) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.name, item.province, item.site_id, item.address);
      }
    });

    insertMany(locations);

    res.json({
      message: `${locations.length} lokasi berhasil diupload`,
      count: locations.length,
      locations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
