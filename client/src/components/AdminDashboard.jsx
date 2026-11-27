import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import api from '../utils/api'
import NotificationBell from './NotificationBell'
import ChatBox from './ChatBox'
import Ikon from './Ikon'

const menuItems = [
  { id: 'chat', label: 'Chat', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )},
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
  const toast = useToast()
  const [activeMenu, setActiveMenu] = useState('attendance')
  const [navOpen, setNavOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024))
  const [statusFilter, setStatusFilter] = useState('semua')
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [roleRequests, setRoleRequests] = useState([])
  const [locations, setLocations] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchLoc, setSearchLoc] = useState('')
  const [toggleReasonModal, setToggleReasonModal] = useState({ open: false, location: null })
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
  
  // Password change requests state
  const [passwordRequests, setPasswordRequests] = useState([])
  
  // Daily attendance summary state
  const [dailySummary, setDailySummary] = useState([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [warningModalOpen, setWarningModalOpen] = useState(false)
  const [warningTarget, setWarningTarget] = useState(null)
  const [warningMessage, setWarningMessage] = useState('')
  const [warningType, setWarningType] = useState('request_explanation')
  const [excuses, setExcuses] = useState([])

  // Chat state
  const [chatTechnician, setChatTechnician] = useState(null)
  const [conversations, setConversations] = useState([])
  const [unreadChats, setUnreadChats] = useState(0)

  useEffect(() => {
    loadUsers()
    loadRoleRequests()
    loadLocations()
    loadAssignments()
    loadDocItems()
    loadDocUploads()
    loadPasswordRequests()
    loadDailySummary()
    loadExcuses()
    loadConversations()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations()
      api.get(`/chat/unread/${user.id}`).then(r => setUnreadChats(r.data.count)).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [user.id])

  useEffect(() => {
    loadRecords()
    loadDailySummary()
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

  const loadPasswordRequests = async () => {
    try {
      const response = await api.get('/auth/password-requests')
      setPasswordRequests(response.data)
    } catch (error) {
      console.error('Failed to load password requests:', error)
    }
  }

  const handlePasswordRequest = async (requestId, status) => {
    try {
      await api.put(`/auth/password-requests/${requestId}`, { status, reviewed_by: user.id })
      loadPasswordRequests()
    } catch (error) {
      console.error('Failed to handle password request:', error)
    }
  }

  const loadDailySummary = async () => {
    setSummaryLoading(true)
    try {
      const response = await api.get(`/attendance/daily-summary?date=${selectedDate}`)
      setDailySummary(response.data)
    } catch (error) {
      console.error('Failed to load daily summary:', error)
    } finally {
      setSummaryLoading(false)
    }
  }

  const checkMissingCheckouts = async () => {
    try {
      const response = await api.post('/attendance/check-missing-checkout', { date: selectedDate })
      loadDailySummary()
      loadRecords()
      toast.success(response.data.message)
    } catch (error) {
      console.error('Failed to check missing checkouts:', error)
    }
  }

  const openWarningModal = (tech) => {
    setWarningTarget(tech)
    setWarningMessage('')
    setWarningType('request_explanation')
    setWarningModalOpen(true)
  }

  const sendWarning = async () => {
    if (!warningMessage.trim()) {
      toast.warning('Pesan wajib diisi')
      return
    }
    try {
      await api.post('/attendance/warnings', {
        user_id: warningTarget.user_id,
        attendance_date: selectedDate,
        warning_type: warningType,
        message: warningMessage,
        admin_id: user.id
      })
      setWarningModalOpen(false)
      toast.success('Teguran/permintaan keterangan berhasil dikirim')
    } catch (error) {
      console.error('Failed to send warning:', error)
    }
  }

  const loadExcuses = async () => {
    try {
      const response = await api.get('/attendance/excuses?status=pending')
      setExcuses(response.data)
    } catch (error) {
      console.error('Failed to load excuses:', error)
    }
  }

  const handleExcuseReview = async (excuseId, status) => {
    try {
      await api.put(`/attendance/excuses/${excuseId}`, { status, reviewed_by: user.id })
      loadExcuses()
      loadDailySummary()
    } catch (error) {
      console.error('Failed to review excuse:', error)
    }
  }

  const loadConversations = async () => {
    try {
      const res = await api.get(`/chat/conversations/${user.id}`)
      setConversations(res.data)
    } catch (err) {
      console.error('Failed to load conversations:', err)
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
  const [docSearch, setDocSearch] = useState('')
  const [reviewLocationId, setReviewLocationId] = useState(null)
  const [docsTab, setDocsTab] = useState('items')
  
  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewAssignment, setReviewAssignment] = useState(null)
  const [reviewAssignmentUploads, setReviewAssignmentUploads] = useState([])
  const [reviewLoading, setReviewLoading] = useState(false)
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxUpload, setLightboxUpload] = useState(null)
  const [lightboxTempNote, setLightboxTempNote] = useState('')

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

  const handleReview = async (uploadId, status, note = '') => {
    try {
      await api.put(`/documentation/review/${uploadId}`, {
        review_status: status,
        review_note: note || reviewNote
      })
      setReviewNote('')
      loadDocUploads()
      if (reviewAssignment) {
        loadReviewAssignmentUploads(reviewAssignment.id)
      }
    } catch (error) {
      console.error('Failed to review upload:', error)
    }
  }

  const openReviewModal = async (assignment) => {
    setReviewAssignment(assignment)
    setReviewModalOpen(true)
    await loadReviewAssignmentUploads(assignment.id)
  }

  const loadReviewAssignmentUploads = async (assignmentId) => {
    setReviewLoading(true)
    try {
      const response = await api.get(`/documentation/uploads/${assignmentId}`)
      setReviewAssignmentUploads(response.data)
    } catch (error) {
      console.error('Failed to load assignment uploads:', error)
    } finally {
      setReviewLoading(false)
    }
  }

  const handleBulkReview = async (status) => {
    const pendingUploads = reviewAssignmentUploads.filter(u => u.review_status === 'pending')
    if (pendingUploads.length === 0) return

    try {
      for (const upload of pendingUploads) {
        await api.put(`/documentation/review/${upload.id}`, {
          review_status: status,
          review_note: reviewNote
        })
      }
      setReviewNote('')
      loadReviewAssignmentUploads(reviewAssignment.id)
      loadDocUploads()
    } catch (error) {
      console.error('Failed to bulk review:', error)
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
      setDocsTab('review')
      setReviewLocationId(null)
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 300)
    }
  }

  const locationByUser = {}
  records.forEach((r) => {
    if (r.location_name && !locationByUser[r.user_id]) locationByUser[r.user_id] = r.location_name
  })
  const filteredSummary = dailySummary.filter((s) => statusFilter === 'semua' || s.status === statusFilter)
  const attentionCount =
    dailySummary.filter((s) => s.status === 'tidak masuk' || s.status === 'belum checkout').length +
    excuses.length +
    passwordRequests.filter((r) => r.status === 'pending').length
  const locationRows = Object.values(
    dailySummary.reduce((acc, s) => {
      const name = locationByUser[s.user_id]
      if (!name) return acc
      acc[name] = acc[name] || { name, hadir: 0, total: 0 }
      acc[name].total += 1
      if (s.status === 'hadir') acc[name].hadir += 1
      return acc
    }, {}),
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const renderContent = () => {
    switch (activeMenu) {
      case 'attendance':
        return (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              {/* Absensi hari ini */}
              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Absensi hari ini</h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {dailySummary.length} teknisi · {dailySummary.filter((s) => s.status === 'hadir').length} sudah masuk
                    </p>
                  </div>
                  <button
                    onClick={checkMissingCheckouts}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14532D] px-3 text-xs font-medium text-[#FAF6EC] transition-colors hover:bg-[#0F3D22]"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Cek tidak checkout
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
                  {[
                    ['semua', 'Semua'],
                    ['hadir', 'Hadir'],
                    ['belum checkout', 'Belum checkout'],
                    ['tidak masuk', 'Tidak masuk'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setStatusFilter(value)}
                      className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                        statusFilter === value
                          ? 'bg-[#14532D] text-[#FAF6EC]'
                          : 'bg-[#FAF6EC] text-[#14532D] hover:bg-[#F2EBD9] dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-[#14532D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  />
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="h-8 max-w-[160px] rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-[#14532D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="">Semua teknisi</option>
                    {users.filter((u) => u.role === 'technician').map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {summaryLoading ? (
                  <div className="flex items-center justify-center gap-2 border-t border-gray-100 py-12 text-sm text-gray-500 dark:border-gray-700">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#14532D] border-t-transparent" />
                    Memuat...
                  </div>
                ) : filteredSummary.length === 0 ? (
                  <div className="border-t border-gray-100 py-12 text-center text-sm text-gray-400 dark:border-gray-700">
                    Tidak ada data absensi
                  </div>
                ) : (
                  <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                          <th className="py-2.5 pl-5 pr-2 text-left font-medium">Teknisi</th>
                          <th className="px-2 py-2.5 text-left font-medium">Lokasi</th>
                          <th className="px-2 py-2.5 text-left font-medium">Masuk</th>
                          <th className="px-2 py-2.5 text-left font-medium">Keluar</th>
                          <th className="px-2 py-2.5 text-left font-medium">Status</th>
                          <th className="py-2.5 pl-2 pr-5 text-right font-medium">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredSummary.map((item) => {
                          const style =
                            item.status === 'hadir'
                              ? { dot: 'bg-[#15803D]', label: 'Hadir' }
                              : item.status === 'belum checkout'
                                ? { dot: 'bg-[#B45309]', label: 'Belum checkout' }
                                : item.status === 'tidak masuk'
                                  ? { dot: 'bg-[#B91C1C]', label: 'Tidak masuk' }
                                  : { dot: 'bg-[#A8A29E]', label: 'Tanpa data' }
                          const time = (value) =>
                            value ? new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'
                          return (
                            <tr key={item.user_id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40">
                              <td className="py-3 pl-5 pr-2">
                                <div className="flex items-center gap-3">
                                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                                    {item.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                                </div>
                              </td>
                              <td className="px-2 py-3 text-gray-600 dark:text-gray-300">{locationByUser[item.user_id] || '—'}</td>
                              <td className="px-2 py-3 tabular-nums text-gray-900 dark:text-gray-100">{time(item.check_in)}</td>
                              <td className="px-2 py-3 tabular-nums text-gray-900 dark:text-gray-100">{time(item.check_out)}</td>
                              <td className="px-2 py-3">
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                  {style.label}
                                </span>
                              </td>
                              <td className="py-3 pl-2 pr-5 text-right">
                                {item.status === 'tidak masuk' ? (
                                  <button
                                    onClick={() => openWarningModal(item)}
                                    className="text-xs font-medium text-[#14532D] underline hover:text-[#0F3D22] dark:text-[#86B998]"
                                  >
                                    Tegur
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Menampilkan {filteredSummary.length} dari {dailySummary.length} teknisi
                </div>
              </div>

              {/* Log check-in / check-out */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-100 p-5 dark:border-gray-700">
                  <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Log check-in / check-out</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Catatan mentah untuk tanggal terpilih</p>
                </div>
                {records.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">Tidak ada catatan</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                          <th className="py-2.5 pl-5 pr-2 text-left font-medium">Teknisi</th>
                          <th className="px-2 py-2.5 text-left font-medium">Tipe</th>
                          <th className="px-2 py-2.5 text-left font-medium">Waktu</th>
                          <th className="py-2.5 pl-2 pr-5 text-left font-medium">Lokasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {records.map((record) => (
                          <tr key={record.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40">
                            <td className="py-3 pl-5 pr-2 font-medium text-gray-900 dark:text-white">{getUserName(record.user_id)}</td>
                            <td className="px-2 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${record.type === 'check-in' ? 'bg-[#15803D]' : 'bg-[#57534E]'}`} />
                                {record.type === 'check-in'
                                  ? record.assignment_id
                                    ? 'Check In Visit'
                                    : 'Check In Masuk'
                                  : record.assignment_id
                                    ? 'Check Out Visit'
                                    : 'Check Out Pulang'}
                              </span>
                            </td>
                            <td className="px-2 py-3 tabular-nums text-gray-600 dark:text-gray-300">
                              {new Date(record.timestamp).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 pl-2 pr-5 text-gray-500 dark:text-gray-400">
                              <span className="block font-medium text-gray-700 dark:text-gray-300">{record.location_name || '—'}</span>
                              {record.lat && record.lng && (
                                <span className="text-[11px] tabular-nums text-gray-400">
                                  {record.lat.toFixed(6)}, {record.lng.toFixed(6)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Kolom kanan */}
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ringkasan hari ini</h3>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                  {[
                    ['Hadir', dailySummary.filter((s) => s.status === 'hadir').length, 'bg-[#15803D]'],
                    ['Belum checkout', dailySummary.filter((s) => s.status === 'belum checkout').length, 'bg-[#B45309]'],
                    ['Tidak masuk', dailySummary.filter((s) => s.status === 'tidak masuk').length, 'bg-[#B91C1C]'],
                    ['Tanpa data', dailySummary.filter((s) => s.status === 'tidak ada data').length, 'bg-[#A8A29E]'],
                  ].map(([label, value, dot]) => (
                    <div key={label}>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
                      </div>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {attentionCount > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Perlu perhatian</h3>
                  {attentionCount > 0 && (
                    <span className="rounded-full bg-[#F2C230] px-2 py-0.5 text-[11px] font-semibold text-[#3F2D00]">
                      {attentionCount}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {[
                    {
                      count: dailySummary.filter((s) => s.status === 'tidak masuk').length,
                      label: 'teknisi tidak masuk',
                      hint: 'Belum ada absensi hari ini',
                      action: 'Lihat',
                      onClick: () => setStatusFilter('tidak masuk'),
                    },
                    {
                      count: dailySummary.filter((s) => s.status === 'belum checkout').length,
                      label: 'belum checkout',
                      hint: 'Sudah masuk, belum pulang',
                      action: 'Lihat',
                      onClick: () => setStatusFilter('belum checkout'),
                    },
                    {
                      count: excuses.length,
                      label: 'alasan menunggu review',
                      hint: 'Dari pengajuan teknisi',
                      action: 'Tinjau',
                      onClick: () => setActiveMenu('technicians'),
                    },
                    {
                      count: passwordRequests.filter((r) => r.status === 'pending').length,
                      label: 'permintaan ubah password',
                      hint: 'Menunggu persetujuan admin',
                      action: 'Setujui',
                      onClick: () => setActiveMenu('technicians'),
                    },
                  ]
                    .filter((row) => row.count > 0)
                    .map((row) => (
                      <div key={row.label} className="p-4">
                        <p className="text-[13px] font-medium text-gray-900 dark:text-white">
                          {row.count} {row.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{row.hint}</p>
                        <button
                          onClick={row.onClick}
                          className="mt-1 text-[11px] font-medium text-[#14532D] underline hover:text-[#0F3D22] dark:text-[#86B998]"
                        >
                          {row.action}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
              )}
              {locationRows.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Per lokasi</h3>
                  <p className="mt-0.5 text-[11px] text-gray-400">Kehadiran hari ini</p>
                  <div className="mt-4 space-y-3.5">
                    {locationRows.map((row) => (
                      <div key={row.name}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-300">{row.name}</span>
                          <span className="tabular-nums font-medium text-gray-900 dark:text-white">
                            {row.hadir}/{row.total}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-[#14532D] dark:bg-[#86B998]"
                            style={{ width: `${row.total ? (row.hadir / row.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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

            {/* Pending Password Change Requests */}
            {passwordRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
                  <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2"><Ikon name="kunci" className="w-5 h-5" />Request Ubah Password</h2>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    {passwordRequests.filter(r => r.status === 'pending').length} request menunggu persetujuan
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Tanggal Request</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {passwordRequests.filter(r => r.status === 'pending').map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  {request.user_name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-gray-800 dark:text-white">{request.user_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{request.user_email}</td>
                          <td className="py-4 px-6 text-gray-500 dark:text-gray-400 text-sm">
                            {new Date(request.created_at).toLocaleDateString('id-ID', { 
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Menunggu
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePasswordRequest(request.id, 'approved')}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => handlePasswordRequest(request.id, 'rejected')}
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
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {users.filter(u => u.id !== user.id).map((u) => (
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
                        <td className="py-4 px-6">
                          {u.role === 'technician' && (
                            <button
                              onClick={() => {
                                setChatTechnician({ id: u.id, name: u.name })
                                setActiveMenu('chat')
                              }}
                              className="px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Chat
                            </button>
                          )}
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
              <div className="bg-secondary p-6 rounded-xl text-white">
                <p className="text-sm opacity-80">Total Teknisi</p>
                <p className="text-4xl font-bold mt-2">
                  {users.filter(u => u.role === 'technician').length}
                </p>
              </div>
              <div className="bg-green-600 p-6 rounded-xl text-white">
                <p className="text-sm opacity-80">Check In Hari Ini</p>
                <p className="text-4xl font-bold mt-2">
                  {records.filter(r => r.type === 'check-in').length}
                </p>
              </div>
              <div className="bg-red-600 p-6 rounded-xl text-white">
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
                <div className="relative group">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">{profileName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-full flex items-center justify-center cursor-pointer transition-all">
                    <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const formData = new FormData()
                      formData.append('avatar', file)
                      try {
                        const res = await api.post(`/auth/avatar/${user.id}`, formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        })
                        setUser(prev => ({ ...prev, avatar: res.data.avatar }))
                        const saved = JSON.parse(localStorage.getItem('user') || '{}')
                        saved.avatar = res.data.avatar
                        localStorage.setItem('user', JSON.stringify(saved))
                        toast.success('Foto profil berhasil diubah')
                      } catch (err) {
                        toast.error(err.response?.data?.error || 'Gagal upload foto')
                      }
                    }} />
                  </label>
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
                  {docUploads.filter(u => u.review_status === 'pending').length > 0 && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {docUploads.filter(u => u.review_status === 'pending').length}
                    </span>
                  )}
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

                {/* Summary Card */}
                {locations.length > 0 && (
                  <div className="flex gap-3 text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-green-700 dark:text-green-400">{locations.filter(l => l.is_active !== 0).length} Aktif</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-red-700 dark:text-red-400">{locations.filter(l => l.is_active === 0).length} Nonaktif</span>
                    </div>
                  </div>
                )}

                {/* Search */}
                {locations.length > 0 && (
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchLoc}
                      onChange={(e) => setSearchLoc(e.target.value)}
                      placeholder="Cari lokasi..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/50 text-base"
                    />
                  </div>
                )}

                {/* Location Cards */}
                {locations.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-400">Belum ada data lokasi</p>
                    <p className="text-sm text-gray-400 mt-1">Upload file untuk menambahkan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {locations
                      .filter(loc => {
                        if (!searchLoc.trim()) return true
                        const q = searchLoc.toLowerCase()
                        return loc.name.toLowerCase().includes(q) || (loc.province || '').toLowerCase().includes(q) || (loc.site_id || '').toLowerCase().includes(q)
                      })
                      .map((loc) => {
                        const active = loc.is_active !== 0
                        return (
                          <div key={loc.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all hover:shadow-md ${
                            active ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800 opacity-80'
                          }`}>
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                  }`}>
                                    <svg className={`w-5 h-5 ${active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate text-base">{loc.name}</p>
                                    {loc.site_id && (
                                      <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded mt-0.5 inline-block">
                                        {loc.site_id}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (active) {
                                      setToggleReasonModal({ open: true, location: loc })
                                    } else {
                                      api.put(`/locations/${loc.id}/toggle`).then(() => loadLocations()).catch(() => {})
                                    }
                                  }}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                                    active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                  title={active ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                              </div>

                              {/* Info */}
                              <div className="space-y-1.5 text-sm">
                                {loc.province && (
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{loc.province}</span>
                                  </div>
                                )}
                                {loc.address && (
                                  <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400">
                                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="line-clamp-2">{loc.address}</span>
                                  </div>
                                )}
                                {!active && loc.deactivation_reason && (
                                  <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-400">
                                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>{loc.deactivation_reason}</span>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                <button
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}

                {/* Deactivation Reason Modal */}
                {toggleReasonModal.open && toggleReasonModal.location && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nonaktifkan Lokasi</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {toggleReasonModal.location.name}
                        </p>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Alasan penonaktifan <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={toggleReasonModal.reason || ''}
                            onChange={(e) => setToggleReasonModal(prev => ({ ...prev, reason: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                            placeholder="Contoh: Lokasi tutup sementara, alih provider, dll."
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                          onClick={() => setToggleReasonModal({ open: false, location: null })}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={async () => {
                            const reason = toggleReasonModal.reason || ''
                            if (!reason.trim()) {
                              alert('Alasan penonaktifan wajib diisi')
                              return
                            }
                            try {
                              await api.put(`/locations/${toggleReasonModal.location.id}/toggle`, { reason })
                              loadLocations()
                              setToggleReasonModal({ open: false, location: null })
                            } catch (e) {
                              console.error(e)
                            }
                          }}
                          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                        >
                          Nonaktifkan
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty search */}
                {locations.filter(loc => {
                  if (!searchLoc.trim()) return true
                  const q = searchLoc.toLowerCase()
                  return loc.name.toLowerCase().includes(q) || (loc.province || '').toLowerCase().includes(q) || (loc.site_id || '').toLowerCase().includes(q)
                }).length === 0 && searchLoc.trim() && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-400">Tidak ada lokasi untuk "<span className="font-medium">{searchLoc}</span>"</p>
                  </div>
                )}
              </div>
            )}

            {locationTab === 'assignments' && (
              <div className="space-y-6">
                {/* Recently Deactivated Locations */}
                {locations.filter(l => l.is_active === 0).length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Lokasi Nonaktif Baru</h2>
                        <p className="text-sm text-red-500 dark:text-red-400">
                          {locations.filter(l => l.is_active === 0).length} lokasi butuh perhatian
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {locations.filter(l => l.is_active === 0).map(loc => (
                        <div key={loc.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 dark:text-white truncate">{loc.name}</p>
                            {loc.deactivation_reason && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">{loc.deactivation_reason}</p>
                            )}
                            {loc.site_id && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{loc.site_id}</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setAssignLocationId(loc.id)
                              document.getElementById('assign-form')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            className="ml-3 flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary-dark text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Tugaskan
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assign Form */}
                <div id="assign-form" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
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
                        {locations.filter(loc => loc.is_active !== 0).map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name} ({loc.site_id || '-'})</option>
                        ))}
                        {locations.filter(loc => loc.is_active === 0).map(loc => (
                          <option key={`inactive-${loc.id}`} value={loc.id}>{loc.name} ({loc.site_id || '-'}) - Nonaktif</option>
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
                                    ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                                    : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                  {a.type || 'CORRECTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-gray-500 dark:text-gray-400">{a.visit_date}</td>
                              <td className="py-3 px-5">
                                <div className="relative">
                                  <select
                                    value={a.status}
                                    onChange={async (e) => {
                                      const newStatus = e.target.value
                                      const statusLabels = {
                                        pending: 'Menunggu',
                                        in_progress: 'Dikerjakan',
                                        waiting_review: 'Menunggu Pemeriksaan',
                                        completed: 'Selesai',
                                        cancelled: 'Dibatalkan'
                                      }
                                      const confirmMsg = `Ubah status dari "${statusLabels[a.status]}" ke "${statusLabels[newStatus]}"?`
                                      
                                      if (newStatus === 'completed' || newStatus === 'cancelled') {
                                        if (!confirm(confirmMsg)) {
                                          e.target.value = a.status
                                          return
                                        }
                                      }
                                      
                                      try {
                                        await api.put(`/assignments/${a.id}`, { status: newStatus })
                                        loadAssignments()
                                      } catch (err) {
                                        console.error('Failed to change status:', err)
                                      }
                                    }}
                                    className={`appearance-none w-full px-3 py-2 pr-8 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/50 border ${
                                      a.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' :
                                      a.status === 'in_progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                      a.status === 'waiting_review' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' :
                                      a.status === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' :
                                      'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                    }`}
                                  >
                                    <option value="pending" className="bg-white dark:bg-gray-700 dark:text-gray-200">Menunggu</option>
                                    <option value="in_progress" className="bg-white dark:bg-gray-700 dark:text-gray-200">Dikerjakan</option>
                                    <option value="waiting_review" className="bg-white dark:bg-gray-700 dark:text-gray-200">Menunggu Pemeriksaan</option>
                                    <option value="completed" className="bg-white dark:bg-gray-700 dark:text-gray-200">Selesai</option>
                                    <option value="cancelled" className="bg-white dark:bg-gray-700 dark:text-gray-200">Dibatalkan</option>
                                  </select>
                                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <svg className={`w-4 h-4 ${
                                      a.status === 'completed' ? 'text-green-500' :
                                      a.status === 'in_progress' ? 'text-blue-500' :
                                      a.status === 'waiting_review' ? 'text-orange-500' :
                                      a.status === 'cancelled' ? 'text-red-500' :
                                      'text-yellow-500'
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
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
                                    onClick={() => openReviewModal(a)}
                                    className="p-1.5 text-gray-400 hover:text-secondary hover:bg-secondary/10 dark:hover:bg-secondary/20 rounded-lg transition-colors"
                                    title="Review Dokumentasi"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </button>
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
                {/* Sub-tabs: Items vs Review */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-1.5 flex gap-1.5">
                  <button
                    onClick={() => setDocsTab('items')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      docsTab === 'items'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Item Checklist
                  </button>
                  <button
                    onClick={() => setDocsTab('review')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      docsTab === 'review'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Review per Lokasi
                    {docUploads.filter(u => u.review_status === 'pending').length > 0 && (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {docUploads.filter(u => u.review_status === 'pending').length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Item Checklist Management */}
                {docsTab === 'items' && (<>
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
                      {/* Search */}
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={docSearch}
                            onChange={(e) => setDocSearch(e.target.value)}
                            placeholder="Cari item dokumentasi..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 placeholder-gray-400"
                          />
                          {docSearch && (
                            <button
                              onClick={() => setDocSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {(() => {
                        const filtered = docSearch
                          ? docItems.filter(item =>
                              item.name.toLowerCase().includes(docSearch.toLowerCase()) ||
                              (item.description && item.description.toLowerCase().includes(docSearch.toLowerCase()))
                            )
                          : docItems
                        return filtered.length === 0 ? (
                        <div className="p-12 text-center">
                          <p className="text-gray-400">{docSearch ? 'Item tidak ditemukan' : 'Belum ada item dokumentasi'}</p>
                          <p className="text-sm text-gray-400 mt-1">{docSearch ? 'Coba kata kunci lain' : 'Tambah item atau import dari file'}</p>
                        </div>
                      ) : (
                        <div>
                          {filtered.map((item, idx) => (
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
                      )
                    })()}
                    </div>
                  )}
                </div>
                </>)}

                {/* Review per Lokasi */}
                {docsTab === 'review' && (
                  <div className="space-y-4">
                    {/* Summary Cards per Location */}
                    {(() => {
                      const locMap = new Map()
                      docUploads.forEach(u => {
                        if (u.location_id) {
                          if (!locMap.has(u.location_id)) {
                            locMap.set(u.location_id, {
                              id: u.location_id,
                              name: u.location_name,
                              site_id: u.site_id,
                              technician: u.user_name,
                              visit_date: u.visit_date,
                              total: 0, pending: 0, approved: 0, rejected: 0
                            })
                          }
                          const entry = locMap.get(u.location_id)
                          entry.total++
                          if (u.review_status === 'pending') entry.pending++
                          if (u.review_status === 'approved') entry.approved++
                          if (u.review_status === 'rejected') entry.rejected++
                        }
                      })
                      const locations = [...locMap.values()]

                      if (locations.length === 0) {
                        return (
                          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-400">Belum ada dokumentasi dari teknisi</p>
                          </div>
                        )
                      }

                      const selectedLocation = reviewLocationId
                        ? locations.find(l => l.id === reviewLocationId)
                        : null

                      // If location selected, show detailed view
                      if (selectedLocation) {
                        const locUploads = docUploads.filter(u => u.location_id === selectedLocation.id)
                        const filteredUploads = locUploads.filter(u => u.review_status === reviewTab)

                        return (
                          <div className="space-y-4">
                            {/* Back button + location header */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => setReviewLocationId(null)}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7-7l-7 7 7 7" />
                                  </svg>
                                </button>
                                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                                  <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedLocation.name}</h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedLocation.site_id && <span className="font-mono text-secondary">{selectedLocation.site_id}</span>}
                                    {selectedLocation.site_id && selectedLocation.technician && <span> • </span>}
                                    {selectedLocation.technician && <span>Teknisi: {selectedLocation.technician}</span>}
                                    {selectedLocation.visit_date && <span> • {selectedLocation.visit_date}</span>}
                                  </p>
                                </div>
                              </div>
                              {/* Mini stats */}
                              <div className="flex gap-3 mt-4">
                                <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs font-medium text-yellow-700 dark:text-yellow-400">
                                  {selectedLocation.pending} Menunggu
                                </div>
                                <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs font-medium text-green-700 dark:text-green-400">
                                  {selectedLocation.approved} Disetujui
                                </div>
                                <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs font-medium text-red-700 dark:text-red-400">
                                  {selectedLocation.rejected} Ditolak
                                </div>
                                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-500">
                                  {selectedLocation.total} Total
                                </div>
                              </div>
                            </div>

                            {/* Status Tabs */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 flex gap-2">
                              {['pending', 'approved', 'rejected'].map(tab => {
                                const count = locUploads.filter(u => u.review_status === tab).length
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

                            {/* Uploads List */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                              {filteredUploads.length === 0 ? (
                                <div className="p-12 text-center">
                                  <p className="text-gray-400">Tidak ada dokumen dengan status ini</p>
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {filteredUploads.map((upload) => (
                                    <div key={upload.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                      <div className="flex items-start gap-4">
                                        <div
                                          className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                          onClick={() => {
                                            setLightboxUpload(upload)
                                            setLightboxTempNote('')
                                            setLightboxOpen(true)
                                          }}
                                        >
                                          {upload.file_type?.startsWith('image/') ? (
                                            <img src={`/api/documentation/download/${upload.file_name}`} alt={upload.item_name} className="w-full h-full object-cover" />
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
                                          </div>
                                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{upload.user_name} • {new Date(upload.uploaded_at).toLocaleString('id-ID')}</p>
                                          <p className="text-xs text-gray-400 mt-1 truncate">{upload.file_name}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                          {upload.review_status === 'pending' && (
                                            <>
                                              <input
                                                type="text"
                                                value={reviewNote}
                                                onChange={(e) => setReviewNote(e.target.value)}
                                                placeholder="Catatan (opsional)"
                                                className="w-48 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-secondary"
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleReview(upload.id, 'approved')}
                                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                  Setujui
                                                </button>
                                                <button
                                                  onClick={() => handleReview(upload.id, 'rejected')}
                                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                                >
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
                        )
                      }

                      // Summary cards view
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {locations.map(loc => (
                            <div
                              key={loc.id}
                              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-secondary/30 transition-all cursor-pointer group"
                              onClick={() => setReviewLocationId(loc.id)}
                            >
                              <div className="p-5">
                                <div className="flex items-start gap-3 mb-4">
                                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                                    <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{loc.name}</h4>
                                    {loc.site_id && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary/10 text-secondary mt-0.5">
                                        {loc.site_id}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>{loc.technician}</span>
                                  </div>
                                  {loc.visit_date && (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{loc.visit_date}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Stats */}
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                                  <div className={`flex-1 text-center py-2 rounded-lg ${loc.pending > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    <p className={`text-lg font-bold ${loc.pending > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>{loc.pending}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Menunggu</p>
                                  </div>
                                  <div className={`flex-1 text-center py-2 rounded-lg ${loc.approved > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    <p className={`text-lg font-bold ${loc.approved > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>{loc.approved}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Disetujui</p>
                                  </div>
                                  <div className={`flex-1 text-center py-2 rounded-lg ${loc.rejected > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                    <p className={`text-lg font-bold ${loc.rejected > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{loc.rejected}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Ditolak</p>
                                  </div>
                                </div>

                                <button
                                  className="mt-4 w-full py-2.5 bg-secondary hover:bg-secondary-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Review
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}
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

      case 'chat':
        const techUsers = users.filter(u => u.role === 'technician')
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Chat Pribadi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {techUsers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Tidak ada teknisi</p>
                ) : (
                  techUsers.map((tech) => {
                    const active = chatTechnician?.id === tech.id
                    return (
                      <button
                        key={tech.id}
                        onClick={() => setChatTechnician({ id: tech.id, name: tech.name })}
                        className={`w-full p-4 rounded-lg text-left transition-all border ${
                          active
                            ? 'bg-secondary/10 border-secondary'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 dark:text-gray-300 font-semibold">{tech.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-white truncate">{tech.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{tech.email}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="h-[500px]">
                {chatTechnician ? (
                  <ChatBox
                    key={chatTechnician.id}
                    targetUser={chatTechnician}
                    onClose={() => setChatTechnician(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">Pilih teknisi untuk mulai chat</p>
                  </div>
                )}
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
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#1C1917] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? 'w-60 translate-x-0' : 'w-[76px] -translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-2.5 border-b border-white/5 ${navOpen ? 'h-16 px-4' : 'h-16 justify-center px-0'}`}>
          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[#FAF6EC] text-sm font-bold text-[#14532D]">
            A
          </div>
          {navOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#FAF6EC]">Absensi</p>
              <p className="text-[11px] text-[#78716C]">Panel admin</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto ${navOpen ? 'px-3 py-4' : 'px-2 py-4'}`}>
          {[
            { label: 'Operasional', ids: ['chat', 'attendance', 'technicians'] },
            { label: 'Manajemen', ids: ['reports', 'locations', 'settings', 'profile'] },
          ].map((group) => (
            <div key={group.label} className="mb-6 last:mb-0">
              {navOpen && (
                <p className="mb-2 px-2 text-[10px] tracking-[0.12em] text-[#6B625A]">{group.label.toUpperCase()}</p>
              )}
              <div className="space-y-1">
                {group.ids.map((id) => {
                  const item = menuItems.find((m) => m.id === id)
                  if (!item) return null
                  const active = activeMenu === id
                  const badge = id === 'chat' ? unreadChats : id === 'attendance' ? attentionCount : 0
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveMenu(id)
                        if (window.innerWidth < 1024) setNavOpen(false)
                      }}
                      title={navOpen ? undefined : item.label}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-lg transition-colors ${
                        navOpen ? 'px-3 py-2' : 'justify-center px-0 py-2'
                      } ${
                        active
                          ? 'bg-[#14532D] text-[#FAF6EC]'
                          : 'text-[#A8A29E] hover:bg-white/5 hover:text-[#FAF6EC]'
                      }`}
                    >
                      {item.icon}
                      {navOpen && <span className="flex-1 text-left text-[13px] font-medium">{item.label}</span>}
                      {badge > 0 &&
                        (navOpen ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                              id === 'attendance'
                                ? 'bg-[#F2C230] text-[#3F2D00]'
                                : 'bg-white/10 text-[#C4BCB2]'
                            }`}
                          >
                            {badge}
                          </span>
                        ) : (
                          <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-[#F2C230]" />
                        ))}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`space-y-1 border-t border-white/5 ${navOpen ? 'p-3' : 'px-2 py-3'}`}>
          <button
            onClick={() => setActiveMenu('profile')}
            className={`flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-white/5 ${
              navOpen ? '' : 'justify-center'
            }`}
          >
            <div className="grid h-8 w-8 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[#14532D] text-xs font-semibold text-[#FAF6EC]">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            {navOpen && (
              <div className="min-w-0 text-left">
                <p className="truncate text-[13px] text-[#FAF6EC]">{user.name}</p>
                <p className="text-[11px] text-[#78716C]">Administrator</p>
              </div>
            )}
          </button>

          <button
            onClick={() => setNavOpen(!navOpen)}
            className={`hidden w-full items-center gap-2.5 rounded-lg p-2 text-[#A8A29E] transition-colors hover:bg-white/5 hover:text-[#FAF6EC] lg:flex ${
              navOpen ? '' : 'justify-center'
            }`}
            aria-label={navOpen ? 'Tutup menu' : 'Buka menu'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={navOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'}
              />
            </svg>
            {navOpen && <span className="text-[13px]">Tutup menu</span>}
          </button>

          <button
            onClick={logout}
            className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-[#A8A29E] transition-colors hover:bg-white/5 hover:text-[#FAF6EC] ${
              navOpen ? '' : 'justify-center'
            }`}
            aria-label="Keluar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {navOpen && <span className="text-[13px]">Keluar</span>}
          </button>

          <div className={navOpen ? '' : 'flex justify-center'}>
            <NotificationBell onNotificationClick={handleNotificationClick} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 sm:p-8">
                <div className="mx-auto max-w-[1440px]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setNavOpen(true)}
                className="mt-0.5 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 lg:hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                aria-label="Buka menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {menuItems.find((m) => m.id === activeMenu)?.label}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {
                    {
                      chat: 'Chat pribadi dengan teknisi',
                      attendance: 'Kelola data absensi teknisi',
                      technicians: 'Daftar semua teknisi terdaftar',
                      reports: 'Statistik dan ringkasan data',
                      locations: 'Upload dan kelola data lokasi',
                      profile: 'Kelola informasi profil Anda',
                      settings: 'Konfigurasi aplikasi',
                    }[activeMenu]
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
            </div>
          </div>
          {renderContent()}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && reviewAssignment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review Dokumentasi</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {reviewAssignment.location_name} • {reviewAssignment.user_name} • {reviewAssignment.visit_date}
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bulk Actions */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Aksi Massal:</span>
              <button
                onClick={() => handleBulkReview('approved')}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Setujui Semua
              </button>
              <button
                onClick={() => handleBulkReview('rejected')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Tolak Semua
              </button>
              <div className="flex-1"></div>
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Catatan review (opsional)"
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50 w-64"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {reviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-3 text-gray-500">Memuat dokumentasi...</span>
                </div>
              ) : reviewAssignmentUploads.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">Belum ada dokumentasi yang diupload</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewAssignmentUploads.map((upload) => (
                    <div key={upload.id} className={`rounded-xl border overflow-hidden transition-all ${
                      upload.review_status === 'approved' ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10' :
                      upload.review_status === 'rejected' ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' :
                      'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}>
                      <div className="flex flex-col md:flex-row">
                        {/* Image Preview */}
                        <div className="md:w-1/2 bg-gray-100 dark:bg-gray-900 relative min-h-[200px]">
                          {upload.file_type?.startsWith('image/') ? (
                            <img
                              src={`/api/documentation/download/${upload.file_name}`}
                              alt={upload.item_name}
                              className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setLightboxUpload(upload)
                                setLightboxTempNote('')
                                setLightboxOpen(true)
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm text-gray-500 mt-2">{upload.file_name}</span>
                            </div>
                          )}
                          <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                            upload.review_status === 'approved' ? 'bg-green-500 text-white' :
                            upload.review_status === 'rejected' ? 'bg-red-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>
                            {upload.review_status === 'approved' ? 'Disetujui' :
                             upload.review_status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                          </div>
                        </div>
                        
                        {/* Details & Actions */}
                        <div className="md:w-1/2 p-5 flex flex-col">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-white text-lg">{upload.item_name}</h4>
                            {upload.item_description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{upload.item_description}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              File: {upload.file_name}
                            </p>
                            
                            {upload.review_status === 'rejected' && upload.review_note && (
                              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Catatan Penolakan:</p>
                                <p className="text-sm text-red-700 dark:text-red-300 italic">"{upload.review_note}"</p>
                              </div>
                            )}
                            
                            {upload.review_status === 'approved' && upload.review_note && (
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Catatan Persetujuan:</p>
                                <p className="text-sm text-green-700 dark:text-green-300 italic">"{upload.review_note}"</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Review Actions */}
                          {upload.review_status === 'pending' && (
                            <div className="mt-4 space-y-3">
                              <input
                                type="text"
                                value={upload._reviewNote || ''}
                                onChange={(e) => {
                                  const updated = reviewAssignmentUploads.map(u => 
                                    u.id === upload.id ? { ...u, _reviewNote: e.target.value } : u
                                  )
                                  setReviewAssignmentUploads(updated)
                                }}
                                placeholder="Catatan untuk foto ini (opsional)"
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    const note = upload._reviewNote || reviewNote
                                    try {
                                      await api.put(`/documentation/review/${upload.id}`, {
                                        review_status: 'approved',
                                        review_note: note
                                      })
                                    } catch (err) {
                                      console.error(err)
                                    }
                                    loadReviewAssignmentUploads(reviewAssignment.id)
                                    loadDocUploads()
                                  }}
                                  className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Setujui Foto
                                </button>
                                <button
                                  onClick={async () => {
                                    const note = upload._reviewNote || reviewNote
                                    if (!note) {
                                      toast.warning('Masukkan catatan penolakan')
                                      return
                                    }
                                    try {
                                      await api.put(`/documentation/review/${upload.id}`, {
                                        review_status: 'rejected',
                                        review_note: note
                                      })
                                    } catch (err) {
                                      console.error(err)
                                    }
                                    loadReviewAssignmentUploads(reviewAssignment.id)
                                    loadDocUploads()
                                  }}
                                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Tolak Foto
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {upload.review_status === 'approved' && (
                            <div className="mt-4">
                              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Foto Disetujui
                              </span>
                            </div>
                          )}
                          
                          {upload.review_status === 'rejected' && (
                            <div className="mt-4">
                              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Foto Ditolak
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {reviewAssignmentUploads.filter(u => u.review_status === 'pending').length} menunggu review • 
                {reviewAssignmentUploads.filter(u => u.review_status === 'approved').length} disetujui • 
                {reviewAssignmentUploads.filter(u => u.review_status === 'rejected').length} ditolak
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="px-6 py-2 bg-secondary hover:bg-secondary-dark text-white font-medium rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && lightboxUpload && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full hover:bg-white/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Title & Status Dropdown */}
            <div 
              className="absolute -top-12 left-0 text-white font-medium flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{lightboxUpload.item_name}</span>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <select
                  value={lightboxUpload.review_status}
                  onChange={(e) => {
                    const newStatus = e.target.value
                    if (newStatus === lightboxUpload.review_status) return
                    
                    setLightboxUpload(prev => ({ ...prev, review_status: newStatus, _needsSave: true }))
                    setLightboxTempNote('')
                  }}
                  className={`appearance-none px-3 py-1 pr-6 rounded-full text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 border-0 ${
                    lightboxUpload.review_status === 'approved' ? 'bg-green-500 text-white' :
                    lightboxUpload.review_status === 'rejected' ? 'bg-red-500 text-white' :
                    'bg-yellow-500 text-white'
                  }`}
                >
                  <option value="pending" className="bg-gray-800 text-white">Menunggu</option>
                  <option value="approved" className="bg-gray-800 text-white">Disetujui</option>
                  <option value="rejected" className="bg-gray-800 text-white">Ditolak</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Image */}
            <img
              src={`/api/documentation/download/${lightboxUpload.file_name}`}
              alt={lightboxUpload.item_name}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Actions */}
            <div className="mt-4 flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
              {/* Download */}
              <a
                href={`/api/documentation/download/${lightboxUpload.file_name}`}
                download
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              
              {/* Note input & Save button - show when status changed */}
              {lightboxUpload._needsSave && (
                <>
                  <input
                    type="text"
                    value={lightboxTempNote}
                    onChange={(e) => setLightboxTempNote(e.target.value)}
                    placeholder={lightboxUpload.review_status === 'rejected' ? 'Alasan penolakan (wajib)...' : 'Catatan (opsional)'}
                    className="px-3 py-2 bg-white/10 text-white placeholder-white/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/50 w-56"
                  />
                  <button
                    onClick={async () => {
                      if (lightboxUpload.review_status === 'rejected' && !lightboxTempNote.trim()) {
                        toast.warning('Alasan penolakan wajib diisi')
                        return
                      }
                      try {
                        await api.put(`/documentation/review/${lightboxUpload.id}`, {
                          review_status: lightboxUpload.review_status,
                          review_note: lightboxTempNote
                        })
                        setLightboxUpload(prev => ({ ...prev, review_note: lightboxTempNote, _needsSave: false }))
                        setLightboxTempNote('')
                        loadReviewAssignmentUploads(reviewAssignment.id)
                        loadDocUploads()
                      } catch (err) {
                        console.error('Review error:', err)
                        toast.error('Gagal menyimpan review')
                      }
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan
                  </button>
                </>
              )}
              
              {/* Already reviewed - show note */}
              {lightboxUpload.review_note && !lightboxUpload._needsSave && (
                <div className={`px-3 py-1.5 rounded-lg text-sm ${
                  lightboxUpload.review_status === 'approved' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  <span className="opacity-70">Catatan:</span> "{lightboxUpload.review_note}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {warningModalOpen && warningTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Ikon name="peringatan" className="w-5 h-5" />Teguran / Permintaan Keterangan</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Untuk: {warningTarget.name} | Tanggal: {selectedDate}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipe Pesan</label>
                <select
                  value={warningType}
                  onChange={(e) => setWarningType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                >
                  <option value="request_explanation">Minta Keterangan</option>
                  <option value="reprimand">Teguran</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pesan</label>
                <textarea
                  value={warningMessage}
                  onChange={(e) => setWarningMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  placeholder={warningType === 'reprimand' 
                    ? "Tuliskan pesan teguran..." 
                    : "Tuliskan permintaan keterangan..."}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setWarningModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={sendWarning}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excuses Review Modal */}
      {excuses.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2"><Ikon name="catatan" className="w-4 h-4" />Alasan Menunggu Review</h4>
              <p className="text-xs text-amber-600 dark:text-amber-400">{excuses.length} pengajuan</p>
            </div>
            <div className="overflow-y-auto max-h-64 p-2">
              {excuses.map(excuse => (
                <div key={excuse.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800 dark:text-white text-sm">{excuse.user_name}</span>
                    <span className="text-xs text-gray-400">{excuse.attendance_date}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Alasan:</span> {
                      excuse.reason === 'sakit' ? 'Sakit' :
                      excuse.reason === 'acara_keluarga' ? 'Acara Keluarga' :
                      excuse.reason === 'kendala_lapangan' ? 'Kendala Lapangan' :
                      'Lainnya'
                    }
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{excuse.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExcuseReview(excuse.id, 'approved')}
                      className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Terima
                    </button>
                    <button
                      onClick={() => handleExcuseReview(excuse.id, 'rejected')}
                      className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
