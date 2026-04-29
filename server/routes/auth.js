const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../email')
const { sendOtpSms } = require('../sms')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const JWT_EXPIRES = '7d'

const loginAttempts = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function checkRateLimit(key) {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record) return true
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW) { loginAttempts.delete(key); return true }
  return record.count < MAX_ATTEMPTS
}
function recordAttempt(key) {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(key, { count: 1, firstAttempt: now })
  } else { record.count++ }
}
function clearAttempts(key) { loginAttempts.delete(key) }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function isValidPhone(phone) { return /^\+[1-9]\d{7,14}$/.test(phone) }
function generateOtp() { return Math.floor(100000 + Math.random() * 900000).toString() }

function signToken(user) {
  return jwt.sign(
    { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, is_verified: user.is_verified },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, phone } = req.body
  const role = 'renter'
  const errors = []
  if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) errors.push('First name is required')
  if (first_name && first_name.trim().length > 100) errors.push('First name must be under 100 characters')
  if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) errors.push('Last name is required')
  if (last_name && last_name.trim().length > 100) errors.push('Last name must be under 100 characters')
  if (!email || !isValidEmail(email)) errors.push('A valid email is required')
  if (!password) errors.push('Password is required')
  if (password && password.length < 8) errors.push('Password must be at least 8 characters')
  if (password && password.length > 128) errors.push('Password must be under 128 characters')
  if (phone && !isValidPhone(phone)) errors.push('Phone must be in E.164 format (e.g. +12125551234)')
  // Role is always 'renter' — landlord portal removed
  if (errors.length > 0) return res.status(400).json({ errors })

  const ip = req.ip || 'unknown'
  if (!checkRateLimit(`register:${ip}`)) return res.status(429).json({ error: 'Too many attempts.' })
  recordAttempt(`register:${ip}`)

  try {
    const existing = await db.getAsync('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    if (phone) {
      const phoneExists = await db.getAsync('SELECT id FROM users WHERE phone = ?', [phone])
      if (phoneExists) return res.status(409).json({ error: 'Phone number already in use' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const result = await db.runAsync(
      'INSERT INTO users (first_name, last_name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [first_name.trim(), last_name.trim(), email.toLowerCase().trim(), hashed, role, phone || null]
    )

    // Send verification email (non-fatal)
    try {
      const verifyToken = crypto.randomBytes(32).toString('hex')
      const otp = generateOtp()
      await db.runAsync('INSERT INTO email_tokens (user_id, token, otp) VALUES (?, ?, ?)', [result.lastID, verifyToken, otp])
      await sendVerificationEmail(email.toLowerCase().trim(), verifyToken, otp)
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message)
    }

    const user = { id: result.lastID, first_name: first_name.trim(), last_name: last_name.trim(), email: email.toLowerCase().trim(), role, is_verified: 0 }
    const token = signToken(user)
    res.status(201).json({ message: 'Account created', token, user: { id: user.id, first_name: user.first_name, last_name: user.last_name, role: user.role, is_verified: user.is_verified } })
  } catch (err) {
    res.status(500).json({ error: 'Failed to register' })
  }
})

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const ip = req.ip || 'unknown'
  if (!checkRateLimit(`login:${ip}`)) return res.status(429).json({ error: 'Too many login attempts.' })
  recordAttempt(`login:${ip}`)

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Invalid email or password' })

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox for the verification link.' })
    }

    clearAttempts(`login:${ip}`)
    const token = signToken(user)
    res.json({ message: 'Logged in', token, user: { id: user.id, first_name: user.first_name, last_name: user.last_name, role: user.role, is_verified: user.is_verified } })
  } catch (err) {
    res.status(500).json({ error: 'Failed to login' })
  }
})

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

// GET /auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not logged in' })
  try {
    const user = jwt.verify(authHeader.slice(7), JWT_SECRET)
    res.json({ user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, is_verified: user.is_verified } })
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
})

// PUT /auth/password
router.put('/password', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Login required' })

  let currentUser
  try { currentUser = jwt.verify(authHeader.slice(7), JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }) }

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' })
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })

  try {
    const user = await db.getAsync('SELECT * FROM users WHERE id = ?', [currentUser.id])
    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [hashed, currentUser.id])
    res.json({ message: 'Password updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' })
  }
})

