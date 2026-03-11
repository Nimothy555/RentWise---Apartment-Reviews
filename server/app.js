require('dotenv').config()
const express = require('express')
const cors = require('cors')

const apartmentRoutes = require('./routes/apartments')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')

const app = express()
const PORT = process.env.PORT || 3000
const isProd = process.env.NODE_ENV === 'production'

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10kb' }))


app.use('/apartments', apartmentRoutes)
app.use('/auth', authRoutes)
app.use('/users', userRoutes)

app.get('/', (req, res) => res.json({
  name: 'RentWise API',
  version: '1.0.0',
  endpoints: {
    health: 'GET /health',
    apartments: 'GET /apartments?search=&neighborhood=&minPrice=&maxPrice=&minRating=&beds=&baths=&sort=newest&order=desc&page=1&limit=20',
    apartment: 'GET /apartments/:id',
    createApartment: 'POST /apartments',
    reviews: 'GET /apartments/:id/reviews',
    createReview: 'POST /apartments/:id/reviews',
    updateReview: 'PUT /apartments/:id/reviews/:reviewId',
    deleteReview: 'DELETE /apartments/:id/reviews/:reviewId',
    register: 'POST /auth/register',
    login: 'POST /auth/login',
    logout: 'POST /auth/logout',
    me: 'GET /auth/me',
    changePassword: 'PUT /auth/password',
    user: 'GET /users/:id',
    myProfile: 'GET /users/me'
  }
}))

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`🏠 Server running at http://localhost:${PORT}`))
