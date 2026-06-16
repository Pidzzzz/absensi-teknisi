const ATTENDANCE_KEY = 'attendance_records'
const MAX_RECORDS = 500
const STORAGE_WARNING_THRESHOLD = 0.8

function getStorageUsage() {
  let total = 0
  for (let key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += localStorage.getItem(key).length * 2
    }
  }
  return total / (1024 * 1024)
}

function isStorageNearLimit() {
  try {
    const usage = getStorageUsage()
    const maxStorage = 5
    return usage / maxStorage > STORAGE_WARNING_THRESHOLD
  } catch {
    return false
  }
}

function cleanupOldRecords() {
  const records = getAttendanceRecords()
  if (records.length > MAX_RECORDS) {
    const sorted = records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const trimmed = sorted.slice(-MAX_RECORDS)
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(trimmed))
    return records.length - trimmed.length
  }
  return 0
}

export function getAttendanceRecords() {
  try {
    const records = localStorage.getItem(ATTENDANCE_KEY)
    return records ? JSON.parse(records) : []
  } catch (error) {
    console.error('Failed to parse attendance records:', error)
    localStorage.removeItem(ATTENDANCE_KEY)
    return []
  }
}

export function saveAttendanceRecord(record) {
  const records = getAttendanceRecords()
  
  if (isStorageNearLimit()) {
    cleanupOldRecords()
  }

  const newRecord = {
    ...record,
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    synced: false,
    created_at: new Date().toISOString()
  }
  records.push(newRecord)
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records))
  return newRecord
}

export function getUnsyncedRecords() {
  const records = getAttendanceRecords()
  return records.filter(r => !r.synced)
}

export function getUnsyncedCount() {
  return getUnsyncedRecords().length
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

export function clearAllRecords() {
  localStorage.removeItem(ATTENDANCE_KEY)
}

export function getStorageInfo() {
  const records = getAttendanceRecords()
  const unsynced = records.filter(r => !r.synced)
  return {
    total: records.length,
    unsynced: unsynced.length,
    synced: records.length - unsynced.length,
    nearLimit: isStorageNearLimit()
  }
}
