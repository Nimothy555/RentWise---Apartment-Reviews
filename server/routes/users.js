const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

// GET /users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT id, first_name, last_name, email, role, is_verified, phone, phone_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    )
    const reviews = await db.allAsync(`
      SELECT r.id, r.rating_overall, r.rating_safety, r.rating_management,
             r.title, r.review_text, r.created_at,
             a.id as apartment_id, a.name as apartment_name, a.city, a.state
      FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      JOIN apartments a ON a.id = v.apartment_id
      WHERE v.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id])
    res.json({ ...user, reviews })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// PATCH /users/me/display-name
router.patch('/me/display-name', requireAuth, async (req, res) => {
  const { default_display_name } = req.body
  try {
    await db.runAsync(
      'UPDATE users SET default_display_name = ? WHERE id = ?',
      [default_display_name?.trim() || null, req.user.id]
    )
    res.json({ default_display_name: default_display_name?.trim() || null })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update display name' })
  }
})

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT id, first_name, last_name, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    )
    if (!user) return res.status(404).json({ error: 'User not found' })

    const reviews = await db.allAsync(`
      SELECT r.id, r.rating_overall, r.rating_safety, r.rating_management,
             r.title, r.review_text, r.created_at,
             a.id as apartment_id, a.name as apartment_name, a.city, a.state
      FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      JOIN apartments a ON a.id = v.apartment_id
      WHERE v.user_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id])
    res.json({ ...user, reviews })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

module.exports = router
