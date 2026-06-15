import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

const menuItems = [
  { id: 'attendance', label: 'Absensi', icon: '📋' },
  { id: 'technicians', label: 'Teknisi', icon: '👷' },
  { id: 'reports', label: 'Laporan', icon: '📊' },
  { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
]

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const [activeMenu, setActiveMenu] = useState('attendance')
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

  const renderContent = () => {
    switch (activeMenu) {
      case 'attendance':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Filter Absensi</h2>
            <div className="flex gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Teknisi</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Semua Teknisi</option>
                  {users.filter(u => u.role === 'technician').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4">Riwayat Absensi</h2>
            {records.length === 0 ? (
              <p className="text-gray-500">Tidak ada data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4">Teknisi</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Waktu</th>
                      <th className="text-left py-3 px-4">Lokasi</th>
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
                            : 'Tidak ada lokasi'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )

      case 'technicians':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Daftar Teknisi</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Nama</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{u.name}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Teknisi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'reports':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Laporan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Teknisi</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.role === 'technician').length}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Check In Hari Ini</p>
                <p className="text-2xl font-bold text-green-600">
                  {records.filter(r => r.type === 'check-in').length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Check Out Hari Ini</p>
                <p className="text-2xl font-bold text-red-600">
                  {records.filter(r => r.type === 'check-out').length}
                </p>
              </div>
            </div>
            <p className="text-gray-500">Fitur laporan lengkap akan segera hadir.</p>
          </div>
        )

      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Pengaturan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Aplikasi</label>
                <input
                  type="text"
                  value="Absensi Teknisi"
                  className="px-3 py-2 border rounded-lg w-full"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Versi</label>
                <p className="text-sm text-gray-500">1.0.0</p>
              </div>
              <p className="text-gray-500">Pengaturan lanjutan akan segera hadir.</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-primary text-white min-h-screen p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold">Absensi Teknisi</h1>
          <p className="text-sm text-gray-400">Admin Panel</p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                activeMenu === item.id
                  ? 'bg-secondary text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="border-t border-gray-700 pt-4">
            <p className="text-sm text-gray-400">{user.name}</p>
            <button
              onClick={logout}
              className="mt-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl">
          <h2 className="text-2xl font-bold text-primary mb-6">
            {menuItems.find(m => m.id === activeMenu)?.label}
          </h2>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
