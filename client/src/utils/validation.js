export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePassword(password) {
  const errors = []
  if (password.length < 6) errors.push('Password minimal 6 karakter')
  if (password.length > 100) errors.push('Password maksimal 100 karakter')
  return { valid: errors.length === 0, errors }
}

export function validateName(name) {
  const errors = []
  if (!name || name.trim().length === 0) errors.push('Nama wajib diisi')
  if (name && name.length < 2) errors.push('Nama minimal 2 karakter')
  if (name && name.length > 100) errors.push('Nama maksimal 100 karakter')
  return { valid: errors.length === 0, errors }
}

export function validateLoginForm(email, password) {
  const errors = {}
  
  if (!email) {
    errors.email = 'Email wajib diisi'
  } else if (!validateEmail(email)) {
    errors.email = 'Format email tidak valid'
  }
  
  if (!password) {
    errors.password = 'Password wajib diisi'
  } else if (password.length < 6) {
    errors.password = 'Password minimal 6 karakter'
  }
  
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateRegisterForm(name, email, password) {
  const errors = {}
  
  const nameValidation = validateName(name)
  if (!nameValidation.valid) errors.name = nameValidation.errors[0]
  
  if (!email) {
    errors.email = 'Email wajib diisi'
  } else if (!validateEmail(email)) {
    errors.email = 'Format email tidak valid'
  }
  
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid) errors.password = passwordValidation.errors[0]
  
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateAssignmentForm(userId, locationId, date) {
  const errors = {}
  
  if (!userId) errors.user_id = 'Teknisi wajib dipilih'
  if (!locationId) errors.location_id = 'Lokasi wajib dipilih'
  if (!date) errors.date = 'Tanggal wajib diisi'
  
  if (date) {
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      errors.date = 'Tanggal tidak boleh di masa lalu'
    }
  }
  
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateLocationName(name) {
  if (!name || name.trim().length === 0) return { valid: false, error: 'Nama lokasi wajib diisi' }
  if (name.length > 200) return { valid: false, error: 'Nama lokasi maksimal 200 karakter' }
  return { valid: true, error: null }
}
