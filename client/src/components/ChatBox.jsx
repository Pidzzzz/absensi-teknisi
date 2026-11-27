import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function ChatBox({ targetUser, onClose, embedded = false }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const pollRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async (convId) => {
    try {
      const res = await api.get(`/chat/messages/${convId}`)
      setMessages(res.data)
      scrollToBottom()
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [scrollToBottom])

  const findOrCreateConversation = useCallback(async () => {
    if (!targetUser) return
    setLoading(true)
    try {
      const res = await api.get(`/chat/conversations/${user.id}`)
      const existing = res.data.find(c =>
        user.role === 'admin'
          ? c.technician_id === targetUser.id
          : c.admin_id === targetUser.id
      )
      if (existing) {
        setConversationId(existing.id)
        loadMessages(existing.id)
        api.put(`/chat/read/${existing.id}/${user.id}`)
      }
    } catch (err) {
      console.error('Failed to find conversation:', err)
    } finally {
      setLoading(false)
    }
  }, [user, targetUser, loadMessages])

  useEffect(() => {
    if (targetUser) {
      findOrCreateConversation()
    }
  }, [targetUser, findOrCreateConversation])

  useEffect(() => {
    if (!conversationId) return
    pollRef.current = setInterval(() => {
      loadMessages(conversationId)
      api.put(`/chat/read/${conversationId}/${user.id}`)
    }, 3000)
    inputRef.current?.focus()
    return () => clearInterval(pollRef.current)
  }, [conversationId, user.id, loadMessages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    try {
      const res = await api.post('/chat/send', {
        sender_id: user.id,
        receiver_id: targetUser.id,
        content
      })
      setMessages(prev => [...prev, res.data])
      if (!conversationId) {
        setConversationId(res.data.conversation_id)
      }
      scrollToBottom()
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!targetUser) return null

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 ${embedded ? 'h-full' : 'h-[500px]'} rounded-xl shadow-lg border border-gray-200 dark:border-gray-700`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-secondary/5 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">{targetUser.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{targetUser.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.role === 'admin' ? 'Teknisi' : 'Admin'}
            </p>
          </div>
        </div>
        {!embedded && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Belum ada pesan</p>
            <p className="text-xs mt-1">Kirim pesan pertama untuk memulai</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === user.id
            const showAvatar = i === 0 || messages[i - 1]?.sender_id !== msg.sender_id
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : 'mt-0.5'}`}>
                <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : ''}`}>
                  {showAvatar ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${isMine ? 'bg-secondary' : 'bg-gray-400'}`}>
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}
                  <div>
                    {showAvatar && (
                      <p className={`text-xs mb-0.5 ${isMine ? 'text-right' : ''} ${isMine ? 'text-secondary' : 'text-gray-500'}`}>
                        {isMine ? 'Anda' : msg.sender_name}
                      </p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-secondary text-white rounded-br-md'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                    <p className={`text-[10px] mt-0.5 text-gray-400 ${isMine ? 'text-right' : ''}`}>
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-secondary hover:bg-secondary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Enter untuk kirim, Shift+Enter untuk baris baru</p>
      </div>
    </div>
  )
}
