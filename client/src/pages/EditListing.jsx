import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const PROPERTY_TYPES = ['Apartment', 'House', 'Condo', 'Townhouse', 'Studio']
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

export default function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', street_address: '', city: '', state: '', zip_code: '',
    property_type: '', year_built: ''
  })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'landlord') { navigate('/'); return }

    api.getApartment(id)
      .then(apt => {
        // Only the owner can edit
        if (apt.owner_id !== user.id) { navigate('/my-listings'); return }
        setForm({
          name:          apt.name          || '',
          street_address: apt.street_address || '',
          city:          apt.city          || '',
          state:         apt.state         || '',
          zip_code:      apt.zip_code      || '',
          property_type: apt.property_type || '',
          year_built:    apt.year_built    ? String(apt.year_built) : ''
        })
      })
      .catch(() => navigate('/my-listings'))
      .finally(() => setLoading(false))
  }, [id, user])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.updateApartment(id, {
        ...form,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        property_type: form.property_type || null
      })
      setSuccess(true)
      setTimeout(() => navigate('/my-listings'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page"><div className="loading">Loading...</div></div>

  return (
    <div className="page">
      <div className="auth-container" style={{ maxWidth: 600 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Link to="/my-listings" className="btn-link" style={{ fontSize: '0.9rem' }}>← My Listings</Link>
        </div>

        <h1 style={{ marginBottom: '0.25rem' }}>Edit Listing</h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Update your property details. Changes are visible to renters immediately.
        </p>

        {error   && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">✅ Listing updated! Redirecting...</div>}

        <form onSubmit={handleSubmit} className="auth-form">

          <label>
            Listing Name
            <input
              className="input" type="text" value={form.name}
              onChange={set('name')} placeholder="e.g. Sunset Apartments" required
            />
          </label>

          <label>
            Street Address
            <input
              className="input" type="text" value={form.street_address}
              onChange={set('street_address')} placeholder="123 Main St" required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              City
              <input
                className="input" type="text" value={form.city}
                onChange={set('city')} placeholder="Austin" required
              />
            </label>
            <label>
              State
              <select className="input" value={form.state} onChange={set('state')} required>
                <option value="">Select state</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              ZIP Code
              <input
                className="input" type="text" value={form.zip_code}
                onChange={set('zip_code')} placeholder="78701" required
                maxLength={10}
              />
            </label>
            <label>
              Year Built
              <input
                className="input" type="number" value={form.year_built}
                onChange={set('year_built')} placeholder="e.g. 1998"
                min={1800} max={new Date().getFullYear()}
              />
            </label>
          </div>

          <label>
            Property Type
            <select className="input" value={form.property_type} onChange={set('property_type')}>
              <option value="">Select type (optional)</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/my-listings" className="btn btn-outline btn-full" style={{ textAlign: 'center' }}>
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </div>
  )
}
