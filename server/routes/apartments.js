const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const multer = require('multer')
const { optionalAuth } = require('../middleware/optionalAuth')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'))
    cb(null, true)
  }
})

function clamp(val, min, max) {
  const n = parseFloat(val)
  if (isNaN(n)) return null
  return Math.min(Math.max(n, min), max)
}

// GET /apartments/filters
router.get('/filters', async (req, res) => {
  try {
    const types = await db.allAsync('SELECT DISTINCT property_type FROM apartments WHERE property_type IS NOT NULL ORDER BY property_type')
    const cities = await db.allAsync('SELECT DISTINCT city, state FROM apartments ORDER BY city')
    res.json({ property_types: types.map(r => r.property_type), cities })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filter options' })
  }
})

// GET /apartments
router.get('/', async (req, res) => {
  try {
    const { search, minRating, property_type, city, sort = 'newest', order = 'desc', page = 1, limit = 20 } = req.query

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(LOWER(a.name) LIKE LOWER(?) OR LOWER(a.street_address) LIKE LOWER(?) OR LOWER(a.city) LIKE LOWER(?) OR a.zip_code LIKE ?)')
      const term = `%${search}%`
      params.push(term, term, term, term)
    }

    if (property_type) {
      conditions.push('LOWER(a.property_type) = LOWER(?)')
      params.push(property_type)
    }

    if (city) {
      conditions.push('LOWER(a.city) = LOWER(?)')
      params.push(city)
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    let having = ''
    if (minRating) {
      having = 'HAVING avg_rating >= ?'
      params.push(parseFloat(minRating))
    }

    const sortMap = {
      rating: 'avg_rating',
      newest: 'a.created_at',
      reviews: 'review_count'
    }
    const sortCol = sortMap[sort] || 'a.created_at'
    const sortDir = order === 'asc' ? 'ASC' : 'DESC'

    const pageNum = Math.max(1, parseInt(page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20))
    const offset = (pageNum - 1) * pageSize

    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT a.id, ROUND(AVG(r.rating_overall), 1) as avg_rating
        FROM apartments a
        LEFT JOIN verifications v ON v.apartment_id = a.id
        LEFT JOIN reviews r ON r.verification_id = v.id
        ${where}
        GROUP BY a.id
        ${having}
      )
    `
    const countRow = await db.getAsync(countSql, params)
    const total = countRow ? countRow.total : 0

    const dataSql = `
      SELECT a.*,
        ROUND(AVG(r.rating_overall), 1) as avg_rating,
        COUNT(r.id) as review_count,
        (SELECT photo_data FROM apartment_photos WHERE apartment_id = a.id ORDER BY display_order LIMIT 1) as photo
      FROM apartments a
      LEFT JOIN verifications v ON v.apartment_id = a.id
      LEFT JOIN reviews r ON r.verification_id = v.id
      ${where}
      GROUP BY a.id
      ${having}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `
    const apartments = await db.allAsync(dataSql, [...params, pageSize, offset])

    res.json({
      apartments,
      pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) }
    })
  } catch (err) {
    console.error('GET /apartments error:', err)
    res.status(500).json({ error: 'Failed to fetch apartments' })
  }
})

// GET /apartments/mine — landlord's own listings
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const apartments = await db.allAsync(`
      SELECT a.*, ROUND(AVG(r.rating_overall), 1) as avg_rating, COUNT(DISTINCT r.id) as review_count, COUNT(DISTINCT av.id) as view_count
      FROM apartments a
      LEFT JOIN verifications v ON v.apartment_id = a.id
      LEFT JOIN reviews r ON r.verification_id = v.id
      LEFT JOIN apartment_views av ON av.apartment_id = a.id
      WHERE a.owner_id = ?
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `, [req.user.id])
    res.json({ apartments })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your listings' })
  }
})

// GET /apartments/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid apartment ID' })

    const apartment = await db.getAsync(`
      SELECT a.*, ROUND(AVG(r.rating_overall), 1) as avg_rating, COUNT(r.id) as review_count
      FROM apartments a
      LEFT JOIN verifications v ON v.apartment_id = a.id
      LEFT JOIN reviews r ON r.verification_id = v.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id])

    if (!apartment) return res.status(404).json({ error: 'Apartment not found' })

    // Fire-and-forget view tracking
    const viewUserId = req.user?.id || null
    db.runAsync('INSERT INTO apartment_views (apartment_id, user_id) VALUES (?, ?)', [id, viewUserId]).catch(() => {})

    // Photos
    const photos = await db.allAsync(
      'SELECT id, photo_data, display_order FROM apartment_photos WHERE apartment_id = ? ORDER BY display_order',
      [id]
    )

    // Enriched reviews query
    const userId = req.user?.id || 0
    const reviews = await db.allAsync(`
      SELECT r.*, u.first_name, u.last_name, COALESCE(r.display_name, u.first_name || ' ' || u.last_name) as display_name,
        COUNT(DISTINCT rv.id) as vote_count,
        MAX(CASE WHEN rv.user_id = ? THEN 1 ELSE 0 END) as user_voted,
        rp.reply_text, rp.created_at as reply_created_at, rp.landlord_id,
        lu.first_name as landlord_first_name, lu.last_name as landlord_last_name,
        COUNT(DISTINCT rf.id) as flag_count,
        MAX(CASE WHEN rf.user_id = ? THEN 1 ELSE 0 END) as user_flagged
      FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      JOIN users u ON u.id = v.user_id
      LEFT JOIN review_votes rv ON rv.review_id = r.id
      LEFT JOIN review_replies rp ON rp.review_id = r.id
      LEFT JOIN users lu ON lu.id = rp.landlord_id
      LEFT JOIN review_flags rf ON rf.review_id = r.id
      WHERE v.apartment_id = ?
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, [userId, userId, id])

    // Attach review photos
    if (reviews.length > 0) {
      const reviewIds = reviews.map(r => r.id)
      const placeholders = reviewIds.map(() => '?').join(',')
      const reviewPhotos = await db.allAsync(
        `SELECT review_id, id, photo_data FROM review_photos WHERE review_id IN (${placeholders})`,
        reviewIds
      )
      const photoMap = {}
      reviewPhotos.forEach(p => {
        if (!photoMap[p.review_id]) photoMap[p.review_id] = []
        photoMap[p.review_id].push({ id: p.id, photo_data: p.photo_data })
      })
      reviews.forEach(r => { r.photos = photoMap[r.id] || [] })
    }

    res.json({ ...apartment, reviews, photos })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch apartment' })
  }
})

// POST /apartments
router.post('/', requireAuth, async (req, res) => {

  const { name, street_address, city, state, zip_code, property_type, year_built } = req.body

  const errors = []
  if (!name || typeof name !== 'string' || name.trim().length === 0) errors.push('name is required')
  if (!street_address || typeof street_address !== 'string' || street_address.trim().length === 0) errors.push('street_address is required')
  if (!city || typeof city !== 'string' || city.trim().length === 0) errors.push('city is required')
  if (!state || typeof state !== 'string' || state.trim().length === 0) errors.push('state is required')
  if (!zip_code || typeof zip_code !== 'string' || zip_code.trim().length === 0) errors.push('zip_code is required')

  if (errors.length > 0) return res.status(400).json({ errors })

  try {
    const result = await db.runAsync(`
      INSERT INTO apartments (name, street_address, city, state, zip_code, property_type, year_built, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name.trim(), street_address.trim(), city.trim(), state.trim(), zip_code.trim(),
        property_type || null, year_built ? parseInt(year_built) : null, req.user.id])

    res.status(201).json({ id: result.lastID, name: name.trim(), street_address: street_address.trim() })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create apartment' })
  }
})

