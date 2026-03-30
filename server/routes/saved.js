const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

// GET /saved
router.get('/', requireAuth, async (req, res) => {
  try {
    const apartments = await db.allAsync(`
      SELECT a.*, ROUND(AVG(r.rating_overall), 1) as avg_rating, COUNT(DISTINCT r.id) as review_count
      FROM saved_apartments sa
      JOIN apartments a ON a.id = sa.apartment_id
      LEFT JOIN verifications v ON v.apartment_id = a.id
      LEFT JOIN reviews r ON r.verification_id = v.id
      WHERE sa.user_id = ?
      GROUP BY a.id
      ORDER BY sa.created_at DESC
    `, [req.user.id])
    res.json({ apartments })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved listings' })
  }
})

// POST /saved/:id — toggle
router.post('/:id', requireAuth, async (req, res) => {
  try {
    const aptId = parseInt(req.params.id)
    if (isNaN(aptId)) return res.status(400).json({ error: 'Invalid apartment ID' })
    const existing = await db.getAsync('SELECT id FROM saved_apartments WHERE user_id = ? AND apartment_id = ?', [req.user.id, aptId])
    if (existing) {
      await db.runAsync('DELETE FROM saved_apartments WHERE user_id = ? AND apartment_id = ?', [req.user.id, aptId])
      const count = await db.getAsync('SELECT COUNT(*) as cnt FROM saved_apartments WHERE apartment_id = ?', [aptId])
      return res.json({ saved: false, count: count.cnt })
    }
    await db.runAsync('INSERT INTO saved_apartments (user_id, apartment_id) VALUES (?, ?)', [req.user.id, aptId])
    const count = await db.getAsync('SELECT COUNT(*) as cnt FROM saved_apartments WHERE apartment_id = ?', [aptId])
    res.json({ saved: true, count: count.cnt })
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle save' })
  }
})

// GET /saved/:id/status
router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const aptId = parseInt(req.params.id)
    const existing = await db.getAsync('SELECT id FROM saved_apartments WHERE user_id = ? AND apartment_id = ?', [req.user.id, aptId])
    const count = await db.getAsync('SELECT COUNT(*) as cnt FROM saved_apartments WHERE apartment_id = ?', [aptId])
    res.json({ saved: !!existing, count: count.cnt })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch save status' })
  }
})

module.exports = router
