import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(firstName, lastName, email, password, 'renter')
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
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}
