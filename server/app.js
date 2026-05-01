require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const path = require('path')

const apartmentRoutes = require('./routes/apartments')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const verificationRoutes = require('./routes/verifications')
const savedRoutes = require('./routes/saved')
const voteRoutes = require('./routes/votes')
const replyRoutes = require('./routes/replies')
const flagRoutes = require('./routes/flags')
const adminRoutes = require('./routes/admin')

const app = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

// In dev, allow the Vite dev server; in prod, same origin (no CORS needed)
if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
}

app.use(express.json({ limit: '5mb' }))

// ── API routes (all prefixed /api so the built React app can reach them) ──────
app.use('/api/apartments', apartmentRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/verifications', verificationRoutes)
app.use('/api/saved', savedRoutes)
app.use('/api/votes', voteRoutes)
app.use('/api/replies', replyRoutes)
app.use('/api/flags', flagRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok', env: isProd ? 'production' : 'development' }))

// ── In production: serve the built React app ──────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'client', 'dist')
  app.use(express.static(distPath))

  // React Router catch-all — serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => console.log(`🏠 RentWise running at http://localhost:${PORT}`))
