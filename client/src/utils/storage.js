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
