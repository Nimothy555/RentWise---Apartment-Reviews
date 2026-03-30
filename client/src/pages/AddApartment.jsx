import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const PROPERTY_TYPES = ['Apartment', 'Loft', 'Townhouse', 'Studio', 'Condo', 'House']

export default function AddApartment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', street_address: '', city: '', state: '', zip_code: '', property_type: '', year_built: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  if (user.role !== 'landlord') {
    navigate('/')
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = {
        name: form.name,
        street_address: form.street_address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        ...(form.property_type && { property_type: form.property_type }),
        ...(form.year_built && { year_built: Number(form.year_built) }),
      }
      const result = await api.createApartment(data)
      navigate(`/apartments/${result.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="page">
      <div className="auth-container">
        <h1>Add a Listing</h1>
        <p className="text-muted">Share an apartment for others to review.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Apartment Name
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
              className="input" placeholder="e.g. Sunny Heights" required />
          </label>
          <label>
            Street Address
            <input type="text" value={form.street_address} onChange={e => update('street_address', e.target.value)}
              className="input" placeholder="e.g. 412 Park Ave" required />
          </label>
          <div className="form-row-inline">
            <label>
              City
              <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
                className="input" placeholder="e.g. New York" required />
            </label>
            <label>
              State
              <input type="text" value={form.state} onChange={e => update('state', e.target.value)}
                className="input" placeholder="e.g. NY" required maxLength={2} />
            </label>
          </div>
          <label>
            Zip Code
            <input type="text" value={form.zip_code} onChange={e => update('zip_code', e.target.value)}
              className="input" placeholder="e.g. 10001" required />
          </label>
          <div className="form-row-inline">
            <label>
              Property Type
              <select value={form.property_type} onChange={e => update('property_type', e.target.value)} className="input">
                <option value="">— Optional —</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>
              Year Built
              <input type="number" value={form.year_built} onChange={e => update('year_built', e.target.value)}
                className="input" placeholder="e.g. 1995" min="1800" max="2100" />
            </label>
          </div>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Creating...' : 'Add Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}