// GET /auth/verify/:token
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params
  try {
    const record = await db.getAsync(
      `SELECT et.*, u.email FROM email_tokens et JOIN users u ON u.id = et.user_id WHERE et.token = ?`,
      [token]
    )
    if (!record) return res.status(400).json({ error: 'Invalid or expired verification link' })
    const age = Date.now() - new Date(record.created_at).getTime()
    if (age > 24 * 60 * 60 * 1000) {
      await db.runAsync('DELETE FROM email_tokens WHERE token = ?', [token])
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' })
    }
    await db.runAsync('UPDATE users SET is_verified = 1 WHERE id = ?', [record.user_id])
    await db.runAsync('DELETE FROM email_tokens WHERE token = ?', [token])
    res.json({ message: 'Email verified successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) return res.status(400).json({ error: 'Email and code required' })
  try {
    const user = await db.getAsync('SELECT id, is_verified FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (!user || user.is_verified) return res.status(400).json({ error: 'Invalid code' })
    const record = await db.getAsync('SELECT * FROM email_tokens WHERE user_id = ? AND otp = ?', [user.id, otp.trim()])
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' })
    const age = Date.now() - new Date(record.created_at).getTime()
    if (age > 24 * 60 * 60 * 1000) {
      await db.runAsync('DELETE FROM email_tokens WHERE id = ?', [record.id])
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' })
    }
    await db.runAsync('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id])
    await db.runAsync('DELETE FROM email_tokens WHERE user_id = ?', [user.id])
    const fullUser = await db.getAsync('SELECT * FROM users WHERE id = ?', [user.id])
    const token = signToken(fullUser)
    res.json({ message: 'Email verified successfully', token })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' })
  }
})

// POST /auth/resend-verification (requires auth token)
router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    const user = await db.getAsync('SELECT id, email, is_verified FROM users WHERE id = ?', [req.user.id])
    if (user.is_verified) return res.status(400).json({ error: 'Email is already verified' })
    const existing = await db.getAsync('SELECT created_at FROM email_tokens WHERE user_id = ?', [req.user.id])
    if (existing) {
      const age = Date.now() - new Date(existing.created_at).getTime()
      if (age < 60 * 1000) return res.status(429).json({ error: 'Please wait before requesting another verification email' })
    }
    await db.runAsync('DELETE FROM email_tokens WHERE user_id = ?', [req.user.id])
    const token = crypto.randomBytes(32).toString('hex')
    const otp = generateOtp()
    await db.runAsync('INSERT INTO email_tokens (user_id, token, otp) VALUES (?, ?, ?)', [req.user.id, token, otp])
    await sendVerificationEmail(user.email, token, otp).catch(e => console.error('Email error:', e))
    res.json({ message: 'Verification email sent' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email' })
  }
})

// POST /auth/resend-verification-by-email (no auth required — for unverified users on login page)
router.post('/resend-verification-by-email', async (req, res) => {
  const { email } = req.body
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required' })
  try {
    const user = await db.getAsync('SELECT id, email, is_verified FROM users WHERE email = ?', [email.toLowerCase().trim()])
    // Always respond success to avoid user enumeration
    if (!user || user.is_verified) return res.json({ message: 'If that email exists and is unverified, a new link has been sent.' })
    const existing = await db.getAsync('SELECT created_at FROM email_tokens WHERE user_id = ?', [user.id])
    if (existing) {
      const age = Date.now() - new Date(existing.created_at).getTime()
      if (age < 60 * 1000) return res.json({ message: 'If that email exists and is unverified, a new link has been sent.' })
    }
    await db.runAsync('DELETE FROM email_tokens WHERE user_id = ?', [user.id])
    const token = crypto.randomBytes(32).toString('hex')
    const otp = generateOtp()
    await db.runAsync('INSERT INTO email_tokens (user_id, token, otp) VALUES (?, ?, ?)', [user.id, token, otp])
    await sendVerificationEmail(user.email, token, otp).catch(e => console.error('Resend email error:', e))
    res.json({ message: 'If that email exists and is unverified, a new link has been sent.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email' })
  }
})

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required' })

  try {
    const user = await db.getAsync('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()])
    // Always respond success to avoid email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' })

    // Rate-limit: one reset email per 60 seconds
    const existing = await db.getAsync('SELECT created_at FROM password_reset_tokens WHERE user_id = ?', [user.id])
    if (existing) {
      const age = Date.now() - new Date(existing.created_at).getTime()
      if (age < 60 * 1000) return res.json({ message: 'If that email exists, a reset link has been sent.' })
      await db.runAsync('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id])
    }

    const token = crypto.randomBytes(32).toString('hex')
    await db.runAsync('INSERT INTO password_reset_tokens (user_id, token) VALUES (?, ?)', [user.id, token])
    await sendPasswordResetEmail(email.toLowerCase().trim(), token).catch(e => console.error('Reset email error:', e))
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// POST /auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params
  const { password } = req.body
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
  if (password.length > 128) return res.status(400).json({ error: 'Password must be under 128 characters' })

  try {
    const record = await db.getAsync('SELECT * FROM password_reset_tokens WHERE token = ?', [token])
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' })

    const age = Date.now() - new Date(record.created_at).getTime()
    if (age > 60 * 60 * 1000) {
      await db.runAsync('DELETE FROM password_reset_tokens WHERE token = ?', [token])
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' })
    }

    const hashed = await bcrypt.hash(password, 10)
    await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [hashed, record.user_id])
    await db.runAsync('DELETE FROM password_reset_tokens WHERE token = ?', [token])
    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// POST /auth/send-phone-otp
router.post('/send-phone-otp', async (req, res) => {
  const { phone } = req.body
  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'A valid phone number is required (e.g. +12125551234)' })
  }

  const ip = req.ip || 'unknown'
  if (!checkRateLimit(`phone-otp:${ip}`)) return res.status(429).json({ error: 'Too many attempts. Please wait.' })
  recordAttempt(`phone-otp:${ip}`)

  try {
    const user = await db.getAsync('SELECT id FROM users WHERE phone = ?', [phone])
    // Always respond success to avoid phone enumeration
    if (!user) return res.json({ message: 'If that number is registered, a code has been sent.' })

    const existing = await db.getAsync('SELECT created_at FROM phone_otps WHERE phone = ?', [phone])
    if (existing) {
      const age = Date.now() - new Date(existing.created_at).getTime()
      if (age < 60 * 1000) return res.json({ message: 'If that number is registered, a code has been sent.' })
      await db.runAsync('DELETE FROM phone_otps WHERE phone = ?', [phone])
    }

    const otp = generateOtp()
    await db.runAsync('INSERT INTO phone_otps (phone, otp) VALUES (?, ?)', [phone, otp])
    await sendOtpSms(phone, otp)
    res.json({ message: 'If that number is registered, a code has been sent.' })
  } catch (err) {
    console.error('Phone OTP error:', err.message)
    res.status(500).json({ error: 'Failed to send code' })
  }
})

// POST /auth/login-phone
router.post('/login-phone', async (req, res) => {
  const { phone, otp } = req.body
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and code required' })

  try {
    const record = await db.getAsync('SELECT * FROM phone_otps WHERE phone = ? AND otp = ?', [phone, otp.trim()])
    if (!record) return res.status(401).json({ error: 'Invalid or expired code' })

    const age = Date.now() - new Date(record.created_at).getTime()
    if (age > 10 * 60 * 1000) {
      await db.runAsync('DELETE FROM phone_otps WHERE phone = ?', [phone])
      return res.status(401).json({ error: 'Code has expired. Please request a new one.' })
    }

    const user = await db.getAsync('SELECT * FROM users WHERE phone = ?', [phone])
    if (!user) return res.status(401).json({ error: 'Invalid or expired code' })

    await db.runAsync('DELETE FROM phone_otps WHERE phone = ?', [phone])
    clearAttempts(`phone-otp:${req.ip || 'unknown'}`)

    const token = signToken(user)
    res.json({ message: 'Logged in', token, user: { id: user.id, first_name: user.first_name, last_name: user.last_name, role: user.role, is_verified: user.is_verified } })
  } catch (err) {
    res.status(500).json({ error: 'Failed to login' })
  }
})

module.exports = router
