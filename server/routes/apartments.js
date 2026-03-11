const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

function clamp(val, min, max) {
  const n = parseFloat(val)
  if (isNaN(n)) return null
  return Math.min(Math.max(n, min), max)
}

// GET /apartments
router.get('/', async (req, res) => {
  try {
    const { search, minRating, sort = 'newest', order = 'desc', page = 1, limit = 20 } = req.query

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(a.name LIKE ? OR a.street_address LIKE ? OR a.city LIKE ?)')
      const term = `%${search}%`
      params.push(term, term, term)
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
      SELECT a.*, ROUND(AVG(r.rating_overall), 1) as avg_rating, COUNT(r.id) as review_count
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

// GET /apartments/:id
router.get('/:id', async (req, res) => {
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

    const reviews = await db.allAsync(`
      SELECT r.*, u.first_name, u.last_name
      FROM reviews r
      JOIN verifications v ON v.id = r.verification_id
      JOIN users u ON u.id = v.user_id
      WHERE v.apartment_id = ?
      ORDER BY r.created_at DESC
    `, [id])

    res.json({ ...apartment, reviews })
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
      INSERT INTO apartments (name, street_address, city, state, zip_code, property_type, year_built)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name.trim(), street_address.trim(), city.trim(), state.trim(), zip_code.trim(),
        property_type || null, year_built ? parseInt(year_built) : null])

    res.status(201).json({ id: result.lastID, name: name.trim(), street_address: street_address.trim() })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create apartment' })
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
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const { verification_id, rating_overall, rating_safety, rating_management, title, review_text } = req.body

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

    const result = await db.runAsync(`
      INSERT INTO reviews (verification_id, rating_overall, rating_safety, rating_management, title, review_text)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [parseInt(verification_id), overallVal, safetyVal, managementVal, title.trim(), review_text.trim()])

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

module.exports = router
