import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'

const DOC_TYPE_OPTIONS = [
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'postal_mail', label: 'Postal Mail' },
]

const PROPERTY_TYPES = ['Apartment', 'Loft', 'Townhouse', 'Studio', 'Condo', 'House']

function VerificationStep({ apartment, onVerified }) {
  const [docType, setDocType] = useState('lease')
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
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
      } else if (result.verification_status === 'pending') {
        setStatus('pending')
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

      {status === 'pending' ? (
        <div className="info-msg">
          Your document has been submitted and is under review by our moderation team. You'll be able to post a review once it's approved.
        </div>
      ) : (
      <>
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
              accept="image/*,application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
      </>
      )}
    </div>
  )
}

function ReviewForm({ apartmentId, verificationId, onSubmit }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    rating_overall: 5, rating_safety: '', rating_management: '', rating_noise: '', rating_value: '', rating_parking: '', rating_responsiveness: '', title: '', review_text: '', display_name: ''
  })
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('verification_id', verificationId)
      formData.append('rating_overall', form.rating_overall)
      if (form.rating_safety) formData.append('rating_safety', form.rating_safety)
      if (form.rating_management) formData.append('rating_management', form.rating_management)
      if (form.rating_noise) formData.append('rating_noise', form.rating_noise)
      if (form.rating_value) formData.append('rating_value', form.rating_value)
      if (form.rating_responsiveness) formData.append('rating_responsiveness', form.rating_responsiveness)
      if (form.rating_parking) formData.append('rating_parking', form.rating_parking)
      formData.append('title', form.title)
      formData.append('review_text', form.review_text)
      formData.append('display_name', form.display_name || `${user.first_name} ${user.last_name}`)
      photos.forEach(f => formData.append('photos', f))
      await api.createReview(apartmentId, formData)
      setForm({ rating_overall: 5, rating_safety: '', rating_management: '', title: '', review_text: '' })
      setPhotos([])
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
        <label>Display Name
          <input
            type="text"
            value={form.display_name}
            onChange={e => setForm({ ...form, display_name: e.target.value })}
            className="input"
            placeholder={`${user.first_name} ${user.last_name}`}
          />
        </label>
        <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
          Leave blank to post under your real name, or enter a custom name to post anonymously.
        </p>
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
        <label>Noise
          <select value={form.rating_noise} onChange={e => setForm({ ...form, rating_noise: e.target.value })} className="input">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Rent vs. Quality
          <select value={form.rating_value} onChange={e => setForm({ ...form, rating_value: e.target.value })} className="input">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Parking
          <select value={form.rating_parking} onChange={e => setForm({ ...form, rating_parking: e.target.value })} className="input">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Responsiveness
          <select value={form.rating_responsiveness} onChange={e => setForm({ ...form, rating_responsiveness: e.target.value })} className="input">
            <option value="">—</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label>Photos (up to 3)
          <input
            type="file"
            accept="image/*"
            multiple
            className="input"
            onChange={e => setPhotos(Array.from(e.target.files).slice(0, 3))}
          />
        </label>
      </div>

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}

