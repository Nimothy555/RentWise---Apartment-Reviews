const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAdmin } = require('../middleware/requireAdmin')
const { sendVerificationDecisionEmail } = require('../email')

// GET /admin/reviews/suspicious — reviews with low trust signals
router.get('/reviews/suspicious', requireAdmin, async (req, res) => {
  try {
    const reviews = await db.allAsync(`
      SELECT r.id, r.title, r.review_text, r.created_at, r.rating_overall,
             COALESCE(r.display_name, u.first_name || ' ' || u.last_name) as display_name,
             u.email, u.created_at as user_created_at,
             a.name as apartment_name,
             (CASE WHEN r.rating_safety IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN r.rating_management IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN r.rating_noise IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN r.rating_value IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN r.rating_responsiveness IS NOT NULL THEN 1 ELSE 0 END +
              CASE WHEN r.rating_parking IS NOT NULL THEN 1 ELSE 0 END) as criteria_filled
      FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      JOIN users u ON u.id = v.user_id
      JOIN apartments a ON a.id = v.apartment_id
      WHERE (
        CASE WHEN r.rating_safety IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN r.rating_management IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN r.rating_noise IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN r.rating_value IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN r.rating_responsiveness IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN r.rating_parking IS NOT NULL THEN 1 ELSE 0 END
      ) = 0
      OR length(r.review_text) < 30
      ORDER BY r.created_at DESC
    `)
    res.json({ reviews })
  } catch (err) {
    console.error('GET /admin/reviews/suspicious error:', err)
    res.status(500).json({ error: 'Failed to fetch suspicious reviews' })
  }
})

// GET /admin/verifications — all pending verifications
router.get('/verifications', requireAdmin, async (req, res) => {
  try {
    const verifications = await db.allAsync(`
      SELECT v.id, v.doc_type, v.verification_status, v.document_url, v.created_at,
             u.id as user_id, u.first_name, u.last_name, u.email,
             a.id as apartment_id, a.name as apartment_name,
             a.street_address, a.city, a.state, a.zip_code
      FROM verifications v
      JOIN users u ON u.id = v.user_id
      JOIN apartments a ON a.id = v.apartment_id
      WHERE v.verification_status = 'pending'
      ORDER BY v.created_at ASC
    `)
    res.json({ verifications })
  } catch (err) {
    console.error('GET /admin/verifications error:', err)
    res.status(500).json({ error: 'Failed to fetch verifications' })
  }
})

// PATCH /admin/verifications/:id — approve or deny
router.patch('/verifications/:id', requireAdmin, async (req, res) => {
  const { status, denial_reason } = req.body
  if (!['verified', 'failed'].includes(status)) {
    return res.status(400).json({ error: 'status must be verified or failed' })
  }
  if (status === 'failed' && !denial_reason) {
    return res.status(400).json({ error: 'A denial reason is required' })
  }

  const verificationId = parseInt(req.params.id)
  if (isNaN(verificationId)) return res.status(400).json({ error: 'Invalid verification ID' })

  try {
    const verification = await db.getAsync(`
      SELECT v.id, v.user_id, v.apartment_id,
             u.first_name, u.last_name, u.email,
             a.name as apartment_name
      FROM verifications v
      JOIN users u ON u.id = v.user_id
      JOIN apartments a ON a.id = v.apartment_id
      WHERE v.id = ?
    `, [verificationId])

    if (!verification) return res.status(404).json({ error: 'Verification not found' })

    await db.runAsync(
      `UPDATE verifications SET verification_status = ? WHERE id = ?`,
      [status, verificationId]
    )

    sendVerificationDecisionEmail({
      user: { first_name: verification.first_name, last_name: verification.last_name, email: verification.email },
      apartmentName: verification.apartment_name,
      approved: status === 'verified',
      denialReason: denial_reason,
    }).catch(e => console.error('Decision email error:', e.message))

    res.json({ id: verificationId, verification_status: status })
  } catch (err) {
    console.error('PATCH /admin/verifications/:id error:', err)
    res.status(500).json({ error: 'Failed to update verification' })
  }
})

module.exports = router
