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
        className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary-dark disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Sync Data'}
      </button>
      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  )
}
