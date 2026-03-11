import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'

const DOC_TYPE_OPTIONS = [
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'postal_mail', label: 'Postal Mail' },
]

function VerificationStep({ apartment, onVerified }) {
  const [docType, setDocType] = useState('lease')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | failed | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return setErrorMsg('Please select a document image.')
    setStatus('loading')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('apartment_id', apartment.id)
    formData.append('doc_type', docType)
    formData.append('document', file)

    try {
      const result = await api.createVerification(formData)
      if (result.verification_status === 'verified') {
        onVerified(result.id)
      } else {
        setStatus('failed')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  return (
    <div className="review-form">
      <h3>Verify Your Residency</h3>
      <p className="text-muted">
        Upload a document showing your address at <strong>{apartment.street_address}, {apartment.city}</strong> to post a review.
      </p>

      {status === 'failed' && (
        <div className="error-msg">
          Address on document didn't match the apartment address. Please try a different document.
        </div>
      )}
      {status === 'error' && <div className="error-msg">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Document Type
            <select value={docType} onChange={e => setDocType(e.target.value)} className="input">
              {DOC_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Upload Document
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={e => setFile(e.target.files[0] || null)}
              required
            />
          </label>
        </div>

        <button type="submit" className="btn" disabled={status === 'loading'}>
          {status === 'loading' ? 'Verifying...' : 'Verify Residency'}
        </button>
      </form>
    </div>
  )
}

function ReviewForm({ apartmentId, verificationId, onSubmit }) {
  const [form, setForm] = useState({
    rating_overall: 5, rating_safety: '', rating_management: '', title: '', review_text: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.createReview(apartmentId, {
        verification_id: verificationId,
        rating_overall: Number(form.rating_overall),
        rating_safety: form.rating_safety !== '' ? Number(form.rating_safety) : undefined,
        rating_management: form.rating_management !== '' ? Number(form.rating_management) : undefined,
        title: form.title,
        review_text: form.review_text,
      })
      setForm({ rating_overall: 5, rating_safety: '', rating_management: '', title: '', review_text: '' })
      onSubmit()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <h3>Write a Review</h3>
      <div className="verified-badge">✓ Verified Tenant</div>
      {error && <div className="error-msg">{error}</div>}

      <div className="form-row">
        <label>Overall Rating
          <select value={form.rating_overall} onChange={e => setForm({ ...form, rating_overall: e.target.value })} className="input">
            {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map(n => (
              <option key={n} value={n}>{n} ★</option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label>Title
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="input" placeholder="Summarize your experience" required />
        </label>
      </div>

      <div className="form-row">
        <label>Review
          <textarea value={form.review_text} onChange={e => setForm({ ...form, review_text: e.target.value })}
            className="input" rows={4} placeholder="What was it like living here?" required />
        </label>
      </div>

      <div className="sub-ratings">
        <label>Safety
          <select value={form.rating_safety} onChange={e => setForm({ ...form, rating_safety: e.target.value })} className="input">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Management
          <select value={form.rating_management} onChange={e => setForm({ ...form, rating_management: e.target.value })} className="input">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}

function ReviewCard({ review, apartmentId, currentUserId, onDelete }) {
  const isOwner = currentUserId === review.user_id

  const handleDelete = async () => {
    if (!confirm('Delete this review?')) return
    try {
      await api.deleteReview(apartmentId, review.id)
      onDelete()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="review-card">
      <div className="review-header">
        <StarRating rating={review.rating_overall} size="sm" />
        <span className="review-author">by {review.first_name} {review.last_name}</span>
        <span className="verified-badge small">✓ Verified</span>
        <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
      </div>
      <h4>{review.title}</h4>
      <p>{review.review_text}</p>
      {(review.rating_safety || review.rating_management) && (
        <div className="sub-ratings-display">
          {review.rating_safety && <span>Safety: {review.rating_safety}/5</span>}
          {review.rating_management && <span>Management: {review.rating_management}/5</span>}
        </div>
      )}
      {isOwner && (
        <button onClick={handleDelete} className="btn-link danger">Delete my review</button>
      )}
    </div>
  )
}

export default function ApartmentDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [apartment, setApartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verificationId, setVerificationId] = useState(null)
  const [checkingVerification, setCheckingVerification] = useState(false)

  const load = () => {
    setLoading(true)
    api.getApartment(id)
      .then(data => setApartment(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!user || !id) return
    setCheckingVerification(true)
    api.getMyVerification(id)
      .then(data => setVerificationId(data.verification?.id || null))
      .catch(() => setVerificationId(null))
      .finally(() => setCheckingVerification(false))
  }, [user, id])

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>
  if (error) return <div className="page"><div className="error-msg">{error}</div></div>
  if (!apartment) return <div className="page"><div className="empty">Apartment not found</div></div>

  const hasReviewed = verificationId && apartment.reviews?.some(r => r.verification_id === verificationId)

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to listings</Link>

      <div className="apartment-detail">
        <div className="detail-header">
          <div>
            <h1>{apartment.name}</h1>
            <p className="detail-address">{apartment.street_address}, {apartment.city}, {apartment.state} {apartment.zip_code}</p>
            <div className="detail-meta">
              {apartment.property_type && <span className="badge">{apartment.property_type}</span>}
              {apartment.year_built && <span>Built {apartment.year_built}</span>}
            </div>
          </div>
        </div>

        <div className="detail-rating">
          <StarRating rating={apartment.avg_rating} size="lg" />
          <span>({apartment.review_count} review{apartment.review_count !== 1 ? 's' : ''})</span>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Reviews</h2>

        {!user && (
          <p className="text-muted"><Link to="/login">Log in</Link> to write a review.</p>
        )}

        {user && !checkingVerification && !verificationId && (
          <VerificationStep apartment={apartment} onVerified={setVerificationId} />
        )}

        {user && verificationId && !hasReviewed && (
          <ReviewForm apartmentId={apartment.id} verificationId={verificationId} onSubmit={load} />
        )}

        {hasReviewed && (
          <p className="text-muted">You've already reviewed this apartment.</p>
        )}

        {apartment.reviews?.length === 0 ? (
          <p className="empty">No reviews yet. Be the first!</p>
        ) : (
          <div className="reviews-list">
            {apartment.reviews.map(r => (
              <ReviewCard
                key={r.id}
                review={r}
                apartmentId={apartment.id}
                currentUserId={user?.id}
                onDelete={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
