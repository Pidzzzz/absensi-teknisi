# Absensi Teknisi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a technician attendance website with location tracking and offline support using React + Node.js + SQLite.

**Architecture:** Frontend (React/Vite) stores attendance data in LocalStorage for offline use, with manual sync to backend (Express + SQLite). Admin can view all technician attendance; technicians can check-in/out with location.

**Tech Stack:** React, Vite, Express, SQLite (better-sqlite3), TailwindCSS

---

## File Structure

```
absensi-teknisi/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── TechnicianDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── SyncButton.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   ├── storage.js      # LocalStorage helpers
│   │   │   └── api.js          # API calls
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/
│   ├── db.js                   # SQLite setup
│   ├── routes/
│   │   ├── auth.js
│   │   └── attendance.js
│   ├── index.js
│   └── package.json
└── package.json                # Root package.json
```

---

### Task 1: Project Setup (Backend)

**Covers:** S1, S2

**Files:**
- Create: `server/package.json`
- Create: `server/db.js`
- Create: `server/index.js`
- Create: `server/routes/auth.js`
- Create: `server/routes/attendance.js`

- [ ] **Step 1: Initialize server package.json**

```bash
cd D:\absensi-teknisi\server
npm init -y
npm install express better-sqlite3 cors bcryptjs jsonwebtoken
```

- [ ] **Step 2: Create database setup (db.js)**

```javascript
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
`);

module.exports = db;
```

- [ ] **Step 3: Create auth routes (routes/auth.js)**

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = 'absensi-secret-key-change-in-production';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, email, hashedPassword, role || 'technician');
    
    res.json({ id: result.lastInsertRowid, name, email, role: role || 'technician' });
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

module.exports = router;
```

- [ ] **Step 4: Create attendance routes (routes/attendance.js)**

```javascript
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
```

- [ ] **Step 5: Create main server (index.js)**

```javascript
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 6: Test server starts**

```bash
cd D:\absensi-teknisi\server
node index.js
```

Expected: Server running on port 3001

- [ ] **Step 7: Commit**

```bash
cd D:\absensi-teknisi
git init
git add server/
git commit -m "feat: setup backend with Express + SQLite"
```

---

### Task 2: Project Setup (Frontend)

**Covers:** S1, S2

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/index.css`

- [ ] **Step 1: Create React app with Vite**

```bash
cd D:\absensi-teknisi
npm create vite@latest client -- --template react
cd client
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install axios react-router-dom
```

- [ ] **Step 2: Configure Tailwind (vite.config.js)**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 3: Update index.css with Tailwind**

```css
@import "tailwindcss";
```

- [ ] **Step 4: Update index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Absensi Teknisi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.jsx**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 6: Create App.jsx**

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './components/Login'
import TechnicianDashboard from './components/TechnicianDashboard'
import AdminDashboard from './components/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/technician" element={
              <ProtectedRoute role="technician">
                <TechnicianDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
