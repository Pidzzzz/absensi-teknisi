import { useState, useEffect, useCallback } from 'react'

export function useOffline(checkInterval = 30000) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [lastChecked, setLastChecked] = useState(null)

  const checkServer = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('/api/auth/users', {
        method: 'HEAD',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      setIsOffline(!response.ok)
      setLastChecked(new Date())
    } catch {
      setIsOffline(true)
      setLastChecked(new Date())
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      checkServer()
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = setInterval(checkServer, checkInterval)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [checkInterval, checkServer])

  return { isOffline, lastChecked, recheck: checkServer }
}
