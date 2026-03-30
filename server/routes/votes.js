const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

// POST /votes/reviews/:reviewId — toggle helpful vote
router.post('/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    if (isNaN(reviewId)) return res.status(400).json({ error: 'Invalid review ID' })
    const existing = await db.getAsync('SELECT id FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id])
    if (existing) {
      await db.runAsync('DELETE FROM review_votes WHERE review_id = ? AND user_id = ?', [reviewId, req.user.id])
      const count = await db.getAsync('SELECT COUNT(*) as cnt FROM review_votes WHERE review_id = ?', [reviewId])
      return res.json({ voted: false, count: count.cnt })
    }
    await db.runAsync('INSERT INTO review_votes (review_id, user_id) VALUES (?, ?)', [reviewId, req.user.id])
    const count = await db.getAsync('SELECT COUNT(*) as cnt FROM review_votes WHERE review_id = ?', [reviewId])
    res.json({ voted: true, count: count.cnt })
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle vote' })
  }
})

module.exports = router
