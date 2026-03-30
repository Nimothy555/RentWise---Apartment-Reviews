import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import ApartmentCard from '../components/ApartmentCard'
import StarRating from '../components/StarRating'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saved, setSaved] = useState([])
  const [reviews, setReviews] = useState([])
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role === 'landlord') { navigate('/my-listings'); return }
    Promise.all([
      api.getSaved().catch(() => ({ apartments: [] })),
      api.getMyProfile().catch(() => ({ reviews: [] })),
      api.getMyVerifications().catch(() => ({ verifications: [] }))
    ]).then(([savedData, profileData, verData]) => {
      setSaved(savedData.apartments || [])
      setReviews(profileData.reviews || [])
      setVerifications(verData.verifications || [])
    }).finally(() => setLoading(false))
  }, [user])

  const handleUnsave = async (aptId) => {
    await api.toggleSave(aptId).catch(() => {})
    setSaved(prev => prev.filter(a => a.id !== aptId))
  }

  if (loading) return <div className="page"><div className="loading">Loading dashboard...</div></div>

  return (
    <div className="page">
      <h1>My Dashboard</h1>

      <div className="dashboard-section">
        <h2>Saved Listings ({saved.length})</h2>
        {saved.length === 0 ? (
          <p className="empty">No saved listings. <Link to="/">Browse apartments</Link> to save some.</p>
        ) : (
          <div className="apartment-grid">
            {saved.map(apt => (
              <div key={apt.id} style={{ position: 'relative' }}>
                <ApartmentCard apartment={apt} />
                <button
                  className="btn btn-sm btn-outline"
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.75rem' }}
                  onClick={() => handleUnsave(apt.id)}
                >
                  ♥ Unsave
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>My Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="empty">No reviews yet.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(r => (
              <div key={r.id} className="review-card">
                <div className="review-header">
                  <StarRating rating={r.rating_overall} size="sm" />
                  <Link to={`/apartments/${r.apartment_id}`} className="review-apt-link">
                    {r.apartment_name} — {r.city}, {r.state}
                  </Link>
                </div>
                <h4>{r.title}</h4>
                <p>{r.review_text}</p>
                <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>Verification History</h2>
        {verifications.length === 0 ? (
          <p className="empty">No verification records yet.</p>
        ) : (
          <div className="verification-list">
            {verifications.map(v => (
              <div key={v.id} className="verification-item">
                <div>
                  <Link to={`/apartments/${v.apartment_id}`}><strong>{v.apartment_name}</strong></Link>
                  <p className="text-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                    {v.city}, {v.state} · {v.doc_type.replace('_', ' ')} · {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`verification-status status-${v.verification_status}`}>{v.verification_status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
