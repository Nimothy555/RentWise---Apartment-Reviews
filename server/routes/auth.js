const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { sendVerificationEmail } = require('../email')

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

function signToken(user) {
  return jwt.sign(
    { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, is_verified: user.is_verified },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, role } = req.body
  const errors = []
  if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) errors.push('First name is required')
  if (first_name && first_name.trim().length > 100) errors.push('First name must be under 100 characters')
  if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) errors.push('Last name is required')
  if (last_name && last_name.trim().length > 100) errors.push('Last name must be under 100 characters')
  if (!email || !isValidEmail(email)) errors.push('A valid email is required')
  if (!password) errors.push('Password is required')
  if (password && password.length < 8) errors.push('Password must be at least 8 characters')
  if (password && password.length > 128) errors.push('Password must be under 128 characters')
  if (!role || !['renter', 'landlord'].includes(role)) errors.push('Role must be renter or landlord')
  if (errors.length > 0) return res.status(400).json({ errors })

  const ip = req.ip || 'unknown'
  if (!checkRateLimit(`register:${ip}`)) return res.status(429).json({ error: 'Too many attempts.' })
  recordAttempt(`register:${ip}`)

  try {
    const existing = await db.getAsync('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 10)
    const result = await db.runAsync(
      'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [first_name.trim(), last_name.trim(), email.toLowerCase().trim(), hashed, role]
    )

    // Send verification email (non-fatal)
    try {
      const verifyToken = crypto.randomBytes(32).toString('hex')
      await db.runAsync('INSERT INTO email_tokens (user_id, token) VALUES (?, ?)', [result.lastID, verifyToken])
      await sendVerificationEmail(email.toLowerCase().trim(), verifyToken)
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

// POST /auth/resend-verification
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
    await db.runAsync('INSERT INTO email_tokens (user_id, token) VALUES (?, ?)', [req.user.id, token])
    await sendVerificationEmail(user.email, token).catch(e => console.error('Email error:', e))
    res.json({ message: 'Verification email sent' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email' })
  }
})

module.exports = router
