import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { saveAttendanceRecord, getAttendanceRecords, markRecordsSynced } from '../utils/storage'
import api from '../utils/api'
import SyncButton from './SyncButton'
import NotificationBell from './NotificationBell'
import ChatBox from './ChatBox'
import Ikon from './Ikon'
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

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [adminUser, setAdminUser] = useState(null)
  const [unreadChats, setUnreadChats] = useState(0)

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
    const loadAdmin = async () => {
      try {
        const res = await api.get('/auth/users')
        const admin = res.data.find(u => u.role === 'admin')
        if (admin) setAdminUser(admin)
      } catch (err) { console.error('Failed to load admin:', err) }
    }
    loadAdmin()
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/chat/unread/${user.id}`)
        setUnreadChats(res.data.count)
      } catch (err) { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [user])

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
        // Server adalah sumber utama; lokal hanya ditampilkan bila belum terkirim.
        const merged = [...userLocalRecords.filter(r => !r.synced), ...serverRecords]
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

      const saved = saveAttendanceRecord(record)

      // Auto sync to server; tandai lokal sudah terkirim agar tidak dobel saat Sync
      try {
        await api.post('/attendance/sync', { records: [{ ...record, synced: 1 }] })
        markRecordsSynced([saved.id])
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

      const saved = saveAttendanceRecord(record)

      // Auto sync to server; tandai lokal sudah terkirim agar tidak dobel saat Sync
      try {
        await api.post('/attendance/sync', { records: [{ ...record, synced: 1 }] })
        markRecordsSynced([saved.id])
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
          <div className="space-y-4">
            {/* Pesan dari admin */}
            {warnings.length > 0 && !hasSubmittedExcuse && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  <Ikon name="peringatan" className="h-5 w-5" />Pesan dari Admin
                </h3>
                {warnings.map((w) => (
                  <div key={w.id} className="mb-2 rounded-lg bg-white p-3 last:mb-0 dark:bg-gray-800">
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          w.warning_type === 'reprimand'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {w.warning_type === 'reprimand' ? 'Teguran' : 'Minta Keterangan'}
                      </span>
                      <span className="text-[11px] text-gray-400">{w.admin_name}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{w.message}</p>
                  </div>
                ))}
                <button
                  onClick={() => setExcuseModalOpen(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#14532D] px-4 py-2.5 text-sm font-medium text-[#FAF6EC] transition-colors hover:bg-[#0F3D22]"
                >
                  <Ikon name="catatan" className="h-4 w-4" />Ajukan Alasan
                </button>
              </div>
            )}

            {/* Status pengajuan alasan */}
            {hasSubmittedExcuse && (
              <div
                className={`rounded-xl border p-4 ${
                  todayExcuse.status === 'approved'
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : todayExcuse.status === 'rejected'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      todayExcuse.status === 'approved'
                        ? 'bg-[#15803D]'
                        : todayExcuse.status === 'rejected'
                          ? 'bg-[#B91C1C]'
                          : 'bg-[#B45309]'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {todayExcuse.status === 'approved'
                        ? 'Alasan Diterima'
                        : todayExcuse.status === 'rejected'
                          ? 'Alasan Ditolak'
                          : 'Alasan Sedang Diverifikasi'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {todayExcuse.status === 'approved'
                        ? 'Ketidakhadiran Anda telah disetujui'
                        : todayExcuse.status === 'rejected'
                          ? 'Alasan Anda ditolak. Silakan hubungi admin.'
                          : 'Menunggu persetujuan admin'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Absensi hari ini */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-400">Absensi hari ini</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <span className={`h-2 w-2 rounded-full ${status.isCheckedIn ? 'bg-[#15803D]' : 'bg-[#B45309]'}`} />
                    {status.isCheckedIn ? 'Sudah check in' : 'Belum check in'}
                  </p>
                </div>
                <span className="rounded-full bg-[#FAF6EC] px-2.5 py-1 text-[11px] font-medium text-[#14532D] dark:bg-gray-700 dark:text-gray-200">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>

              {location ? (
                <p className="mt-2 font-mono text-[11px] tabular-nums text-gray-400">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-gray-400">Menunggu lokasi GPS...</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={handleCheckIn}
                  disabled={status.isCheckedIn || loading}
                  className="rounded-lg bg-[#14532D] px-4 py-3 text-sm font-medium text-[#FAF6EC] transition-colors hover:bg-[#0F3D22] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Check In
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={!status.isCheckedIn || loading}
                  className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Check Out
                </button>
              </div>
            </div>

            {/* Aktivitas terakhir */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Aktivitas terakhir</h2>
                <SyncButton onSyncComplete={loadRecords} />
              </div>
              {records.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Belum ada riwayat</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {records.map((record, index) => (
                    <div key={index} className="flex items-start justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                            record.type === 'check-in' ? 'bg-[#15803D]' : 'bg-[#B45309]'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {record.type === 'check-in'
                              ? record.assignment_id
                                ? 'Check In Visit'
                                : 'Check In Masuk'
                              : record.assignment_id
                                ? 'Check Out Visit'
                                : 'Check Out Pulang'}
                          </p>
                          {record.location_name && (
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{record.location_name}</p>
                          )}
                          {record.lat && record.lng && (
                            <p className="font-mono text-[11px] tabular-nums text-gray-400">
                              {record.lat.toFixed(4)}, {record.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm tabular-nums text-gray-700 dark:text-gray-300">
                          {new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(record.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                        {record.synced === false && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                            Belum sync
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riwayat alasan */}
            {myExcuses.filter((e) => e.attendance_date !== today).length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 border-b border-gray-100 p-4 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white">
                  <Ikon name="catatan" className="h-4 w-4" />Riwayat alasan sebelumnya
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {myExcuses
                    .filter((e) => e.attendance_date !== today)
                    .slice(0, 3)
                    .map((excuse) => (
                      <div key={excuse.id} className="flex items-center justify-between p-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{excuse.attendance_date}</span>
                          <span className="ml-2 text-gray-500 dark:text-gray-400">
                            {excuse.reason === 'sakit'
                              ? 'Sakit'
                              : excuse.reason === 'acara_keluarga'
                                ? 'Keluarga'
                                : excuse.reason === 'kendala_lapangan'
                                  ? 'Lapangan'
                                  : 'Lainnya'}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              excuse.status === 'approved'
                                ? 'bg-[#15803D]'
                                : excuse.status === 'rejected'
                                  ? 'bg-[#B91C1C]'
                                  : 'bg-[#B45309]'
                            }`}
                          />
                          {excuse.status === 'approved' ? 'Diterima' : excuse.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
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
                        ? 'bg-[#E8EFE8] ring-2 ring-[#14532D] dark:bg-[#1F3A2A]'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#E8EFE8] dark:bg-[#1F3A2A] rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white">{a.location_name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{a.address || '-'}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#E8EFE8] dark:bg-[#1F3A2A] text-secondary">
                                {a.site_id || '-'}
                              </span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                a.type === 'PREVENTIVE MAINTENANCE'
                                  ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
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
                              className="px-4 py-2 bg-[#14532D] text-white rounded-lg hover:bg-[#0F3D22] disabled:opacity-50 text-sm font-medium transition-colors"
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
                              {requestedChecks.includes(a.id) ? 'Requested Pengecekan' : 'Request Pengecekan'}
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectAssignment(a)}
                            className="px-3 py-1.5 text-secondary hover:bg-[#E8EFE8] dark:bg-[#1F3A2A] rounded-lg text-sm font-medium transition-colors"
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
                        className="h-full bg-[#14532D] transition-all"
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
                                : 'bg-[#14532D] text-white hover:bg-[#0F3D22]'
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
                              <Ikon name="peringatan" className="w-4 h-4 flex-shrink-0" />
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
                              className="px-5 py-2.5 bg-[#14532D] text-white rounded-lg hover:bg-[#0F3D22] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
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
                  <div className="w-20 h-20 bg-[#14532D] rounded-full flex items-center justify-center">
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
                  className="bg-[#14532D] text-white px-6 py-2.5 rounded-lg hover:bg-[#0F3D22] transition-colors"
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
                    className="bg-[#14532D] text-white px-6 py-2.5 rounded-lg hover:bg-[#0F3D22] transition-colors"
                  >
                    Minta Jadi Admin
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => {
                  if (window.confirm('Keluar dari akun?')) logout()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar dari akun
              </button>
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
                  className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-[#14532D]' : 'bg-gray-300'}`}
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

      case 'chat':
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Chat dengan Admin</h2>
            <div className="h-[calc(100vh-17rem)] min-h-[360px]">
            {adminUser ? (
              <ChatBox
                targetUser={adminUser}
                onClose={() => setActiveTab('home')}
                embedded={true}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#14532D] border-t-transparent" />
                <p className="mt-3 text-sm">Memuat...</p>
              </div>
            )}
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
    { id: 'chat', label: 'Chat', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[#14532D] text-sm font-semibold text-[#FAF6EC]">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Teknisi</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Keluar dari akun?')) logout()
              }}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Keluar"
              aria-label="Keluar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-8 pt-5">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {navItems.find((m) => m.id === activeTab)?.label}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'home' && 'Kelola absensi harian Anda'}
            {activeTab === 'assignments' && 'Lokasi yang harus dikunjungi hari ini'}
            {activeTab === 'chat' && 'Chat pribadi dengan admin'}
            {activeTab === 'profile' && 'Kelola informasi profil Anda'}
            {activeTab === 'settings' && 'Pengaturan aplikasi'}
          </p>
        </div>
        {renderContent()}
      </main>

      {/* Dock bawah */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-2xl items-stretch justify-between gap-1 px-2 py-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors ${
                activeTab === item.id
                  ? 'text-[#14532D] dark:text-[#86B998]'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-lg transition-colors ${
                  activeTab === item.id ? 'bg-[#E8EFE8] dark:bg-[#1F3A2A]' : ''
                }`}
              >
                {item.icon}
              </span>
              {item.label}
              {item.id === 'chat' && unreadChats > 0 && (
                <span className="absolute right-1 top-0 rounded-full bg-[#F2C230] px-1.5 text-[10px] font-semibold text-[#3F2D00]">
                  {unreadChats}
                </span>
              )}
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
                      className="px-3 py-2 text-sm font-bold bg-[#E8EFE8] dark:bg-[#1F3A2A] text-secondary hover:bg-secondary/20 rounded-lg transition-colors border border-secondary/20 ml-1"
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Ikon name="catatan" className="w-5 h-5" />Ajukan Alasan</h3>
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
                  <option value="sakit">Sakit</option>
                  <option value="acara_keluarga">Acara Keluarga</option>
                  <option value="kendala_lapangan">Kendala Lapangan</option>
                  <option value="lainnya">Lainnya</option>
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
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                      <Ikon name="peringatan" className="w-3.5 h-3.5 flex-shrink-0" />Wajib menjelaskan kendala dengan detail untuk verifikasi admin
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
