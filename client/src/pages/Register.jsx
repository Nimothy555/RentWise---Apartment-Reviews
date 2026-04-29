import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(firstName, lastName, email, password, 'renter', phone || undefined)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="page">
        <div className="auth-container">
          <h1>Check your inbox</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            We sent a verification link to <strong>{email}</strong>. Click it to activate your account, then log in.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="btn btn-full">Go to Login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="auth-container">
        <h1>Create an account</h1>
        <p className="text-muted">Join RentWise to find and review apartments.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row-inline">
            <label>
              First Name
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className="input" placeholder="First name" required />
            </label>
            <label>
              Last Name
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className="input" placeholder="Last name" required />
            </label>
          </div>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="At least 8 characters" required minLength={8} />
          </label>
          <label>
            Phone Number <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="input" placeholder="+12125551234" />
            <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem', display: 'block' }}>
              Add a phone number to enable phone login
            </span>
          </label>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}
