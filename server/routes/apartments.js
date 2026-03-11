const express = require('express')
const router = express.Router()
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

// Clamp a number between min and max
function clamp(val, min, max) {
  const n = parseFloat(val)
  if (isNaN(n)) return null
  return Math.min(Math.max(n, min), max)
}

// GET /apartments
// Query params: search, neighborhood, minPrice, maxPrice, minRating, beds, baths,
//               sort (price, rating, newest), order (asc, desc), page, limit
router.get('/', async (req, res) => {
  try {
    const { search, neighborhood, minPrice, maxPrice, minRating, beds, baths,
            sort = 'newest', order = 'desc', page = 1, limit = 20 } = req.query

    const conditions = []
    const params = []

    if (search) {
      conditions.push('(a.name LIKE ? OR a.address LIKE ? OR a.neighborhood LIKE ?)')
      const term = `%${search}%`
      params.push(term, term, term)
    }

    if (neighborhood) {
      conditions.push('LOWER(a.neighborhood) = LOWER(?)')
      params.push(neighborhood)
    }

    if (minPrice) {
      conditions.push('a.price >= ?')
      params.push(parseFloat(minPrice))
    }

    if (maxPrice) {
      conditions.push('a.price <= ?')
      params.push(parseFloat(maxPrice))
    }

    if (beds) {
      conditions.push('a.beds >= ?')
      params.push(parseInt(beds))
    }

    if (baths) {
      conditions.push('a.baths >= ?')
      params.push(parseInt(baths))
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    // minRating filter applied as HAVING since avg_rating is an aggregate
    let having = ''
    if (minRating) {
      having = 'HAVING avg_rating >= ?'
      params.push(parseFloat(minRating))
    }

    // Sorting
    const sortMap = {
      price: 'a.price',
      rating: 'avg_rating',
      newest: 'a.created_at',
      reviews: 'review_count'
    }
    const sortCol = sortMap[sort] || 'a.created_at'
    const sortDir = order === 'asc' ? 'ASC' : 'DESC'

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20))
    const offset = (pageNum - 1) * pageSize

    // Count total results
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT a.id, ROUND(AVG(r.rating), 1) as avg_rating
        FROM apartments a
        LEFT JOIN reviews r ON r.apartment_id = a.id
        ${where}
        GROUP BY a.id
        ${having}
      )
    `
    const countRow = await db.getAsync(countSql, params)
    const total = countRow ? countRow.total : 0

    // Fetch page of results
    const dataSql = `
      SELECT a.*, ROUND(AVG(r.rating), 1) as avg_rating, COUNT(r.id) as review_count
      FROM apartments a
      LEFT JOIN reviews r ON r.apartment_id = a.id
      ${where}
      GROUP BY a.id
      ${having}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `
    const apartments = await db.allAsync(dataSql, [...params, pageSize, offset])

    res.json({
      apartments,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
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
      SELECT a.*, ROUND(AVG(r.rating), 1) as avg_rating, COUNT(r.id) as review_count
      FROM apartments a
      LEFT JOIN reviews r ON r.apartment_id = a.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id])

    if (!apartment) return res.status(404).json({ error: 'Apartment not found' })

    const reviews = await db.allAsync(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.apartment_id = ?
      ORDER BY r.created_at DESC
    `, [id])

    res.json({ ...apartment, reviews })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch apartment' })
  }
})

