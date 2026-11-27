import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { validateLoginForm, validateRegisterForm } from '../utils/validation'
import Ikon from './Ikon'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isRegister, setIsRegister] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { login, register } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    let validation
    if (isRegister) {
      validation = validateRegisterForm(name, identifier, password, username)
    } else {
      validation = validateLoginForm(identifier, password)
    }

    if (!validation.valid) {
      setFieldErrors(validation.errors)
      return
    }

    try {
      if (isRegister) {
        await register(name, identifier, password, 'technician', username)
        const user = await login(identifier, password)
        navigate(user.role === 'admin' ? '/admin' : '/technician')
      } else {
        const user = await login(identifier, password)
        navigate(user.role === 'admin' ? '/admin' : '/technician')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Terjadi kesalahan, silakan coba lagi')
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, newPassword, confirmPassword })
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim request')
      }
      
      setSuccessMsg(data.message)
      setIdentifier('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'admin') {
      setIdentifier('admin@gmail.com')
      setPassword('admin123')
      setIsRegister(false)
    } else {
      setIdentifier('teknisi@gmail.com')
      setPassword('teknisi123')
      setIsRegister(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-200 dark:bg-stone-950 transition-colors p-4">
      <div className="relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md transition-colors">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Absensi Teknisi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isRegister ? 'Buat akun baru' : 'Masuk ke akun Anda'}
          </p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{successMsg}</span>
          </div>
        )}

        {/* Forgot Password Form */}
        {isForgotPassword ? (
        <form onSubmit={handleForgotPassword}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                fieldErrors.email 
                  ? 'border-red-500 focus:ring-red-500/50' 
                  : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
              }`}
              placeholder="Masukkan email Anda"
              required
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                  fieldErrors.newPassword 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
                }`}
                placeholder="Masukkan password baru"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.newPassword}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Konfirmasi Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                  fieldErrors.confirmPassword 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
                }`}
                placeholder="Ulangi password baru"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 p-3 rounded-xl mb-4 text-sm">
            <p className="font-medium mb-1 flex items-center gap-1.5"><Ikon name="peringatan" className="w-4 h-4" />Catatan Penting:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Admin</strong>: Password langsung diubah</li>
              <li><strong>Teknisi</strong>: Perlu persetujuan admin terlebih dahulu</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary hover:bg-secondary-dark text-white py-3 rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50"
          >
            {loading ? 'Mengirim...' : 'Kirim Request Ubah Password'}
          </button>
        </form>
        ) : (
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Nama</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                    fieldErrors.name 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
                  }`}
                  placeholder="Nama lengkap"
                  required
                />
                {fieldErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                    fieldErrors.username 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
                  }`}
                  placeholder="Username untuk login"
                />
                {fieldErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
                )}
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              {isRegister ? 'Email' : 'Email atau Username'}
            </label>
            <input
              type={isRegister ? 'email' : 'text'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                fieldErrors.identifier 
                  ? 'border-red-500 focus:ring-red-500/50' 
                  : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
              }`}
              placeholder={isRegister ? 'contoh@email.com' : 'Email atau Username'}
              required
            />
            {fieldErrors.identifier && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.identifier}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white ${
                  fieldErrors.password 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : 'border-gray-200 dark:border-gray-600 focus:ring-secondary/50 focus:border-secondary'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-secondary hover:bg-secondary-dark text-white py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            {isRegister ? 'Daftar Sekarang' : 'Masuk'}
          </button>
        </form>
        )}

        {/* Forgot Password Link */}
        {!isForgotPassword && !isRegister && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); setFieldErrors({}) }}
              className="text-sm text-secondary hover:text-secondary-dark hover:underline font-medium"
            >
              <span className="inline-flex items-center gap-1.5"><Ikon name="kunci" className="w-4 h-4" />Lupa Password / Ubah Password</span>
            </button>
          </div>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">atau coba demo</span>
            </div>
          </div>

          <div className="mt-4">
              <button
                type="button"
                onClick={() => fillDemo('teknisi')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Demo Teknisi
              </button>
            </div>
        </div>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          {isForgotPassword ? (
            <>
              Kembali ke
              <button
                onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); setFieldErrors({}) }}
                className="text-secondary ml-1 hover:underline font-medium"
              >
                Halaman Masuk
              </button>
            </>
          ) : isRegister ? (
            <>
              Sudah punya akun?
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); setFieldErrors({}) }}
                className="text-secondary ml-1 hover:underline font-medium"
              >
                Masuk
              </button>
            </>
          ) : (
            <>
              Belum punya akun?
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); setFieldErrors({}) }}
                className="text-secondary ml-1 hover:underline font-medium"
              >
                Daftar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