function ReviewCard({ review, apartmentId, currentUserId, isLandlordOwner, onDelete }) {
  const [voteCount, setVoteCount] = useState(review.vote_count || 0)
  const [voted, setVoted] = useState(!!review.user_voted)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState(review.reply_text || '')
  const [editingReply, setEditingReply] = useState(false)
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const [flagged, setFlagged] = useState(!!review.user_flagged)

  const handleDelete = async () => {
    if (!confirm('Delete this review?')) return
    try {
      await api.deleteReview(apartmentId, review.id)
      onDelete()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleVote = async () => {
    if (!currentUserId) return
    try {
      const data = await api.toggleVote(review.id)
      setVoted(data.voted)
      setVoteCount(data.count)
    } catch {}
  }

  const handleReply = async () => {
    try {
      if (review.reply_text || editingReply) {
        await api.updateReply(review.id, replyText)
      } else {
        await api.replyToReview(review.id, replyText)
      }
      setReplying(false)
      setEditingReply(false)
      window.location.reload()
    } catch {}
  }

  const handleFlag = async (reason) => {
    try {
      if (flagged) {
        await api.unflagReview(review.id)
        setFlagged(false)
      } else {
        await api.flagReview(review.id, reason)
        setFlagged(true)
      }
      setShowFlagMenu(false)
    } catch {}
  }

  // Check if this review belongs to the current user (via verification lookup)
  const isReviewOwner = currentUserId && review.user_voted !== undefined

  return (
    <div className="review-card">
      <div className="review-header">
        <StarRating rating={review.rating_overall} size="sm" />
        <span className="review-author">by {review.display_name}</span>
        <span className="verified-badge small">✓ Verified</span>
        {review.criteria_filled >= 4 && (
          <span className="verified-badge small" style={{ background: '#e8f4e8', color: '#2D5016' }}>✓ Detailed</span>
        )}
        <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#aaa', margin: '0 0 0.5rem' }}>
        Member since {new Date(review.user_created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
      </p>
      <h4>{review.title}</h4>
      <p>{review.review_text}</p>

      {/* Review photos */}
      {review.photos?.length > 0 && (
        <div className="review-photos">
          {review.photos.map(p => <img key={p.id} src={p.photo_data} alt="Review" className="review-photo" />)}
        </div>
      )}

      {/* Sub-ratings */}
      {(review.rating_safety || review.rating_management || review.rating_noise || review.rating_value || review.rating_responsiveness) && (
        <div className="sub-ratings-display">
          {review.rating_safety && <span>Safety: {review.rating_safety}/5</span>}
          {review.rating_management && <span>Management: {review.rating_management}/5</span>}
          {review.rating_noise && <span>Noise: {review.rating_noise}/5</span>}
          {review.rating_value && <span>Rent vs. Quality: {review.rating_value}/5</span>}
          {review.rating_parking && <span>Parking: {review.rating_parking}/5</span>}
          {review.rating_responsiveness && <span>Responsiveness: {review.rating_responsiveness}/5</span>}
        </div>
      )}

      {/* Landlord reply */}
      {review.reply_text && !editingReply && (
        <div className="landlord-reply">
          <span className="reply-label">Landlord response</span>
          <p>{review.reply_text}</p>
          {isLandlordOwner && (
            <button className="btn-link" onClick={() => { setReplyText(review.reply_text); setEditingReply(true) }}>Edit reply</button>
          )}
        </div>
      )}

      {/* Reply form for landlord */}
      {isLandlordOwner && (replying || editingReply) && (
        <div className="reply-form">
          <textarea className="input" rows={3} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your response..." />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm" onClick={handleReply}>Post Reply</button>
            <button className="btn btn-sm btn-outline" onClick={() => { setReplying(false); setEditingReply(false) }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="review-actions">
        <button
          className={`vote-btn${voted ? ' voted' : ''}`}
          onClick={handleVote}
          disabled={!currentUserId}
          title="Mark as helpful"
        >
          👍 {voteCount > 0 ? voteCount : ''} Helpful
        </button>

        {isLandlordOwner && !review.reply_text && !replying && (
          <button className="btn-link" style={{ fontSize: '0.85rem' }} onClick={() => setReplying(true)}>Reply</button>
        )}

        {onDelete && (
          <button onClick={handleDelete} className="btn-link btn-danger" style={{ fontSize: '0.85rem' }}>Delete my review</button>
        )}

        {currentUserId && (
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              className={`flag-btn${flagged ? ' flagged' : ''}`}
              onClick={() => flagged ? handleFlag(null) : setShowFlagMenu(v => !v)}
              title="Report review"
            >
              ⚑
            </button>
            {showFlagMenu && !flagged && (
              <div className="flag-menu">
                {['spam', 'harassment', 'inaccurate', 'other'].map(r => (
                  <button key={r} className="flag-menu-item" onClick={() => handleFlag(r)}>{r}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EditListingForm({ apartment, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: apartment.name,
    street_address: apartment.street_address,
    city: apartment.city,
    state: apartment.state,
    zip_code: apartment.zip_code,
    property_type: apartment.property_type || '',
    year_built: apartment.year_built || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoFiles, setPhotoFiles] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [photos, setPhotos] = useState(apartment.photos || [])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateApartment(apartment.id, {
        ...form,
        year_built: form.year_built ? Number(form.year_built) : undefined,
      })
      if (photoFiles.length > 0) {
        setUploadingPhotos(true)
        const formData = new FormData()
        photoFiles.forEach(f => formData.append('photos', f))
        await api.uploadApartmentPhotos(apartment.id, formData)
        setUploadingPhotos(false)
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.deleteApartmentPhoto(apartment.id, photoId)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="review-form edit-listing-form">
      <h3>Edit Listing</h3>
      {error && <div className="error-msg">{error}</div>}
      <label>Apartment Name
        <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input" required />
      </label>
      <label>Street Address
        <input type="text" value={form.street_address} onChange={e => update('street_address', e.target.value)} className="input" required />
      </label>
      <div className="form-row-inline">
        <label>City
          <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input" required />
        </label>
        <label>State
          <input type="text" value={form.state} onChange={e => update('state', e.target.value)} className="input" required maxLength={2} />
        </label>
      </div>
      <label>Zip Code
        <input type="text" value={form.zip_code} onChange={e => update('zip_code', e.target.value)} className="input" required />
      </label>
      <div className="form-row-inline">
        <label>Property Type
          <select value={form.property_type} onChange={e => update('property_type', e.target.value)} className="input">
            <option value="">— Optional —</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Year Built
          <input type="number" value={form.year_built} onChange={e => update('year_built', e.target.value)} className="input" min="1800" max="2100" />
        </label>
      </div>

      {/* Current photos */}
      {photos.length > 0 && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current photos:</p>
          <div className="photo-thumbs">
            {photos.map(p => (
              <div key={p.id} className="photo-thumb-wrap">
                <img src={p.photo_data} alt="Listing" className="photo-thumb" />
                <button type="button" className="photo-thumb-delete" onClick={() => handleDeletePhoto(p.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload new photos */}
      {photos.length < 5 && (
        <label>Add Photos (up to {5 - photos.length} more)
          <input
            type="file"
            accept="image/*"
            multiple
            className="input"
            onChange={e => setPhotoFiles(Array.from(e.target.files).slice(0, 5 - photos.length))}
          />
        </label>
      )}

      <div className="owner-actions">
        <button type="submit" className="btn" disabled={saving || uploadingPhotos}>
          {saving ? 'Saving...' : uploadingPhotos ? 'Uploading photos...' : 'Save Changes'}
        </button>
        <button type="button" className="btn-link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function ApartmentDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [apartment, setApartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [verificationId, setVerificationId] = useState(null)
  const [checkingVerification, setCheckingVerification] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    api.getApartment(id)
      .then(data => setApartment(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!user || !id || user.role === 'landlord') return
    setCheckingVerification(true)
    api.getMyVerification(id)
      .then(data => setVerificationId(data.verification?.id || null))
      .catch(() => setVerificationId(null))
      .finally(() => setCheckingVerification(false))
  }, [user, id])

  const handleDeleteListing = async () => {
    if (!confirm('Permanently delete this listing and all its data? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.deleteApartment(apartment.id)
      navigate('/')
    } catch (err) {
      alert(err.message)
      setDeleting(false)
    }
  }

  const handleClaim = async () => {
    try {
      await api.claimApartment(apartment.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>
  if (error) return <div className="page"><div className="error-msg">{error}</div></div>
  if (!apartment) return <div className="page"><div className="empty">Apartment not found</div></div>

  const hasReviewed = verificationId && apartment.reviews?.some(r => r.verification_id === verificationId)
  const isOwner = user && apartment.owner_id === user.id
  const isLandlord = user?.role === 'landlord'

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
          {isOwner && !editing && (
            <div className="owner-actions">
              <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit Listing</button>
              <button className="btn btn-sm btn-danger" onClick={handleDeleteListing} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Listing'}
              </button>
            </div>
          )}
        </div>

        {/* Photo gallery */}
        {apartment.photos?.length > 0 && (
          <div className="photo-gallery">
            {apartment.photos.map(p => (
              <img key={p.id} src={p.photo_data} alt="Apartment photo" className="gallery-photo" />
            ))}
          </div>
        )}

        <div className="detail-rating">
          <StarRating rating={apartment.avg_rating} size="lg" />
          <span>({apartment.review_count} review{apartment.review_count !== 1 ? 's' : ''})</span>
        </div>

        {/* Claim listing button */}
        {user?.role === 'landlord' && !apartment.owner_id && (
          <div className="claim-listing">
            <button className="btn btn-sm btn-outline" onClick={handleClaim}>Claim this listing</button>
            <span className="text-muted">Are you the landlord of this property?</span>
          </div>
        )}
      </div>

      {editing && (
        <EditListingForm
          apartment={apartment}
          onSave={() => { setEditing(false); load() }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="reviews-section">
        <h2>Reviews</h2>

        {!user && (
          <p className="text-muted"><Link to="/login">Log in</Link> to write a review.</p>
        )}

        {isLandlord && (
          <p className="text-muted landlord-notice">Landlords cannot submit tenant reviews.</p>
        )}

        {user && !isLandlord && !checkingVerification && !verificationId && (
          <VerificationStep apartment={apartment} onVerified={setVerificationId} />
        )}

        {user && !isLandlord && verificationId && !hasReviewed && (
          <ReviewForm apartmentId={apartment.id} verificationId={verificationId} onSubmit={load} />
        )}

        {!isLandlord && hasReviewed && (
          <p className="text-muted">You've already reviewed this apartment.</p>
        )}

        {apartment.reviews?.length === 0 ? (
          <p className="empty">No reviews yet. Be the first!</p>
        ) : (
          <div className="reviews-list">
            {apartment.reviews.map(r => {
              // Determine if the current user owns this review
              // We check via the verificationId matching
              const isReviewMine = verificationId && r.verification_id === verificationId
              return (
                <ReviewCard
                  key={r.id}
                  review={r}
                  apartmentId={apartment.id}
                  currentUserId={user?.id}
                  isLandlordOwner={isOwner}
                  onDelete={isReviewMine ? load : null}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
