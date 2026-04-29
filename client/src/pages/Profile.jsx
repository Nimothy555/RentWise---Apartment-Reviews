import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import StarRating from '../components/StarRating'

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [phoneStep, setPhoneStep] = useState('idle') // 'idle' | 'enter-otp'
  const [phoneMsg, setPhoneMsg] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    api.getMyProfile()
      .then(data => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleAddPhone = async (e) => {
    e.preventDefault()
    setPhoneError('')
    setPhoneMsg('')
    setPhoneLoading(true)
    try {
      await api.addPhone(phoneInput)
      setPhoneStep('enter-otp')
      setPhoneMsg('Code sent! Enter it below to verify your number.')
    } catch (err) {
      setPhoneError(err.message)
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyPhone = async (e) => {
    e.preventDefault()
    setPhoneError('')
    setPhoneLoading(true)
    try {
      await api.verifyPhone(otpInput)
      setPhoneMsg('Phone number verified!')
      setPhoneStep('idle')
      setPhoneInput('')
      setOtpInput('')
      setProfile(p => ({ ...p, phone: phoneInput, phone_verified: 1 }))
    } catch (err) {
      setPhoneError(err.message)
    } finally {
      setPhoneLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>
  if (!profile) return null

  return (
    <div className="page">
      <h1>My Profile</h1>
      <div className="profile-info">
        <h2>{profile.first_name} {profile.last_name}</h2>
        <p className="text-muted">{profile.email}</p>
        <p className="text-muted">Role: {profile.role === 'landlord' ? 'Landlord' : 'Renter'}</p>
        <p className="text-muted">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
      </div>

      <div style={{ marginTop: '2rem', marginBottom: '2rem', padding: '1.25rem', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Phone Number</h2>

        {profile.phone ? (
          <p className="text-muted">
            {profile.phone}&nbsp;
            {profile.phone_verified
              ? <span style={{ color: '#2D5016', fontWeight: 600 }}>✓ Verified</span>
              : <span style={{ color: '#c0392b' }}>Not verified</span>}
          </p>
        ) : (
          <p className="text-muted">No phone number added.</p>
        )}

        {phoneMsg && <p style={{ color: '#2D5016', marginBottom: '0.5rem' }}>{phoneMsg}</p>}
        {phoneError && <p style={{ color: '#c0392b', marginBottom: '0.5rem' }}>{phoneError}</p>}

        {phoneStep === 'idle' && (
          <form onSubmit={handleAddPhone} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
              className="input" placeholder="+12125551234" style={{ flex: 1, minWidth: '180px' }}
              required
            />
            <button type="submit" className="btn" disabled={phoneLoading}>
              {phoneLoading ? 'Sending...' : profile.phone ? 'Update & Verify' : 'Add & Verify'}
            </button>
          </form>
        )}

        {phoneStep === 'enter-otp' && (
          <form onSubmit={handleVerifyPhone} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)}
              className="input" placeholder="6-digit code" maxLength={6} style={{ flex: 1, minWidth: '140px' }}
              required
            />
            <button type="submit" className="btn" disabled={phoneLoading}>
              {phoneLoading ? 'Verifying...' : 'Verify'}
            </button>
            <button type="button" className="btn" onClick={() => { setPhoneStep('idle'); setPhoneError(''); setOtpInput('') }}
              style={{ background: 'none', border: '1px solid #ccc', color: '#666' }}>
              Cancel
            </button>
          </form>
        )}
      </div>

      <h2>My Reviews ({profile.reviews.length})</h2>

      {profile.reviews.length === 0 ? (
        <p className="empty">You haven't written any reviews yet. <Link to="/">Browse apartments</Link> to get started.</p>
      ) : (
        <div className="reviews-list">
          {profile.reviews.map(r => (
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
  )
}
