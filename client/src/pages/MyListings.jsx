import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'

export default function MyListings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'landlord') { navigate('/'); return }

    api.getMyListings()
      .then(data => setListings(data.apartments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>

  return (
    <div className="page">
      <div className="my-listings-header">
        <h1>My Listings</h1>
        <Link to="/add" className="btn">+ Add New Listing</Link>
      </div>

      {listings.length === 0 ? (
        <div className="empty">
          <p>You haven't added any listings yet.</p>
          <Link to="/add" className="btn">Add your first listing</Link>
        </div>
      ) : (
        <div className="apartments-grid">
          {listings.map(apt => (
            <div key={apt.id} className="apartment-card listing-managed">
              <Link to={`/apartments/${apt.id}`} className="card-body card-body-link">
                <h3 className="card-title">{apt.name}</h3>
                <p className="card-address">{apt.street_address}, {apt.city}, {apt.state}</p>
                <div className="card-meta">
                  {apt.property_type && <span className="badge">{apt.property_type}</span>}
                  {apt.year_built && <span className="card-year">Built {apt.year_built}</span>}
                </div>
                <div className="card-rating">
                  <StarRating rating={apt.avg_rating} size="sm" />
                  <span className="review-count">
                    {apt.review_count > 0
                      ? `${apt.review_count} review${apt.review_count !== 1 ? 's' : ''}`
                      : 'No reviews yet'}
                  </span>
                </div>
                {apt.view_count > 0 && (
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {apt.view_count} view{apt.view_count !== 1 ? 's' : ''}
                  </p>
                )}
              </Link>
              <div className="listing-actions">
                <Link to={`/apartments/${apt.id}/edit`} className="btn btn-sm">
                  ✏️ Edit
                </Link>
                <Link to={`/apartments/${apt.id}`} className="btn btn-sm btn-outline">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
