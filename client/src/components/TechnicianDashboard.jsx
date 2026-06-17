import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { saveAttendanceRecord, getAttendanceRecords } from '../utils/storage'
import api from '../utils/api'
import SyncButton from './SyncButton'
import NotificationBell from './NotificationBell'
import { useOffline } from '../hooks/useOffline'

export default function TechnicianDashboard() {
  const { user, logout, setUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { isOffline } = useOffline()
  const toast = useToast()
  const [status, setStatus] = useState({ isCheckedIn: false })
  const [records, setRecords] = useState([])
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')

  // Role request state
  const [roleRequest, setRoleRequest] = useState(null)
  const [roleRequestMessage, setRoleRequestMessage] = useState('')
  
  // Excuse state
  const [excuseModalOpen, setExcuseModalOpen] = useState(false)
  const [excuseReason, setExcuseReason] = useState('')
  const [excuseDescription, setExcuseDescription] = useState('')
  const [myExcuses, setMyExcuses] = useState([])
  const [warnings, setWarnings] = useState([])

  // Assignment state
  const [assignments, setAssignments] = useState([])
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [docChecklist, setDocChecklist] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docMessage, setDocMessage] = useState('')
  const [completedItems, setCompletedItems] = useState([])
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewFontScale, setReviewFontScale] = useState(1.0)
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [requestedChecks, setRequestedChecks] = useState(() => JSON.parse(localStorage.getItem('requested_checks') || '[]'))

  const handleRequestCheck = async (assignmentId) => {
    setLoading(true)
    setAssignmentMessage('')
    try {
      await api.post(`/assignments/${assignmentId}/request-check`)
      const newRequested = [...requestedChecks, assignmentId]
      setRequestedChecks(newRequested)
      localStorage.setItem('requested_checks', JSON.stringify(newRequested))
      setAssignmentMessage('Permintaan pengecekan berhasil dikirim ke admin!')
      setTimeout(() => setAssignmentMessage(''), 4000)
    } catch (error) {
      console.error('Failed to request check:', error)
      setAssignmentMessage(error.response?.data?.error || 'Gagal mengirim permintaan pengecekan')
      setTimeout(() => setAssignmentMessage(''), 4000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    loadRecords()
    getLocation()
    loadRoleRequest()
    loadAssignments()
    loadWarnings()
    loadMyExcuses()
  }, [isOffline])

  useEffect(() => {
    if (user) {
      setProfileName(user.name)
      setProfileEmail(user.email)
    }
  }, [user])

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
    if (isOffline) {
      const records = getAttendanceRecords()
      const userRecords = records.filter(r => r.user_id === user.id)
      const lastCheckIn = userRecords.find(r => r.type === 'check-in')
      const lastCheckOut = userRecords.find(r => r.type === 'check-out')
      setStatus({
        isCheckedIn: lastCheckIn && (!lastCheckOut || lastCheckOut.timestamp < lastCheckIn.timestamp)
      })
      return
    }

    try {
      const response = await api.get(`/attendance/status?user_id=${user.id}`)
      setStatus(response.data)
    } catch {
      const records = getAttendanceRecords()
      const userRecords = records.filter(r => r.user_id === user.id)
      const lastCheckIn = userRecords.find(r => r.type === 'check-in')
      const lastCheckOut = userRecords.find(r => r.type === 'check-out')
      setStatus({
        isCheckedIn: lastCheckIn && (!lastCheckOut || lastCheckOut.timestamp < lastCheckIn.timestamp)
      })
    }
  }

  const loadRecords = async () => {
    const localRecords = getAttendanceRecords()
    const userLocalRecords = localRecords.filter(r => r.user_id === user.id)
    
    if (!isOffline) {
      try {
        const response = await api.get(`/attendance?user_id=${user.id}`)
        const serverRecords = response.data.map(r => ({ ...r, synced: true, source: 'server' }))
        const merged = [...userLocalRecords.filter(r => r.synced), ...serverRecords]
        const unique = merged.filter((r, i, self) => 
          self.findIndex(s => s.id === r.id) === i
        )
        setRecords(unique.slice(-10).reverse())
        return
      } catch {
        // Fallback to local records
      }
    }
    
    setRecords(userLocalRecords.slice(-10).reverse())
  }

  const loadRoleRequest = async () => {
    try {
      const response = await api.get(`/auth/role-request/${user.id}`)
      setRoleRequest(response.data)
    } catch (error) {
      console.error('Failed to load role request:', error)
    }
  }

  const loadAssignments = async () => {
    if (isOffline) {
      setAssignmentMessage('Penugasan tidak tersedia saat offline')
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await api.get(`/assignments?user_id=${user.id}&date=${today}`)
      setAssignments(response.data)
      setAssignmentMessage('')
    } catch {
      setAssignmentMessage('Gagal memuat penugasan dari server')
    }
  }

  const handleRequestDaily = async () => {
    setLoading(true)
    setAssignmentMessage('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await api.post('/assignments/request-daily', {
        user_id: user.id,
        date: today
      })
      setAssignmentMessage(response.data.message)
      loadAssignments()
      setTimeout(() => setAssignmentMessage(''), 4000)
    } catch (error) {
      setAssignmentMessage(error.response?.data?.error || 'Gagal request tugas harian')
      setTimeout(() => setAssignmentMessage(''), 4000)
    } finally {
      setLoading(false)
    }
  }

  const loadWarnings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await api.get(`/attendance/warnings/${user.id}/${today}`)
      setWarnings(response.data)
    } catch (error) {
      console.error('Failed to load warnings:', error)
    }
  }

  const loadMyExcuses = async () => {
    try {
      const response = await api.get(`/attendance/excuses/user/${user.id}`)
      setMyExcuses(response.data)
    } catch (error) {
      console.error('Failed to load excuses:', error)
    }
  }

  const submitExcuse = async () => {
    if (!excuseReason || !excuseDescription.trim()) {
      toast.warning('Alasan dan keterangan wajib diisi')
      return
    }
    try {
      const today = new Date().toISOString().split('T')[0]
      await api.post('/attendance/excuses', {
        user_id: user.id,
        attendance_date: today,
        reason: excuseReason,
        description: excuseDescription
      })
      setExcuseModalOpen(false)
      setExcuseReason('')
      setExcuseDescription('')
      loadMyExcuses()
      toast.success('Alasan berhasil diajukan')
    } catch (error) {
      console.error('Failed to submit excuse:', error)
    }
  }

  const loadDocChecklist = async (assignmentId) => {
    try {
      const response = await api.get(`/documentation/checklist/${assignmentId}`)
      setDocChecklist(response.data)
    } catch (error) {
      console.error('Failed to load doc checklist:', error)
    }
  }

  const handleSelectAssignment = async (assignment) => {
    setSelectedAssignment(assignment)
    await loadDocChecklist(assignment.id)
  }

  const handleDocUpload = async (itemId, file) => {
    if (!file || !selectedAssignment) return

    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assignment_id', selectedAssignment.id)
      formData.append('item_id', itemId)
      formData.append('user_id', user.id)

      await api.post('/documentation/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      await loadDocChecklist(selectedAssignment.id)
    } catch (error) {
      console.error('Failed to upload doc:', error)
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocUpload = async (uploadId) => {
    try {
      await api.delete(`/documentation/upload/${uploadId}`)
      if (selectedAssignment) {
        await loadDocChecklist(selectedAssignment.id)
      }
    } catch (error) {
      console.error('Failed to delete doc upload:', error)
    }
  }

  const handleSaveDraft = () => {
    const completed = docChecklist.filter(item => item.uploaded).map(item => item.id)
    setCompletedItems(completed)
    localStorage.setItem(`draft_${selectedAssignment?.id}`, JSON.stringify(completed))
    setDocMessage('Draft tersimpan')
    setTimeout(() => setDocMessage(''), 3000)
  }

  const handleSubmitDone = () => {
    const isPM = selectedAssignment?.type === 'PREVENTIVE MAINTENANCE'
    const requiredCount = isPM ? 51 : 5
    const uploadedCount = docChecklist.filter(item => item.uploaded).length
    if (uploadedCount < requiredCount) {
      setDocMessage(`Minimal harus mengupload ${requiredCount} foto/dokumen untuk menyelesaikan dokumentasi!`)
      setTimeout(() => setDocMessage(''), 4000)
      return
    }
    if (isPM) {
      const requiredItems = docChecklist.filter(item => item.is_required === 1)
      const uploadedRequired = requiredItems.filter(item => item.uploaded)
      if (requiredItems.length !== uploadedRequired.length) {
        setDocMessage('Masih ada item wajib yang belum diupload!')
        setTimeout(() => setDocMessage(''), 4000)
        return
      }
    }
    setIsReviewOpen(true)
  }

  const handleReviewCheckout = async () => {
    if (!selectedAssignment) return
    localStorage.removeItem(`draft_${selectedAssignment.id}`)
    await handleCheckOutAtLocation(selectedAssignment.id)
    setIsReviewOpen(false)
    setSelectedAssignment(null)
  }

  useEffect(() => {
    if (selectedAssignment) {
      const saved = localStorage.getItem(`draft_${selectedAssignment.id}`)
      if (saved) setCompletedItems(JSON.parse(saved))
    }
  }, [selectedAssignment])

  const handleCheckInAtLocation = async (assignmentId, locationId) => {
    setLoading(true)
    try {
      const assignment = assignments.find(a => a.id === assignmentId)
      const record = {
        user_id: user.id,
        type: 'check-in',
        timestamp: new Date().toISOString(),
        lat: location?.lat,
        lng: location?.lng,
        assignment_id: assignmentId,
        location_id: locationId,
        location_name: assignment ? assignment.location_name : null
      }
      saveAttendanceRecord(record)
      
      await api.put(`/assignments/${assignmentId}`, { status: 'in_progress' })
      
      setStatus({ isCheckedIn: true })
      loadRecords()
      loadAssignments()
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOutAtLocation = async (assignmentId) => {
    setLoading(true)
    try {
      const assignment = assignments.find(a => a.id === assignmentId)
      const record = {
        user_id: user.id,
        type: 'check-out',
        timestamp: new Date().toISOString(),
        lat: location?.lat,
        lng: location?.lng,
        assignment_id: assignmentId,
        location_id: assignment ? assignment.location_id : null,
        location_name: assignment ? assignment.location_name : null
      }
      saveAttendanceRecord(record)
      
      await api.put(`/assignments/${assignmentId}`, { status: 'waiting_review' })
      
      setStatus({ isCheckedIn: false })
      loadRecords()
      loadAssignments()
    } finally {
      setLoading(false)
    }
  }

  const handleRoleRequest = async () => {
    setRoleRequestMessage('')
    try {
      await api.post('/auth/role-request', {
        user_id: user.id,
        requested_role: 'admin'
      })
      setRoleRequestMessage('Request berhasil dikirim! Menunggu persetujuan admin.')
      loadRoleRequest()
    } catch (error) {
      setRoleRequestMessage(error.response?.data?.error || 'Gagal mengirim request')
    }
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
      
      // Auto sync to server
      try {
        await api.post('/attendance/sync', { records: [{ ...record, synced: 1 }] })
      } catch (syncErr) {
        console.log('Sync failed, will sync later:', syncErr)
      }
      
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
      
      // Auto sync to server
      try {
        await api.post('/attendance/sync', { records: [{ ...record, synced: 1 }] })
      } catch (syncErr) {
        console.log('Sync failed, will sync later:', syncErr)
      }
      
      setStatus({ isCheckedIn: false })
      loadRecords()
    } finally {
      setLoading(false)
    }
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

  const renderContent = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayExcuse = myExcuses.find(e => e.attendance_date === today)
    const hasSubmittedExcuse = todayExcuse && todayExcuse.status !== 'rejected'

    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Warning/Reprimand Section - Hide if already submitted excuse */}
            {warnings.length > 0 && !hasSubmittedExcuse && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                  ⚠️ Pesan dari Admin
                </h3>
                {warnings.map(w => (
                  <div key={w.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-2 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        w.warning_type === 'reprimand' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {w.warning_type === 'reprimand' ? '⚠️ Teguran' : '📋 Minta Keterangan'}
                      </span>
                      <span className="text-xs text-gray-400">{w.admin_name}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{w.message}</p>
                  </div>
                ))}
                <button
                  onClick={() => setExcuseModalOpen(true)}
                  className="mt-3 w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  📝 Ajukan Alasan
                </button>
              </div>
            )}

            {/* Show confirmation if excuse submitted */}
            {hasSubmittedExcuse && (
              <div className={`rounded-xl p-4 ${
                todayExcuse.status === 'approved' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : todayExcuse.status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    todayExcuse.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40' :
                    todayExcuse.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40' :
                    'bg-blue-100 dark:bg-blue-900/40'
                  }`}>
                    {todayExcuse.status === 'approved' ? (
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : todayExcuse.status === 'rejected' ? (
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${
                      todayExcuse.status === 'approved' ? 'text-green-800 dark:text-green-200' :
                      todayExcuse.status === 'rejected' ? 'text-red-800 dark:text-red-200' :
                      'text-blue-800 dark:text-blue-200'
                    }`}>
                      {todayExcuse.status === 'approved' ? '✅ Alasan Diterima' :
                       todayExcuse.status === 'rejected' ? '❌ Alasan Ditolak' :
                       '⏳ Alasan Sedang Diverifikasi'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {todayExcuse.status === 'approved' ? 'Ketidakhadiran Anda telah disetujui' :
                       todayExcuse.status === 'rejected' ? 'Alasan Anda ditolak. Silakan hubungi admin.' :
                       'Menunggu persetujuan admin'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* My Excuses History */}
            {myExcuses.filter(e => e.attendance_date !== today).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">📝 Riwayat Alasan Sebelumnya</h3>
                <div className="space-y-2">
                  {myExcuses.filter(e => e.attendance_date !== today).slice(0, 3).map(excuse => (
                    <div key={excuse.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium text-gray-800 dark:text-white">{excuse.attendance_date}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          {excuse.reason === 'sakit' ? '🤒 Sakit' :
                           excuse.reason === 'acara_keluarga' ? '👨‍👩‍👧 Keluarga' :
                           excuse.reason === 'kendala_lapangan' ? '🚧 Lapangan' : '📝 Lainnya'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        excuse.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        excuse.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {excuse.status === 'approved' ? 'Diterima' :
                         excuse.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Status Absensi</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-4 h-4 rounded-full ${status.isCheckedIn ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-lg text-gray-800 dark:text-white">
                  {status.isCheckedIn ? 'Sudah Check In' : 'Belum Check In'}
                </span>
              </div>

              {location && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Lokasi: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleCheckIn}
                  disabled={status.isCheckedIn || loading}
                  className="bg-secondary text-white px-6 py-3 rounded-lg hover:bg-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Check In
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={!status.isCheckedIn || loading}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Check Out
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Aktivitas Terakhir</h2>
                <SyncButton onSyncComplete={loadRecords} />
              </div>
              <div className="space-y-3">
                {records.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Belum ada riwayat</p>
                ) : (
                  records.map((record, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          record.type === 'check-in' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          <span className={`text-lg ${record.type === 'check-in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {record.type === 'check-in' ? '↓' : '↑'}
                          </span>
                        </div>
                        <div>
                          <span className={`font-medium block ${record.type === 'check-in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {record.type === 'check-in' 
                              ? (record.assignment_id ? 'Check In Visit' : 'Check In Masuk') 
                              : (record.assignment_id ? 'Check Out Visit' : 'Check Out Pulang')}
                          </span>
                          {record.location_name && (
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Lokasi: {record.location_name}
                            </p>
                          )}
                          {record.lat && record.lng && (
                            <p className="text-xs text-gray-400">
                              GPS: {record.lat.toFixed(4)}, {record.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {new Date(record.timestamp).toLocaleTimeString('id-ID')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(record.timestamp).toLocaleDateString('id-ID')}
                        </p>
                        {record.synced === false && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Belum sync
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )

      case 'assignments':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Penugasan Hari Ini</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Lokasi yang harus Anda kunjungi hari ini
                  </p>
                </div>
                {assignments.length < 2 && (
                  <button
                    onClick={handleRequestDaily}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Request Tugas
                  </button>
                )}
              </div>

              {assignmentMessage && (
                <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                  assignmentMessage.includes('Gagal')
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  {assignmentMessage}
                </div>
              )}

              {assignments.length === 0 ? (
                <div className="p-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-400 mb-4">Tidak ada penugasan hari ini</p>
                  <button
                    onClick={handleRequestDaily}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    {loading ? 'Memproses...' : 'Request Tugas Sekarang'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((a) => (
                    <div key={a.id} className={`rounded-xl p-5 transition-colors ${
                      selectedAssignment?.id === a.id
                        ? 'bg-secondary/5 ring-2 ring-secondary'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white">{a.location_name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{a.address || '-'}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                                {a.site_id || '-'}
                              </span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                a.type === 'PREVENTIVE MAINTENANCE'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}>
                                {a.type || 'CORRECTIVE'}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{a.province}</span>
                            </div>
                            {a.notes && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">{a.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            a.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            a.status === 'waiting_review' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {a.status === 'completed' ? 'Selesai' :
                             a.status === 'in_progress' ? 'Sedang Dikerjakan' :
                             a.status === 'waiting_review' ? 'Menunggu Pemeriksaan' : 'Menunggu'}
                          </span>
                          {a.status === 'pending' && (
                            <button
                              onClick={() => handleCheckInAtLocation(a.id, a.location_id)}
                              disabled={loading}
                              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark disabled:opacity-50 text-sm font-medium transition-colors"
                            >
                              Check In di Sini
                            </button>
                          )}
                          {a.status === 'in_progress' && (
                            <button
                              onClick={() => handleCheckOutAtLocation(a.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium transition-colors"
                            >
                              Check Out
                            </button>
                          )}
                          {a.status === 'waiting_review' && (
                            <button
                              onClick={() => handleRequestCheck(a.id)}
                              disabled={loading || requestedChecks.includes(a.id)}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                requestedChecks.includes(a.id)
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                              }`}
                            >
                              {requestedChecks.includes(a.id) ? '✓ Requested Pengecekan' : 'Request Pengecekan'}
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectAssignment(a)}
                            className="px-3 py-1.5 text-secondary hover:bg-secondary/10 rounded-lg text-sm font-medium transition-colors"
                          >
                            {selectedAssignment?.id === a.id ? 'Terpilih' : 'Lihat Dokumentasi'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documentation Checklist */}
            {selectedAssignment && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Checklist Dokumentasi</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedAssignment.location_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {docChecklist.filter(d => d.uploaded).length}/{docChecklist.length} selesai
                    </span>
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all"
                        style={{ width: `${docChecklist.length > 0 ? (docChecklist.filter(d => d.uploaded).length / docChecklist.length * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {docMessage && (
                  <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                    docMessage.includes('Masih') || docMessage.includes('belum')
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}>
                    {docMessage}
                  </div>
                )}

                {docChecklist.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-400">Tidak ada item dokumentasi yang perlu dilengkapi</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {docChecklist.map((item) => (
                      <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                        item.uploaded
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.uploaded
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                          }`}>
                            {item.uploaded ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                            )}
                            {item.uploaded && item.upload && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                File: {item.upload.file_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_required === 1 && !item.uploaded && (
                            <span className="text-xs text-red-500 font-medium">Wajib</span>
                          )}
                          {item.uploaded ? (
                            <button
                              onClick={() => handleDeleteDocUpload(item.upload.id)}
                              className="px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm transition-colors"
                            >
                              Hapus
                            </button>
                          ) : (
                            <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                              uploadingDoc
                                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                                : 'bg-secondary text-white hover:bg-secondary-dark'
                            }`}>
                              {uploadingDoc ? 'Mengupload...' : 'Upload'}
                              <input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => handleDocUpload(item.id, e.target.files[0])}
                                disabled={uploadingDoc}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                    {docChecklist.length > 0 && (() => {
                      const requiredCount = selectedAssignment?.type === 'PREVENTIVE MAINTENANCE' ? 51 : 5
                      const uploadedCount = docChecklist.filter(d => d.uploaded).length
                      return (
                        <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-600 mt-2">
                          {uploadedCount < requiredCount && (
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-sm font-medium">
                              <span>⚠️</span>
                              <span>Minimal {requiredCount} foto/dokumen harus terupload untuk submit (Saat ini: {uploadedCount}/{requiredCount})</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={handleSaveDraft}
                              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                              </svg>
                              Simpan Draft
                            </button>
                            <button
                              onClick={handleSubmitDone}
                              disabled={
                                uploadedCount < requiredCount ||
                                (selectedAssignment?.type === 'PREVENTIVE MAINTENANCE' &&
                                  docChecklist.filter(d => d.is_required === 1).length !== docChecklist.filter(d => d.is_required === 1 && d.uploaded).length)
                              }
                              className="px-5 py-2.5 bg-secondary text-white rounded-lg hover:bg-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Selesai
                            </button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">Teknisi</p>
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

            {/* Role Request Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Request Role Admin</h2>
              
              {roleRequestMessage && (
                <div className={`p-4 rounded-lg mb-4 ${
                  roleRequestMessage.includes('berhasil') 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {roleRequestMessage}
                </div>
              )}

              {roleRequest ? (
                <div className="flex items-center gap-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Menunggu Persetujuan</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Request Anda sedang ditinjau oleh admin</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Ingin menjadi admin? Kirim request untuk meningkatkan role Anda.
                  </p>
                  <button
                    onClick={handleRoleRequest}
                    className="bg-secondary text-white px-6 py-2.5 rounded-lg hover:bg-secondary-dark transition-colors"
                  >
                    Minta Jadi Admin
                  </button>
                </div>
              )}
            </div>
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

  const navItems = [
    { id: 'home', label: 'Beranda', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { id: 'assignments', label: 'Penugasan', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { id: 'profile', label: 'Profil', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'settings', label: 'Pengaturan', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-72 bg-primary dark:bg-gray-800 flex-col transition-colors">
        <div className="p-6 border-b border-gray-800 dark:border-gray-700">
          <h1 className="text-xl font-bold text-white tracking-tight">Absensi Teknisi</h1>
          <p className="text-sm text-gray-400 mt-1">Teknisi Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === item.id
                  ? 'bg-secondary text-white shadow-lg shadow-secondary/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white dark:hover:bg-gray-700/50'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400">Teknisi</p>
            </div>
            <NotificationBell />
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
      <div className="flex-1 flex flex-col">
        {/* Header - Mobile */}
        <header className="bg-primary dark:bg-gray-800 shadow-sm md:hidden transition-colors">
          <div className="px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">Dashboard Teknisi</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                title={isDark ? 'Mode Terang' : 'Mode Gelap'}
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-gray-300">{user.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary dark:text-white">
                  {navItems.find(m => m.id === activeTab)?.label}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {activeTab === 'home' && 'Kelola absensi harian Anda'}
                  {activeTab === 'assignments' && 'Lokasi yang harus dikunjungi hari ini'}
                  {activeTab === 'profile' && 'Kelola informasi profil Anda'}
                  {activeTab === 'settings' && 'Pengaturan aplikasi'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="hidden md:block p-2.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden transition-colors">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'text-secondary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Review Dokumentasi Modal */}
      {isReviewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-gray-150 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gray-50 dark:bg-gray-900/10">
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight transition-all" style={{ fontSize: `${1.875 * reviewFontScale}rem` }}>Review Foto Dokumentasi</h3>
                <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mt-2 font-semibold transition-all" style={{ fontSize: `${1.125 * reviewFontScale}rem` }}>
                  {selectedAssignment?.location_name} • {selectedAssignment?.type || 'CORRECTIVE'}
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {/* Font Size Zoom Controls */}
                <div className="flex items-center gap-3 bg-white dark:bg-gray-700 border border-gray-205 dark:border-gray-600 rounded-xl p-2 shadow-sm select-none">
                  <span className="text-sm sm:text-base font-bold text-gray-500 dark:text-gray-400 pl-1">Ukuran Teks:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReviewFontScale(prev => Math.max(0.8, prev - 0.1))}
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-250 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-bold text-lg border border-gray-300 dark:border-gray-500 active:scale-95 transition-all"
                      title="Perkecil Teks (A-)"
                    >
                      A-
                    </button>
                    <span className="text-base sm:text-lg font-extrabold text-gray-800 dark:text-white min-w-[3.5rem] text-center">
                      {Math.round(reviewFontScale * 100)}%
                    </span>
                    <button
                      onClick={() => setReviewFontScale(prev => Math.min(2.0, prev + 0.1))}
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-250 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-bold text-lg border border-gray-300 dark:border-gray-500 active:scale-95 transition-all"
                      title="Perbesar Teks (A+)"
                    >
                      A+
                    </button>
                    <button
                      onClick={() => setReviewFontScale(1.0)}
                      className="px-3 py-2 text-sm font-bold bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-lg transition-colors border border-secondary/20 ml-1"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsReviewOpen(false)}
                  className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-150 transition-colors p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                  aria-label="Tutup"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content (Uploaded Photos Grid) */}
            <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-950/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {docChecklist
                  .filter(item => item.uploaded && item.upload)
                  .map((item) => {
                    const isImg = item.upload.file_type?.startsWith('image/')
                    return (
                      <div key={item.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-650 rounded-2xl overflow-hidden shadow-md flex flex-col">
                        <div className="aspect-video w-full bg-gray-150 dark:bg-gray-900 relative flex items-center justify-center overflow-hidden flex-shrink-0 group">
                          {isImg ? (
                            <img
                              src={`/api/documentation/download/${item.upload.file_name}`}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                              onClick={() => window.open(`/api/documentation/download/${item.upload.file_name}`, '_blank')}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-3 text-center p-6">
                              <svg className="w-14 h-14 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-base text-gray-500 font-medium truncate max-w-[200px] transition-all" style={{ fontSize: `${1.0 * reviewFontScale}rem` }}>{item.upload.file_name}</span>
                            </div>
                          )}
                          <div className="absolute top-3 right-3 bg-black/85 text-white text-xs sm:text-sm px-3.5 py-1.5 rounded-full font-bold tracking-wide transition-all" style={{ fontSize: `${0.75 * reviewFontScale}rem` }}>
                            {isImg ? 'GAMBAR' : 'FILE'}
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white text-xl sm:text-2xl leading-snug transition-all" style={{ fontSize: `${1.25 * reviewFontScale}rem` }}>{item.name}</p>
                            {item.description && (
                              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mt-2 leading-relaxed font-medium transition-all" style={{ fontSize: `${1.0 * reviewFontScale}rem` }}>{item.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-150 dark:border-gray-700 flex justify-end items-center gap-5 bg-gray-50 dark:bg-gray-900/10">
              <button
                onClick={() => setIsReviewOpen(false)}
                className="px-8 py-4 border-2 border-gray-300 dark:border-gray-655 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-lg sm:text-xl font-bold transition-all shadow-sm"
                style={{ fontSize: `${1.125 * reviewFontScale}rem` }}
              >
                Kembali
              </button>
              <button
                onClick={handleReviewCheckout}
                disabled={loading}
                className="px-10 py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-lg sm:text-xl font-extrabold transition-all flex items-center gap-3 cursor-pointer shadow-lg active:scale-95"
                style={{ fontSize: `${1.125 * reviewFontScale}rem` }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {loading ? 'Memproses...' : 'Check Out & Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excuse Modal */}
      {excuseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">📝 Ajukan Alasan</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alasan</label>
                <select
                  value={excuseReason}
                  onChange={(e) => {
                    setExcuseReason(e.target.value)
                    setExcuseDescription('')
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                >
                  <option value="">Pilih alasan...</option>
                  <option value="sakit">🤒 Sakit</option>
                  <option value="acara_keluarga">👨‍👩‍👧 Acara Keluarga</option>
                  <option value="kendala_lapangan">🚧 Kendala Lapangan</option>
                  <option value="lainnya">📝 Lainnya</option>
                </select>
              </div>
              
              {excuseReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {excuseReason === 'kendala_lapangan' ? 'Detail Kendala *' : 'Keterangan *'}
                  </label>
                  {excuseReason === 'kendala_lapangan' ? (
                    <textarea
                      value={excuseDescription}
                      onChange={(e) => setExcuseDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="Jelaskan kendala lapangan yang dihadapi...&#10;Contoh:&#10;- Jalan rusak/tidak bisa dilalui kendaraan&#10;- Cuaca ekstrem&#10;- Peralatan rusak&#10;- dll"
                      required
                    />
                  ) : excuseReason === 'sakit' ? (
                    <input
                      type="text"
                      value={excuseDescription}
                      onChange={(e) => setExcuseDescription(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="Contoh: Demam, flu, sakit perut..."
                      required
                    />
                  ) : excuseReason === 'acara_keluarga' ? (
                    <input
                      type="text"
                      value={excuseDescription}
                      onChange={(e) => setExcuseDescription(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="Contoh: Pernikahan, pemakaman, syukuran..."
                      required
                    />
                  ) : (
                    <textarea
                      value={excuseDescription}
                      onChange={(e) => setExcuseDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                      placeholder="Jelaskan alasan Anda..."
                      required
                    />
                  )}
                  {excuseReason === 'kendala_lapangan' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Wajib menjelaskan kendala dengan detail untuk verifikasi admin
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setExcuseModalOpen(false)
                  setExcuseReason('')
                  setExcuseDescription('')
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={submitExcuse}
                disabled={!excuseReason || !excuseDescription.trim()}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