// PUT /apartments/:id
router.put('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid apartment ID' })

  const apt = await db.getAsync('SELECT owner_id FROM apartments WHERE id = ?', [id])
  if (!apt) return res.status(404).json({ error: 'Apartment not found' })
  if (apt.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

  const { name, street_address, city, state, zip_code, property_type, year_built } = req.body
  const errors = []
  if (!name || name.trim().length === 0) errors.push('name is required')
  if (!street_address || street_address.trim().length === 0) errors.push('street_address is required')
  if (!city || city.trim().length === 0) errors.push('city is required')
  if (!state || state.trim().length === 0) errors.push('state is required')
  if (!zip_code || zip_code.trim().length === 0) errors.push('zip_code is required')
  if (errors.length > 0) return res.status(400).json({ errors })

  try {
    await db.runAsync(`
      UPDATE apartments SET name=?, street_address=?, city=?, state=?, zip_code=?, property_type=?, year_built=?
      WHERE id=?
    `, [name.trim(), street_address.trim(), city.trim(), state.trim(), zip_code.trim(),
        property_type || null, year_built ? parseInt(year_built) : null, id])
    res.json({ message: 'Listing updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' })
  }
})

// DELETE /apartments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid apartment ID' })

  const apt = await db.getAsync('SELECT owner_id FROM apartments WHERE id = ?', [id])
  if (!apt) return res.status(404).json({ error: 'Apartment not found' })
  if (apt.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

  try {
    await db.runAsync('DELETE FROM apartments WHERE id = ?', [id])
    res.json({ message: 'Listing deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' })
  }
})

