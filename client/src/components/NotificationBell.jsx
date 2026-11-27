import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function NotificationBell({ onNotificationClick }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()

    const interval = setInterval(() => {
      loadUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await api.get(`/auth/notifications/${user.id}`)
      setNotifications(response.data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await api.get(`/auth/notifications/${user.id}/unread`)
      setUnreadCount(response.data.count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.put(`/auth/notifications/${id}/read`)
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put(`/auth/notifications/read-all/${user.id}`)
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Panel diposisikan terhadap viewport agar tidak terpotong di sidebar kiri
  // maupun di header kanan.
  const toggle = () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = Math.min(320, window.innerWidth - 16)
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 8,
    )
    const openUp = rect.top > window.innerHeight / 2

    setPosition(
      openUp
        ? { left, width, bottom: window.innerHeight - rect.top + 8 }
        : { left, width, top: rect.bottom + 8 },
    )
    setIsOpen(true)
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && position && createPortal(
        <div
          ref={panelRef}
          style={{
            left: position.left,
            width: position.width,
            top: position.top,
            bottom: position.bottom,
          }}
          className={`fixed z-[100] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            position.top ? '' : 'max-h-[70vh]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="whitespace-nowrap text-xs font-medium text-[#14532D] hover:underline dark:text-[#86B998]"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">Tidak ada notifikasi</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id)
                    }
                    if (onNotificationClick) {
                      onNotificationClick(notification)
                    }
                  }}
                  className={`cursor-pointer border-b border-gray-100 p-4 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${
                    !notification.is_read ? 'bg-[#FAF6EC] dark:bg-gray-700/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        !notification.is_read ? 'bg-[#14532D] dark:bg-[#86B998]' : 'bg-transparent'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium break-words text-gray-800 dark:text-white">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed break-words text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[11px] text-gray-400">
                        {new Date(notification.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
