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