// GET /apartments/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid apartment ID' })

    const reviews = await db.allAsync(`
      SELECT r.*, u.first_name, u.last_name
      FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      JOIN users u ON u.id = v.user_id
      WHERE v.apartment_id = ?
      ORDER BY r.created_at DESC
    `, [id])
    res.json(reviews)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// POST /apartments/:id/reviews
router.post('/:id/reviews', requireAuth, upload.array('photos', 3), async (req, res) => {
  const { verification_id, rating_overall, rating_safety, rating_management, rating_noise, rating_value, rating_responsiveness, rating_parking, title, review_text, display_name } = req.body

  const errors = []
  if (!verification_id) errors.push('verification_id is required')
  const overallVal = clamp(rating_overall, 1, 5)
  if (overallVal === null) errors.push('rating_overall must be a number between 1 and 5')
  if (!title || typeof title !== 'string' || title.trim().length === 0) errors.push('title is required')
  if (title && title.length > 200) errors.push('title must be under 200 characters')
  if (!review_text || typeof review_text !== 'string' || review_text.trim().length === 0) errors.push('review_text is required')
  if (review_text && review_text.length > 5000) errors.push('review_text must be under 5000 characters')

  const safetyVal = rating_safety != null ? clamp(rating_safety, 1, 5) : null
  const managementVal = rating_management != null ? clamp(rating_management, 1, 5) : null
  const noiseVal = rating_noise != null ? clamp(rating_noise, 1, 5) : null
  const valueVal = rating_value != null ? clamp(rating_value, 1, 5) : null
  const responsivenessVal = rating_responsiveness != null ? clamp(rating_responsiveness, 1, 5) : null
  const parkingVal = rating_parking != null ? clamp(rating_parking, 1, 5) : null

  if (errors.length > 0) return res.status(400).json({ errors })

  try {
    const aptId = parseInt(req.params.id)
    if (isNaN(aptId)) return res.status(400).json({ error: 'Invalid apartment ID' })

    // Validate verification belongs to this user and apartment, and is verified
    const verification = await db.getAsync(
      `SELECT id FROM verifications
       WHERE id = ? AND user_id = ? AND apartment_id = ? AND verification_status = 'verified'`,
      [parseInt(verification_id), req.user.id, aptId]
    )
    if (!verification) {
      return res.status(403).json({ error: 'A verified residency record for this apartment is required to post a review' })
    }

    // One review per verification
    const existingReview = await db.getAsync(
      'SELECT id FROM reviews WHERE verification_id = ?',
      [parseInt(verification_id)]
    )
    if (existingReview) return res.status(409).json({ error: 'You already reviewed this apartment' })

    const resolvedDisplayName = display_name?.trim() || `${req.user.first_name} ${req.user.last_name}`

    const result = await db.runAsync(`
      INSERT INTO reviews (verification_id, rating_overall, rating_safety, rating_management, rating_noise, rating_value, rating_responsiveness, rating_parking, title, review_text, display_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [parseInt(verification_id), overallVal, safetyVal, managementVal, noiseVal, valueVal, responsivenessVal, parkingVal, title.trim(), review_text.trim(), resolvedDisplayName])

    if (req.files?.length > 0) {
      for (const f of req.files) {
        const dataUrl = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
        await db.runAsync('INSERT INTO review_photos (review_id, photo_data) VALUES (?, ?)', [result.lastID, dataUrl])
      }
    }

    res.status(201).json({ id: result.lastID, message: 'Review created' })
  } catch (err) {
    console.error('POST review error:', err)
    res.status(500).json({ error: 'Failed to create review' })
  }
})

// DELETE /apartments/:id/reviews/:reviewId
router.delete('/:id/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    if (isNaN(reviewId)) return res.status(400).json({ error: 'Invalid review ID' })

    const review = await db.getAsync(`
      SELECT r.id FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      WHERE r.id = ? AND v.user_id = ?
    `, [reviewId, req.user.id])
    if (!review) return res.status(404).json({ error: 'Review not found or not yours' })

    await db.runAsync('DELETE FROM reviews WHERE id = ?', [reviewId])
    res.json({ message: 'Review deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' })
  }
})

// POST /apartments/:id/photos
router.post('/:id/photos', requireAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid apartment ID' })
    const apt = await db.getAsync('SELECT owner_id FROM apartments WHERE id = ?', [id])
    if (!apt || apt.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })
    const existing = await db.getAsync('SELECT COUNT(*) as cnt FROM apartment_photos WHERE apartment_id = ?', [id])
    if (existing.cnt + (req.files?.length || 0) > 5) return res.status(400).json({ error: 'Maximum 5 photos per listing' })
    for (let i = 0; i < (req.files?.length || 0); i++) {
      const f = req.files[i]
      const dataUrl = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`
      await db.runAsync('INSERT INTO apartment_photos (apartment_id, photo_data, display_order) VALUES (?, ?, ?)', [id, dataUrl, existing.cnt + i])
    }
    res.status(201).json({ message: 'Photos uploaded' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload photos' })
  }
})

// DELETE /apartments/:id/photos/:photoId
router.delete('/:id/photos/:photoId', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const photoId = parseInt(req.params.photoId)
    const apt = await db.getAsync('SELECT owner_id FROM apartments WHERE id = ?', [id])
    if (!apt || apt.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })
    await db.runAsync('DELETE FROM apartment_photos WHERE id = ? AND apartment_id = ?', [photoId, id])
    res.json({ message: 'Photo deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete photo' })
  }
})

// POST /apartments/:id/claim
router.post('/:id/claim', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') return res.status(403).json({ error: 'Only landlords can claim listings' })
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid apartment ID' })
    const apt = await db.getAsync('SELECT id, owner_id FROM apartments WHERE id = ?', [id])
    if (!apt) return res.status(404).json({ error: 'Apartment not found' })
    if (apt.owner_id !== null && apt.owner_id !== undefined) return res.status(409).json({ error: 'This listing already has an owner' })
    await db.runAsync('UPDATE apartments SET owner_id = ? WHERE id = ?', [req.user.id, id])
    res.json({ message: 'Listing claimed successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim listing' })
  }
})

module.exports = router
