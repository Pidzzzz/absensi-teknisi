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
