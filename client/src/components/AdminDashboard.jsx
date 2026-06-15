import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../utils/api'
import NotificationBell from './NotificationBell'

const menuItems = [
  { id: 'attendance', label: 'Absensi', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { id: 'technicians', label: 'Teknisi', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )},
  { id: 'reports', label: 'Laporan', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { id: 'profile', label: 'Profil', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )},
  { id: 'locations', label: 'Lokasi', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { id: 'settings', label: 'Pengaturan', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
]

export default function AdminDashboard() {
  const { user, logout, setUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [activeMenu, setActiveMenu] = useState('attendance')
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [roleRequests, setRoleRequests] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedUser, setSelectedUser] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  // Assignment state
  const [assignments, setAssignments] = useState([])
  const [assignUserId, setAssignUserId] = useState('')
  const [assignLocationId, setAssignLocationId] = useState('')
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0])
  const [assignNotes, setAssignNotes] = useState('')
  const [assignType, setAssignType] = useState('CORRECTIVE')
  const [assignMessage, setAssignMessage] = useState('')
  const [assignError, setAssignError] = useState('')
  const [locationTab, setLocationTab] = useState('data')
  
  // Documentation items state
  const [docItems, setDocItems] = useState([])
  const [docItemName, setDocItemName] = useState('')
  const [docItemDesc, setDocItemDesc] = useState('')
  const [docItemRequired, setDocItemRequired] = useState(true)
  const [docMessage, setDocMessage] = useState('')
  const [docError, setDocError] = useState('')

  useEffect(() => {
    loadUsers()
    loadRoleRequests()
    loadLocations()
    loadAssignments()
    loadDocItems()
    loadDocUploads()
  }, [])

  useEffect(() => {
    loadRecords()
  }, [selectedDate, selectedUser])

  useEffect(() => {
    if (user) {
      setProfileName(user.name)
      setProfileEmail(user.email)
    }
  }, [user])

  const loadUsers = async () => {
    try {
      const response = await api.get('/auth/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadRoleRequests = async () => {
    try {
      const response = await api.get('/auth/role-requests')
      setRoleRequests(response.data)
    } catch (error) {
      console.error('Failed to load role requests:', error)
    }
  }

  const loadLocations = async () => {
    try {
      const response = await api.get('/locations')
      setLocations(response.data)
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
  }

  const loadAssignments = async () => {
    try {
      const response = await api.get('/assignments')
      setAssignments(response.data)
    } catch (error) {
      console.error('Failed to load assignments:', error)
    }
  }

  const loadDocItems = async () => {
    try {
      const response = await api.get('/documentation/items')
      setDocItems(response.data)
    } catch (error) {
      console.error('Failed to load doc items:', error)
    }
  }

  const loadDocUploads = async () => {
    try {
      const response = await api.get('/documentation/all-uploads')
      setDocUploads(response.data)
    } catch (error) {
      console.error('Failed to load doc uploads:', error)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadMessage('')
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/locations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setUploadMessage(response.data.message)
      loadLocations()
      e.target.value = ''
    } catch (error) {
      setUploadError(error.response?.data?.error || 'Gagal upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteLocation = async (id) => {
    try {
      await api.delete(`/locations/${id}`)
      loadLocations()
    } catch (error) {
      console.error('Failed to delete location:', error)
    }
  }

  const handleDeleteAllLocations = async () => {
    if (!confirm('Hapus semua lokasi?')) return
    try {
      await api.delete('/locations')
      loadLocations()
    } catch (error) {
      console.error('Failed to delete all locations:', error)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setAssignMessage('')
    setAssignError('')

    if (!assignUserId || !assignLocationId || !assignDate) {
      setAssignError('Semua field wajib diisi')
      return
    }

    try {
      await api.post('/assignments', {
        user_id: parseInt(assignUserId),
        location_id: parseInt(assignLocationId),
        visit_date: assignDate,
        notes: assignNotes,
        type: assignType
      })
      setAssignMessage('Penugasan berhasil dibuat')
      loadAssignments()
      setAssignUserId('')
      setAssignLocationId('')
      setAssignNotes('')
      setAssignType('CORRECTIVE')
    } catch (error) {
      setAssignError(error.response?.data?.error || 'Gagal membuat penugasan')
    }
  }

  const handleDeleteAssignment = async (id) => {
    if (!confirm('Hapus penugasan ini?')) return
    try {
      await api.delete(`/assignments/${id}`)
      loadAssignments()
    } catch (error) {
      console.error('Failed to delete assignment:', error)
    }
  }

  const handleAddDocItem = async (e) => {
    e.preventDefault()
    setDocMessage('')
    setDocError('')

    if (!docItemName.trim()) {
      setDocError('Nama item wajib diisi')
      return
    }

    try {
      await api.post('/documentation/items', {
        name: docItemName,
        description: docItemDesc,
        is_required: docItemRequired ? 1 : 0
      })
      setDocMessage('Item dokumentasi berhasil ditambahkan')
      loadDocItems()
      setDocItemName('')
      setDocItemDesc('')
      setDocItemRequired(true)
    } catch (error) {
      setDocError(error.response?.data?.error || 'Gagal menambahkan item')
    }
  }

  const handleDeleteDocItem = async (id) => {
    if (!confirm('Hapus item dokumentasi ini?')) return
    try {
      await api.delete(`/documentation/items/${id}`)
      loadDocItems()
    } catch (error) {
      console.error('Failed to delete doc item:', error)
    }
  }

  const handleToggleDocItem = async (id, isRequired) => {
    try {
      await api.put(`/documentation/items/${id}/toggle`, { is_required: isRequired ? 1 : 0 })
      loadDocItems()
    } catch (error) {
      console.error('Failed to toggle doc item:', error)
    }
  }

  const handleDragStart = (idx) => setDraggedItem(idx)
  const handleDragEnter = (idx) => setDragOverItem(idx)
  const handleDragEnd = () => { setDraggedItem(null); setDragOverItem(null) }

  const handleDragDrop = async () => {
    if (draggedItem === null || dragOverItem === null) return
    const items = [...docItems]
    const dragged = items[draggedItem]
    items.splice(draggedItem, 1)
    items.splice(dragOverItem, 0, dragged)
    setDocItems(items)
    setDraggedItem(null)
    setDragOverItem(null)
    try {
      await api.put('/documentation/items/reorder', { orderedIds: items.map(i => i.id) })
    } catch (error) {
      loadDocItems()
    }
  }

  const [docUploading, setDocUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [docUploads, setDocUploads] = useState([])
  const [reviewTab, setReviewTab] = useState('pending')
  const [reviewNote, setReviewNote] = useState('')
  const [docListExpanded, setDocListExpanded] = useState(true)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)

  const handleDocFileUpload = async (file) => {
    if (!file) return
    setDocUploading(true)
    setDocMessage('')
    setDocError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/documentation/items/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setDocMessage(response.data.message)
      loadDocItems()
    } catch (error) {
      setDocError(error.response?.data?.error || 'Gagal import file')
    } finally {
      setDocUploading(false)
    }
  }

  const handleReview = async (uploadId, status) => {
    try {
      await api.put(`/documentation/review/${uploadId}`, {
        review_status: status,
        review_note: reviewNote
      })
      setReviewNote('')
      loadDocUploads()
    } catch (error) {
      console.error('Failed to review upload:', error)
    }
  }

  const handleRoleRequest = async (requestId, status) => {
    try {
      await api.put(`/auth/role-requests/${requestId}`, { status })
      loadRoleRequests()
      loadUsers()
    } catch (error) {
      console.error('Failed to handle role request:', error)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole, requester_id: user.id })
      loadUsers()
      
      if (userId === user.id) {
        const updatedUser = { ...user, role: newRole }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        
        if (newRole !== 'admin') {
          window.location.href = '/technician'
        }
      }
    } catch (error) {
      console.error('Failed to change role:', error)
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileMessage('')
    setProfileError('')

    try {
      const response = await api.put(`/auth/profile/${user.id}`, {
        name: profileName,
        email: profileEmail,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      })
      
      const updatedUser = { ...user, name: response.data.name, email: response.data.email }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      
      setProfileMessage('Profil berhasil diperbarui')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      setProfileError(error.response?.data?.error || 'Gagal memperbarui profil')
    }
  }

  const handleNotificationClick = (notification) => {
    if (notification.title === 'Request Pengecekan Penugasan' || notification.title === 'Upload Dokumentasi') {
      setActiveMenu('locations')
      setLocationTab('docs')
      setTimeout(() => {
        const reviewSection = document.getElementById('review-section')
        if (reviewSection) {
          reviewSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 300)
    }
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Filter</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tanggal</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Teknisi</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  >
                    <option value="">Semua Teknisi</option>
                    {users.filter(u => u.role === 'technician').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Riwayat Absensi</h2>
              </div>
              {records.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-400">Tidak ada data absensi</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Teknisi</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Type</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Waktu</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Lokasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                                <span className="text-secondary font-medium text-sm">
                                  {getUserName(record.user_id).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-gray-800 dark:text-white">{getUserName(record.user_id)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              record.type === 'check-in'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {record.type === 'check-in' 
                                ? (record.assignment_id ? 'Check In Visit' : 'Check In Masuk') 
                                : (record.assignment_id ? 'Check Out Visit' : 'Check Out Pulang')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                            {new Date(record.timestamp).toLocaleString('id-ID')}
                          </td>
                          <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-sm">
                            <div className="flex flex-col">
                              {record.location_name && (
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{record.location_name}</span>
                              )}
                              {record.lat && record.lng ? (
                                <span className="text-xs text-gray-400">
                                  {record.lat.toFixed(6)}, {record.lng.toFixed(6)}
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )

      case 'technicians':
        const pendingRequests = roleRequests.filter(r => r.status === 'pending')
        return (
          <div className="space-y-6">
            {/* Pending Role Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
                  <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">Request Role Pending</h2>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">{pendingRequests.length} request menunggu persetujuan</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Request Role</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Tanggal</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {pendingRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                                <span className="text-secondary font-semibold">
                                  {request.user_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-gray-800 dark:text-white">{request.user_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{request.user_email}</td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                              {request.requested_role === 'admin' ? 'Admin' : 'Teknisi'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-sm">
                            {new Date(request.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRoleRequest(request.id, 'approved')}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
                              >
                                Terima
                              </button>
                              <button
                                onClick={() => handleRoleRequest(request.id, 'rejected')}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
                              >
                                Tolak
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Users */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Daftar Pengguna</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Klik role untuk mengubah</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                              <span className="text-secondary font-semibold">
                                {u.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-800 dark:text-white">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{u.email}</td>
                        <td className="py-4 px-6">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/50 ${
                              u.role === 'admin'
                                ? 'bg-secondary/10 text-secondary'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <option value="technician">Teknisi</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'reports':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-secondary to-secondary-dark p-6 rounded-xl text-white">
                <p className="text-sm opacity-80">Total Teknisi</p>
                <p className="text-4xl font-bold mt-2">
                  {users.filter(u => u.role === 'technician').length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
                <p className="text-sm opacity-80">Check In Hari Ini</p>
                <p className="text-4xl font-bold mt-2">
                  {records.filter(r => r.type === 'check-in').length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white">
                <p className="text-sm opacity-80">Check Out Hari Ini</p>
                <p className="text-4xl font-bold mt-2">
                  {records.filter(r => r.type === 'check-out').length}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Ringkasan</h2>
              <p className="text-gray-500 dark:text-gray-400">Fitur laporan lengkap akan segera hadir.</p>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Edit Profil</h2>
            
            {profileMessage && (
              <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-lg mb-4">
                {profileMessage}
              </div>
            )}
            {profileError && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg mb-4">
                {profileError}
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{profileName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.role === 'admin' ? 'Administrator' : 'Teknisi'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Ubah Password (Opsional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Saat Ini</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      placeholder="Kosongkan jika tidak ingin ubah"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                      placeholder="Kosongkan jika tidak ingin ubah"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-secondary text-white px-6 py-2.5 rounded-lg hover:bg-secondary-dark transition-colors"
              >
                Simpan Perubahan
              </button>
            </form>
          </div>
        )

      case 'locations':
        return (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2 flex gap-2">
              <button
                onClick={() => setLocationTab('data')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  locationTab === 'data'
                    ? 'bg-secondary text-white shadow-lg shadow-secondary/30'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Data Lokasi
                </div>
              </button>
              <button
                onClick={() => setLocationTab('assignments')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  locationTab === 'assignments'
                    ? 'bg-secondary text-white shadow-lg shadow-secondary/30'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Penugasan
                  {assignments.filter(a => a.status === 'pending').length > 0 && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {assignments.filter(a => a.status === 'pending').length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setLocationTab('docs')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  locationTab === 'docs'
                    ? 'bg-secondary text-white shadow-lg shadow-secondary/30'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Dokumentasi
                  <span className="bg-secondary/20 text-secondary text-xs px-2 py-0.5 rounded-full">
                    {docItems.length}
                  </span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            {locationTab === 'data' && (
              <div className="space-y-6">
                {/* Upload Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Upload Data Lokasi</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Format: .docx, .xlsx, .csv dengan kolom Nama Lokasi, Provinsi, Site ID, Alamat
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-medium ${
                        uploading
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-secondary text-white hover:bg-secondary-dark'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {uploading ? 'Mengupload...' : 'Upload File'}
                        <input
                          type="file"
                          accept=".doc,.docx,.xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      {locations.length > 0 && (
                        <button
                          onClick={handleDeleteAllLocations}
                          className="px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>
                  </div>

                  {uploadMessage && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg mb-4 text-sm">
                      {uploadMessage}
                    </div>
                  )}
                  {uploadError && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
                      {uploadError}
                    </div>
                  )}
                </div>

                {/* Location Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">Daftar Lokasi</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{locations.length} lokasi terdaftar</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span> Site ID
                    </div>
                  </div>
                  {locations.length === 0 ? (
                    <div className="p-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-gray-400">Belum ada data lokasi</p>
                      <p className="text-sm text-gray-400 mt-1">Upload file untuk menambahkan</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">#</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Nama Lokasi</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Provinsi</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Site ID</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Alamat</th>
                            <th className="text-center py-3 px-5 font-medium text-gray-400 dark:text-gray-500 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {locations.map((loc, idx) => (
                            <tr key={loc.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="py-3 px-5 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                  </div>
                                  <span className="font-medium text-gray-800 dark:text-white">{loc.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-gray-600 dark:text-gray-300">{loc.province || '-'}</td>
                              <td className="py-3 px-5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary/10 text-secondary">
                                  {loc.site_id || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={loc.address}>{loc.address || '-'}</td>
                              <td className="py-3 px-5 text-center">
                                <button
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {locationTab === 'assignments' && (
              <div className="space-y-6">
                {/* Assign Form */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Buat Penugasan Baru</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tugaskan teknisi untuk mengunjungi lokasi</p>

                  {assignMessage && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg mb-4 text-sm">
                      {assignMessage}
                    </div>
                  )}
                  {assignError && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
                      {assignError}
                    </div>
                  )}

                  <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Teknisi</label>
                      <select
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                        required
                      >
                        <option value="">Pilih Teknisi</option>
                        {users.filter(u => u.role === 'technician').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lokasi</label>
                      <select
                        value={assignLocationId}
                        onChange={(e) => setAssignLocationId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                        required
                      >
                        <option value="">Pilih Lokasi</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name} ({loc.site_id || '-'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipe Penugasan</label>
                      <select
                        value={assignType}
                        onChange={(e) => setAssignType(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                        required
                      >
                        <option value="CORRECTIVE">CORRECTIVE (5 Foto)</option>
                        <option value="PREVENTIVE MAINTENANCE">PREVENTIVE MAINTENANCE (51 Foto)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tanggal</label>
                      <input
                        type="date"
                        value={assignDate}
                        onChange={(e) => setAssignDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Catatan</label>
                      <input
                        type="text"
                        value={assignNotes}
                        onChange={(e) => setAssignNotes(e.target.value)}
                        placeholder="Opsional"
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="w-full px-5 py-2.5 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors text-sm font-medium"
                      >
                        Tugaskan
                      </button>
                    </div>
                  </form>
                </div>

                {/* Assignment Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
<div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">Daftar Penugasan</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{assignments.length} penugasan terdaftar</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>Menunggu</span>
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Dikerjakan</span>
                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400"><span className="w-2 h-2 rounded-full bg-orange-500"></span>Pemeriksaan</span>
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500"></span>Selesai</span>
                    </div>
                  </div>
                  {assignments.length === 0 ? (
                    <div className="p-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-400">Belum ada penugasan</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">#</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Teknisi</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Lokasi</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Site ID</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Tipe</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Tanggal</th>
                            <th className="text-left py-3 px-5 font-medium text-gray-400 dark:text-gray-500">Status</th>
                            <th className="text-center py-3 px-5 font-medium text-gray-400 dark:text-gray-500 w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((a, idx) => (
                            <tr key={a.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="py-3 px-5 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-secondary font-medium text-xs">{a.user_name?.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <span className="font-medium text-gray-800 dark:text-white">{a.user_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-gray-800 dark:text-white">{a.location_name}</td>
                              <td className="py-3 px-5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary/10 text-secondary">
                                  {a.site_id || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                                  a.type === 'PREVENTIVE MAINTENANCE'
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                    : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  {a.type || 'CORRECTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-gray-500 dark:text-gray-400">{a.visit_date}</td>
                              <td className="py-3 px-5">
                                <select
                                  value={a.status}
                                  onChange={async (e) => {
                                    try {
                                      await api.put(`/assignments/${a.id}`, { status: e.target.value })
                                      loadAssignments()
                                    } catch (err) {
                                      console.error('Failed to change status:', err)
                                    }
                                  }}
                                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/55 bg-white dark:bg-gray-700 ${
                                    a.status === 'completed' ? 'bg-green-50 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800' :
                                    a.status === 'in_progress' ? 'bg-blue-50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                                    a.status === 'waiting_review' ? 'bg-orange-50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800' :
                                    a.status === 'cancelled' ? 'bg-red-50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' :
                                    'bg-yellow-50 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
                                  }`}
                                >
                                  <option value="pending">Menunggu</option>
                                  <option value="in_progress">Dikerjakan</option>
                                  <option value="waiting_review">Menunggu Pemeriksaan</option>
                                  <option value="completed">Selesai</option>
                                  <option value="cancelled">Dibatalkan</option>
                                </select>
                              </td>
                              <td className="py-3 px-5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {a.status === 'waiting_review' && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await api.put(`/assignments/${a.id}`, { status: 'completed' })
                                            loadAssignments()
                                          } catch (err) {
                                            console.error(err)
                                          }
                                        }}
                                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                        title="Setujui & Tandai Selesai"
                                      >
                                        Setujui
                                      </button>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await api.put(`/assignments/${a.id}`, { status: 'in_progress' })
                                            loadAssignments()
                                          } catch (err) {
                                            console.error(err)
                                          }
                                        }}
                                        className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                        title="Tolak & Kembalikan ke Dikerjakan"
                                      >
                                        Tolak
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteAssignment(a.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Hapus"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {locationTab === 'docs' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Item Dokumentasi</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Buat atau import checklist dokumentasi untuk teknisi</p>

                  {docMessage && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg mb-4 text-sm">
                      {docMessage}
                    </div>
                  )}
                  {docError && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
                      {docError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-5">
                      <h3 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Manual
                      </h3>
                      <form onSubmit={handleAddDocItem} className="space-y-3">
                        <input
                          type="text"
                          value={docItemName}
                          onChange={(e) => setDocItemName(e.target.value)}
                          placeholder="Nama item (wajib)"
                          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                          required
                        />
                        <input
                          type="text"
                          value={docItemDesc}
                          onChange={(e) => setDocItemDesc(e.target.value)}
                          placeholder="Deskripsi (opsional)"
                          className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                        />
                        <div className="flex items-center justify-between">
                          <select
                            value={docItemRequired ? '1' : '0'}
                            onChange={(e) => setDocItemRequired(e.target.value === '1')}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                          >
                            <option value="1">Wajib</option>
                            <option value="0">Opsional</option>
                          </select>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors text-sm font-medium"
                          >
                            Tambah
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-5">
                      <h3 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import dari File
                      </h3>
                      <label
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDragging(false)
                          const file = e.dataTransfer.files[0]
                          if (file) handleDocFileUpload(file)
                        }}
                        className={`flex flex-col items-center justify-center h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                          isDragging
                            ? 'border-secondary bg-secondary/5 scale-[1.02]'
                            : 'border-gray-300 dark:border-gray-500 hover:border-secondary hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        {docUploading ? (
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Mengimport...</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <svg className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Drag & drop file di sini</p>
                            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .docx, .doc</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept=".xlsx,.xls,.docx,.doc"
                          onChange={(e) => {
                            if (e.target.files[0]) handleDocFileUpload(e.target.files[0])
                            e.target.value = ''
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-400 mt-3">Format kolom: Nama Item | Deskripsi | Wajib (true/false)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setDocListExpanded(!docListExpanded)}
                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${docListExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Item Dokumentasi</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{docItems.length} item checklist</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500"></span>Wajib</span>
                      <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300"></span>Opsional</span>
                    </div>
                  </button>
                  {docListExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {docItems.length === 0 ? (
                        <div className="p-12 text-center">
                          <p className="text-gray-400">Belum ada item dokumentasi</p>
                          <p className="text-sm text-gray-400 mt-1">Tambah item atau import dari file</p>
                        </div>
                      ) : (
                        <div>
                          {docItems.map((item, idx) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => handleDragStart(idx)}
                              onDragEnter={() => handleDragEnter(idx)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleDragDrop}
                              className={`flex items-center justify-between px-5 py-3 transition-all cursor-grab active:cursor-grabbing ${
                                draggedItem === idx ? 'opacity-40 bg-secondary/5' :
                                dragOverItem === idx ? 'border-t-2 border-secondary' :
                                'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                              } ${idx < docItems.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center gap-0.5 cursor-grab text-gray-300 dark:text-gray-600">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-right">{idx + 1}</span>
                                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-white text-sm">{item.name}</p>
                                  {item.description && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <select
                                  value={item.is_required ? '1' : '0'}
                                  onChange={(e) => handleToggleDocItem(item.id, e.target.value === '1')}
                                  className={`px-2 py-1 rounded-md text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-secondary cursor-pointer ${
                                    item.is_required
                                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                  }`}
                                >
                                  <option value="1">Wajib</option>
                                  <option value="0">Opsional</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteDocItem(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 id="review-section" className="font-semibold text-gray-800 dark:text-white scroll-mt-6">Review Dokumentasi Teknisi</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Validasi foto/dokumen yang diupload teknisi</p>
                  </div>

                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-2">
                    {['pending', 'approved', 'rejected'].map(tab => {
                      const count = docUploads.filter(u => u.review_status === tab).length
                      return (
                        <button
                          key={tab}
                          onClick={() => setReviewTab(tab)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            reviewTab === tab
                              ? tab === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : tab === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {tab === 'pending' ? 'Menunggu' : tab === 'approved' ? 'Disetujui' : 'Ditolak'}
                          {count > 0 && <span className="ml-1.5 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
                        </button>
                      )
                    })}
                  </div>

                  {docUploads.filter(u => u.review_status === reviewTab).length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-gray-400">Tidak ada dokumen untuk ditinjau</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {docUploads.filter(u => u.review_status === reviewTab).map((upload) => (
                        <div key={upload.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                              {upload.file_type?.startsWith('image/') ? (
                                <img src={`/api/documentation/download/${upload.file_name}`} alt={upload.item_name} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(`/api/documentation/download/${upload.file_name}`, '_blank')} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800 dark:text-white">{upload.item_name}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">{upload.location_name} ({upload.site_id || '-'})</span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{upload.user_name} • {new Date(upload.uploaded_at).toLocaleString('id-ID')}</p>
                              <p className="text-xs text-gray-400 mt-1">{upload.file_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {upload.review_status === 'pending' && (
                                <>
                                  <input type="text" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Catatan (opsional)" className="w-48 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-secondary" />
                                  <div className="flex gap-2">
                                    <button onClick={() => handleReview(upload.id, 'approved')} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors flex items-center gap-1.5">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                      Setujui
                                    </button>
                                    <button onClick={() => handleReview(upload.id, 'rejected')} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors flex items-center gap-1.5">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                      Tolak
                                    </button>
                                  </div>
                                </>
                              )}
                              {upload.review_status === 'approved' && (
                                <span className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  Disetujui
                                </span>
                              )}
                              {upload.review_status === 'rejected' && (
                                <div className="text-right">
                                  <span className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Ditolak
                                  </span>
                                  {upload.review_note && <p className="text-xs text-red-500 mt-1">{upload.review_note}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case 'settings':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Pengaturan</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">Mode Gelap</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aktifkan tampilan gelap</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-secondary' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isDark ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Aplikasi</label>
                <input
                  type="text"
                  value="Absensi Teknisi"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Versi</label>
                <p className="text-gray-600 dark:text-gray-400">1.0.0</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      {/* Sidebar */}
      <div className="w-72 bg-primary dark:bg-gray-800 flex flex-col transition-colors">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800 dark:border-gray-700">
          <h1 className="text-xl font-bold text-white tracking-tight">Absensi Teknisi</h1>
          <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeMenu === item.id
                  ? 'bg-secondary text-white shadow-lg shadow-secondary/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white dark:hover:bg-gray-700/50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <NotificationBell onNotificationClick={handleNotificationClick} />
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary dark:text-white">
                {menuItems.find(m => m.id === activeMenu)?.label}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {activeMenu === 'attendance' && 'Kelola data absensi teknisi'}
                {activeMenu === 'technicians' && 'Daftar semua teknisi terdaftar'}
                {activeMenu === 'reports' && 'Statistik dan ringkasan data'}
                {activeMenu === 'locations' && 'Upload dan kelola data lokasi'}
                {activeMenu === 'profile' && 'Kelola informasi profil Anda'}
                {activeMenu === 'settings' && 'Konfigurasi aplikasi'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            >
              {isDark ? (
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