// POST /apartments
router.post('/', requireAuth, async (req, res) => {
  const { name, address, neighborhood, price, beds, baths } = req.body

  // Validation
  const errors = []
  if (!name || typeof name !== 'string' || name.trim().length === 0) errors.push('name is required')
  if (!address || typeof address !== 'string' || address.trim().length === 0) errors.push('address is required')
  if (!neighborhood || typeof neighborhood !== 'string' || neighborhood.trim().length === 0) errors.push('neighborhood is required')
  if (!price || typeof price !== 'number' || price <= 0) errors.push('price must be a positive number')
  if (beds !== undefined && beds !== null && (typeof beds !== 'number' || beds < 0 || beds > 20)) errors.push('beds must be 0-20')
  if (baths !== undefined && baths !== null && (typeof baths !== 'number' || baths < 0 || baths > 20)) errors.push('baths must be 0-20')

  if (errors.length > 0) return res.status(400).json({ errors })

  try {
    const result = await db.runAsync(`
      INSERT INTO apartments (name, address, neighborhood, price, beds, baths)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name.trim(), address.trim(), neighborhood.trim(), price, beds || null, baths || null])

    res.status(201).json({ id: result.lastID, name: name.trim(), address: address.trim(), neighborhood: neighborhood.trim(), price })
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
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.apartment_id = ?
      ORDER BY r.created_at DESC
    `, [id])
    res.json(reviews)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// POST /apartments/:id/reviews
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const { rating, title, body, noise, safety, maintenance, landlord } = req.body

  // Validation
  const errors = []
  const ratingVal = clamp(rating, 1, 5)
  if (ratingVal === null) errors.push('rating must be a number between 1 and 5')
  if (!title || typeof title !== 'string' || title.trim().length === 0) errors.push('title is required')
  if (title && title.length > 200) errors.push('title must be under 200 characters')
  if (!body || typeof body !== 'string' || body.trim().length === 0) errors.push('body is required')
  if (body && body.length > 5000) errors.push('body must be under 5000 characters')

  // Sub-ratings are optional but must be 1-5 if provided
  const noiseVal = noise != null ? clamp(noise, 1, 5) : null
  const safetyVal = safety != null ? clamp(safety, 1, 5) : null
  const maintenanceVal = maintenance != null ? clamp(maintenance, 1, 5) : null
  const landlordVal = landlord != null ? clamp(landlord, 1, 5) : null

  if (errors.length > 0) return res.status(400).json({ errors })

  try {
    const aptId = parseInt(req.params.id)
    if (isNaN(aptId)) return res.status(400).json({ error: 'Invalid apartment ID' })

    const apt = await db.getAsync('SELECT id FROM apartments WHERE id = ?', [aptId])
    if (!apt) return res.status(404).json({ error: 'Apartment not found' })

    // Prevent duplicate reviews from same user on same apartment
    const existing = await db.getAsync(
      'SELECT id FROM reviews WHERE apartment_id = ? AND user_id = ?',
      [aptId, req.user.id]
    )
    if (existing) return res.status(409).json({ error: 'You already reviewed this apartment' })

    const result = await db.runAsync(`
      INSERT INTO reviews (rating, title, body, noise, safety, maintenance, landlord, apartment_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [ratingVal, title.trim(), body.trim(), noiseVal, safetyVal, maintenanceVal, landlordVal, aptId, req.user.id])

    res.status(201).json({ id: result.lastID, message: 'Review created' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review' })
  }
})

// PUT /apartments/:id/reviews/:reviewId
router.put('/:id/reviews/:reviewId', requireAuth, async (req, res) => {
  const { rating, title, body, noise, safety, maintenance, landlord } = req.body

  try {
    const reviewId = parseInt(req.params.reviewId)
    if (isNaN(reviewId)) return res.status(400).json({ error: 'Invalid review ID' })

    const review = await db.getAsync('SELECT * FROM reviews WHERE id = ?', [reviewId])
    if (!review) return res.status(404).json({ error: 'Review not found' })
    if (review.user_id !== req.user.id)
      return res.status(403).json({ error: 'Can only edit your own reviews' })

    const ratingVal = rating != null ? clamp(rating, 1, 5) : review.rating
    const titleVal = (title && title.trim()) || review.title
    const bodyVal = (body && body.trim()) || review.body

    await db.runAsync(`
      UPDATE reviews SET rating = ?, title = ?, body = ?,
        noise = ?, safety = ?, maintenance = ?, landlord = ?
      WHERE id = ?
    `, [
      ratingVal, titleVal, bodyVal,
      noise != null ? clamp(noise, 1, 5) : review.noise,
      safety != null ? clamp(safety, 1, 5) : review.safety,
      maintenance != null ? clamp(maintenance, 1, 5) : review.maintenance,
      landlord != null ? clamp(landlord, 1, 5) : review.landlord,
      reviewId
    ])

    res.json({ message: 'Review updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review' })
  }
})

// DELETE /apartments/:id/reviews/:reviewId
router.delete('/:id/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.reviewId)
    if (isNaN(reviewId)) return res.status(400).json({ error: 'Invalid review ID' })

    const review = await db.getAsync('SELECT * FROM reviews WHERE id = ?', [reviewId])
    if (!review) return res.status(404).json({ error: 'Review not found' })
    if (review.user_id !== req.user.id)
      return res.status(403).json({ error: 'Can only delete your own reviews' })

    await db.runAsync('DELETE FROM reviews WHERE id = ?', [reviewId])
    res.json({ message: 'Review deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' })
  }
})

module.exports = router
