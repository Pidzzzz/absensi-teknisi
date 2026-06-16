import { useState } from 'react'
import api from '../utils/api'
import { getUnsyncedRecords, markRecordsSynced, getUnsyncedCount, clearSyncedRecords } from '../utils/storage'
import { useOffline } from '../hooks/useOffline'

export default function SyncButton({ onSyncComplete }) {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const { isOffline } = useOffline()
  const unsyncedCount = getUnsyncedCount()

  const handleSync = async () => {
    if (isOffline) {
      setMessage('Tidak dapat sync: server tidak tersedia')
      setMessageType('error')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setSyncing(true)
    setMessage('')
    
    try {
      const unsynced = getUnsyncedRecords()
      
      if (unsynced.length === 0) {
        setMessage('Tidak ada data yang perlu disinkronkan')
        setMessageType('info')
        setSyncing(false)
        setTimeout(() => setMessage(''), 3000)
        return
      }
      
      await api.post('/attendance/sync', { records: unsynced })
      markRecordsSynced(unsynced.map(r => r.id))
      clearSyncedRecords()
      
      setMessage(`Berhasil sync ${unsynced.length} data`)
      setMessageType('success')
      onSyncComplete?.()
    } catch (error) {
      if (error.code === 'ECONNABORTED' || !error.response) {
        setMessage('Gagal sync: periksa koneksi internet')
      } else {
        setMessage('Gagal sync: ' + (error.response?.data?.error || 'Server error'))
      }
      setMessageType('error')
    } finally {
      setSyncing(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing || isOffline}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isOffline
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : syncing
            ? 'bg-secondary/70 text-white cursor-wait'
            : 'bg-secondary text-white hover:bg-secondary-dark'
        }`}
      >
        {syncing ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </>
        )}
      </button>
      
      {unsyncedCount > 0 && (
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          isOffline 
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {unsyncedCount} pending
        </span>
      )}
      
      {message && (
        <span className={`text-sm font-medium ${
          messageType === 'success' ? 'text-green-600 dark:text-green-400' :
          messageType === 'error' ? 'text-red-600 dark:text-red-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          {message}
        </span>
      )}
    </div>
  )
}
