const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

async function verifyOwnership(reviewId, landlordId) {
  return db.getAsync(`
    SELECT r.id FROM reviews r
    JOIN verifications v ON v.id = r.verification_id
    JOIN apartments a ON a.id = v.apartment_id
    WHERE r.id = ? AND a.owner_id = ?
  `, [reviewId, landlordId])
}

// POST /replies/reviews/:reviewId
router.post('/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Only landlords can reply to reviews' })
    const reviewId = parseInt(req.params.reviewId)
    if (isNaN(reviewId)) return res.status(400).json({ error: 'Invalid review ID' })
    const owns = await verifyOwnership(reviewId, req.user.id)
    if (!owns) return res.status(403).json({ error: 'You can only reply to reviews on your listings' })
    const { reply_text } = req.body
    if (!reply_text || reply_text.trim().length === 0) return res.status(400).json({ error: 'Reply text is required' })
    if (reply_text.length > 2000) return res.status(400).json({ error: 'Reply must be under 2000 characters' })
    const existing = await db.getAsync('SELECT id FROM review_replies WHERE review_id = ?', [reviewId])
    if (existing) return res.status(409).json({ error: 'You already replied to this review. Use PUT to update.' })
    await db.runAsync('INSERT INTO review_replies (review_id, landlord_id, reply_text) VALUES (?, ?, ?)', [reviewId, req.user.id, reply_text.trim()])
    res.status(201).json({ message: 'Reply posted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to post reply' })
  }
})

// PUT /replies/reviews/:reviewId
router.put('/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    const owns = await verifyOwnership(reviewId, req.user.id)
    if (!owns) return res.status(403).json({ error: 'You can only edit replies on your listings' })
    const { reply_text } = req.body
    if (!reply_text || reply_text.trim().length === 0) return res.status(400).json({ error: 'Reply text is required' })
    await db.runAsync('UPDATE review_replies SET reply_text = ? WHERE review_id = ? AND landlord_id = ?', [reply_text.trim(), reviewId, req.user.id])
    res.json({ message: 'Reply updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reply' })
  }
})

// DELETE /replies/reviews/:reviewId
router.delete('/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    const owns = await verifyOwnership(reviewId, req.user.id)
    if (!owns) return res.status(403).json({ error: 'You can only delete replies on your listings' })
    await db.runAsync('DELETE FROM review_replies WHERE review_id = ? AND landlord_id = ?', [reviewId, req.user.id])
    res.json({ message: 'Reply deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete reply' })
  }
})

module.exports = router
