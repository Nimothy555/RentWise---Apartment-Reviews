const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

const VALID_REASONS = ['spam', 'harassment', 'inaccurate', 'other']

// POST /flags/reviews/:reviewId
router.post('/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    if (isNaN(reviewId)) return res.status(400).json({ error: 'Invalid review ID' })
    const { reason } = req.body
    if (!reason || !VALID_REASONS.includes(reason)) return res.status(400).json({ error: 'Reason must be one of: spam, harassment, inaccurate, other' })
    const existing = await db.getAsync('SELECT id FROM review_flags WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id])
    if (existing) return res.status(409).json({ error: 'You already flagged this review' })
    await db.runAsync('INSERT INTO review_flags (review_id, user_id, reason) VALUES (?, ?, ?)', [reviewId, req.user.id, reason])
    res.status(201).json({ message: 'Review flagged' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to flag review' })
  }
})

// DELETE /flags/reviews/:reviewId — unflag
router.delete('/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    await db.runAsync('DELETE FROM review_flags WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id])
    res.json({ message: 'Flag removed' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove flag' })
  }
})

module.exports = router
