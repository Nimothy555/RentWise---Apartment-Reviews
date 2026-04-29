const express = require('express')
const router = express.Router()
const multer = require('multer')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { sendVerificationSubmissionNotification } = require('../email')

const ALLOWED_MIMETYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) or PDFs are allowed'))
    }
    cb(null, true)
  }
})

const DOC_TYPE_LABELS = {
  lease: 'Lease Agreement',
  utility_bill: 'Utility Bill',
  postal_mail: 'Postal Mail',
}

// POST /verifications
router.post('/', requireAuth, (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    next()
  })
}, async (req, res) => {
  const { apartment_id, doc_type } = req.body

  if (!apartment_id) return res.status(400).json({ error: 'apartment_id is required' })
  if (!doc_type || !DOC_TYPE_LABELS[doc_type]) {
    return res.status(400).json({ error: 'doc_type must be lease, utility_bill, or postal_mail' })
  }
  if (!req.file) return res.status(400).json({ error: 'A document image is required' })

  const aptId = parseInt(apartment_id)
  if (isNaN(aptId)) return res.status(400).json({ error: 'Invalid apartment_id' })

  try {
    const apartment = await db.getAsync(
      'SELECT id, name, street_address, city, state, zip_code FROM apartments WHERE id = ?',
      [aptId]
    )
    if (!apartment) return res.status(404).json({ error: 'Apartment not found' })

    // Check if user already has a verified verification for this apartment
    const existing = await db.getAsync(
      `SELECT id, verification_status FROM verifications
       WHERE user_id = ? AND apartment_id = ? AND verification_status = 'verified'`,
      [req.user.id, aptId]
    )
    if (existing) {
      return res.status(409).json({
        error: 'You already have a verified record for this apartment',
        verification_id: existing.id
      })
    }

    const base64Image = req.file.buffer.toString('base64')
    const mediaType = req.file.mimetype
    const verificationStatus = 'pending'

    // Store document as base64 data URL
    const documentUrl = `data:${mediaType};base64,${base64Image}`

    const result = await db.runAsync(
      `INSERT INTO verifications (user_id, apartment_id, doc_type, document_url, verification_status)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, aptId, doc_type, documentUrl, verificationStatus]
    )

    // Notify the verification inbox
    sendVerificationSubmissionNotification({
      user: req.user,
      apartment,
      docType: doc_type,
      fileBuffer: req.file.buffer,
      fileMimetype: mediaType,
      verificationStatus,
    }).catch(e => console.error('Verification notification error:', e.message))

    res.status(201).json({
      id: result.lastID,
      verification_status: verificationStatus,
      extracted_address: extractedAddress,
      apartment_address: `${apartment.street_address}, ${apartment.city}, ${apartment.state} ${apartment.zip_code}`
    })
  } catch (err) {
    console.error('POST /verifications error:', err)
    res.status(500).json({ error: 'Failed to process verification' })
  }
})

// GET /verifications/my/:apartmentId — check if current user has verified for an apartment
router.get('/my/:apartmentId', requireAuth, async (req, res) => {
  const aptId = parseInt(req.params.apartmentId)
  if (isNaN(aptId)) return res.status(400).json({ error: 'Invalid apartment ID' })

  try {
    const verification = await db.getAsync(
      `SELECT id, verification_status FROM verifications
       WHERE user_id = ? AND apartment_id = ? AND verification_status = 'verified'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, aptId]
    )
    res.json({ verification: verification || null })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verification' })
  }
})

// GET /verifications/mine — all verifications for the current user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const verifications = await db.allAsync(`
      SELECT v.id, v.apartment_id, v.doc_type, v.verification_status, v.created_at,
             a.name as apartment_name, a.city, a.state
      FROM verifications v
      JOIN apartments a ON a.id = v.apartment_id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `, [req.user.id])
    res.json({ verifications })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verifications' })
  }
})

module.exports = router