```

- [ ] **Step 7: Commit**

```bash
cd D:\absensi-teknisi
git add client/
git commit -m "feat: setup React frontend with Vite + Tailwind"
```

---

### Task 3: Auth Context & Login

**Covers:** S3

**Files:**
- Create: `client/src/contexts/AuthContext.jsx`
- Create: `client/src/components/Login.jsx`
- Create: `client/src/components/ProtectedRoute.jsx`
- Create: `client/src/utils/api.js`

- [ ] **Step 1: Create API utility (utils/api.js)**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

- [ ] **Step 2: Create AuthContext (contexts/AuthContext.jsx)**

```javascript
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const register = async (name, email, password, role) => {
    const response = await api.post('/auth/register', { name, email, password, role })
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 3: Create ProtectedRoute (components/ProtectedRoute.jsx)**

```javascript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/technician'} />
  }

  return children
}
```

- [ ] **Step 4: Create Login component (components/Login.jsx)**

```javascript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('technician')
  
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      if (isRegister) {
        await register(name, email, password, role)
        const user = await login(email, password)
        navigate(user.role === 'admin' ? '/admin' : '/technician')
      } else {
        const user = await login(email, password)
        navigate(user.role === 'admin' ? '/admin' : '/technician')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isRegister ? 'Register' : 'Login'}
        </h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          
          {isRegister && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-gray-600">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-500 ml-1"
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd D:\absensi-teknisi
git add client/src/
git commit -m "feat: add auth context and login page"
```

---

### Task 4: LocalStorage Utils

**Covers:** S4

**Files:**
- Create: `client/src/utils/storage.js`

- [ ] **Step 1: Create storage utility (utils/storage.js)**

```javascript
const ATTENDANCE_KEY = 'attendance_records'

export function getAttendanceRecords() {
  const records = localStorage.getItem(ATTENDANCE_KEY)
  return records ? JSON.parse(records) : []
}

export function saveAttendanceRecord(record) {
  const records = getAttendanceRecords()
  const newRecord = {
    ...record,
    id: Date.now(),
    synced: false
  }
  records.push(newRecord)
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records))
  return newRecord
}

export function getUnsyncedRecords() {
  const records = getAttendanceRecords()
  return records.filter(r => !r.synced)
}

export function markRecordsSynced(ids) {
  const records = getAttendanceRecords()
  const updated = records.map(r => 
    ids.includes(r.id) ? { ...r, synced: true } : r
  )
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updated))
}

export function clearSyncedRecords() {
  const records = getAttendanceRecords()
  const unsynced = records.filter(r => !r.synced)
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(unsynced))
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\absensi-teknisi
git add client/src/utils/storage.js
git commit -m "feat: add LocalStorage utility for offline records"
```

---

### Task 5: Technician Dashboard

**Covers:** S5, S6

**Files:**
- Create: `client/src/components/TechnicianDashboard.jsx`
- Create: `client/src/components/SyncButton.jsx`

- [ ] **Step 1: Create SyncButton component (components/SyncButton.jsx)**

```javascript
import { useState } from 'react'
import api from '../utils/api'
import { getUnsyncedRecords, markRecordsSynced } from '../utils/storage'

export default function SyncButton({ onSyncComplete }) {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    setSyncing(true)
    setMessage('')
    
    try {
      const unsynced = getUnsyncedRecords()
      
      if (unsynced.length === 0) {
        setMessage('No records to sync')
        setSyncing(false)
        return
      }
      
      await api.post('/attendance/sync', { records: unsynced })
      markRecordsSynced(unsynced.map(r => r.id))
      
      setMessage(`Synced ${unsynced.length} records`)
      onSyncComplete?.()
    } catch (error) {
      setMessage('Sync failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Sync Data'}
      </button>
      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create TechnicianDashboard (components/TechnicianDashboard.jsx)**

```javascript
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { saveAttendanceRecord, getAttendanceRecords } from '../utils/storage'
import api from '../utils/api'
import SyncButton from './SyncButton'

export default function TechnicianDashboard() {
  const { user, logout } = useAuth()
  const [status, setStatus] = useState({ isCheckedIn: false })
  const [records, setRecords] = useState([])
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadStatus()
    loadRecords()
    getLocation()
  }, [])

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Location error:', error)
        }
      )
    }
  }

  const loadStatus = async () => {
    try {
      const response = await api.get(`/attendance/status?user_id=${user.id}`)
      setStatus(response.data)
    } catch (error) {
      // Fallback to local data
      const records = getAttendanceRecords()
      const userRecords = records.filter(r => r.user_id === user.id)
      const lastCheckIn = userRecords.find(r => r.type === 'check-in')
      const lastCheckOut = userRecords.find(r => r.type === 'check-out')
      
      setStatus({
        isCheckedIn: lastCheckIn && (!lastCheckOut || lastCheckOut.timestamp < lastCheckIn.timestamp)
      })
    }
  }

  const loadRecords = () => {
    const records = getAttendanceRecords()
    const userRecords = records.filter(r => r.user_id === user.id)
    setRecords(userRecords.slice(-10).reverse())
  }

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const record = {
        user_id: user.id,
        type: 'check-in',
        timestamp: new Date().toISOString(),
        lat: location?.lat,
        lng: location?.lng
      }
      
      saveAttendanceRecord(record)
      setStatus({ isCheckedIn: true })
      loadRecords()
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    try {
      const record = {
        user_id: user.id,
        type: 'check-out',
        timestamp: new Date().toISOString(),
        lat: location?.lat,
        lng: location?.lng
      }
      
      saveAttendanceRecord(record)
      setStatus({ isCheckedIn: false })
      loadRecords()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Technician Dashboard</h1>
          <div className="flex items-center gap-4">
            <SyncButton onSyncComplete={loadRecords} />
            <span className="text-gray-600">{user.name}</span>
            <button onClick={logout} className="text-red-500 hover:text-red-600">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Attendance Status</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full ${status.isCheckedIn ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-lg">
              {status.isCheckedIn ? 'Checked In' : 'Checked Out'}
            </span>
          </div>
          
          {location && (
            <p className="text-sm text-gray-500 mb-4">
              Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          )}
          
          <div className="flex gap-4">
            <button
              onClick={handleCheckIn}
              disabled={status.isCheckedIn || loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check In
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!status.isCheckedIn || loading}
              className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {records.length === 0 ? (
              <p className="text-gray-500">No records yet</p>
            ) : (
              records.map((record, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <span className={`font-medium ${record.type === 'check-in' ? 'text-green-600' : 'text-red-600'}`}>
                      {record.type === 'check-in' ? 'Check In' : 'Check Out'}
                    </span>
                    {record.lat && record.lng && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({record.lat.toFixed(4)}, {record.lng.toFixed(4)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {new Date(record.timestamp).toLocaleString()}
                    </span>
                    {!record.synced && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Not synced
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\absensi-teknisi
git add client/src/components/
git commit -m "feat: add technician dashboard with check-in/out"
```

---

### Task 6: Admin Dashboard

**Covers:** S7

**Files:**
- Create: `client/src/components/AdminDashboard.jsx`

- [ ] **Step 1: Create AdminDashboard (components/AdminDashboard.jsx)**

```javascript
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedUser, setSelectedUser] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    loadRecords()
  }, [selectedDate, selectedUser])

  const loadUsers = async () => {
    try {
      const response = await api.get('/auth/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadRecords = async () => {
    try {
      let url = `/attendance?date=${selectedDate}`
      if (selectedUser) {
        url += `&user_id=${selectedUser}`
      }
      const response = await api.get(url)
      setRecords(response.data)
    } catch (error) {
      console.error('Failed to load records:', error)
    }
  }

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId)
    return foundUser?.name || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.name}</span>
            <button onClick={logout} className="text-red-500 hover:text-red-600">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Technician</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">All Technicians</option>
                {users.filter(u => u.role === 'technician').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Attendance Records</h2>
          
          {records.length === 0 ? (
            <p className="text-gray-500">No records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Technician</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Time</th>
                    <th className="text-left py-3 px-4">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{getUserName(record.user_id)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          record.type === 'check-in' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {record.type === 'check-in' ? 'Check In' : 'Check Out'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {record.lat && record.lng 
                          ? `${record.lat.toFixed(6)}, ${record.lng.toFixed(6)}`
                          : 'No location'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\absensi-teknisi
git add client/src/components/AdminDashboard.jsx
git commit -m "feat: add admin dashboard with attendance view"
```

---

### Task 7: Integration & Testing

**Covers:** S8

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "absensi-teknisi",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && node index.js",
    "client": "cd client && npm run dev",
    "install:all": "cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Install concurrently**

```bash
cd D:\absensi-teknisi
npm install
```

- [ ] **Step 3: Test full application**

```bash
cd D:\absensi-teknisi
npm run dev
```

Expected: Both server (port 3001) and client (port 5173) running

- [ ] **Step 4: Create .gitignore**

```bash
cd D:\absensi-teknisi
echo node_modules/ > .gitignore
echo server/*.db >> .gitignore
```

- [ ] **Step 5: Final commit**

```bash
cd D:\absensi-teknisi
git add .
git commit -m "feat: complete absensi teknisi application"
```

---

## Summary

| Task | Description | Status |
|------|-------------|--------|
| 1 | Project Setup (Backend) | - [ ] |
| 2 | Project Setup (Frontend) | - [ ] |
| 3 | Auth Context & Login | - [ ] |
| 4 | LocalStorage Utils | - [ ] |
| 5 | Technician Dashboard | - [ ] |
| 6 | Admin Dashboard | - [ ] |
| 7 | Integration & Testing | - [ ] |

**Total Estimated Time:** 2-3 hours
