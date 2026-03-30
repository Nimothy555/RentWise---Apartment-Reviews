import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleRoleSelect = (selected) => {
    setRole(selected)
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(firstName, lastName, email, password, role)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="auth-container">

        {step === 1 && (
          <>
            <h1>Create an account</h1>
            <p className="text-muted">How will you be using RentWise?</p>
            <div className="role-cards">
              <button className="role-card" onClick={() => handleRoleSelect('renter')}>
                <span className="role-icon">🏠</span>
                <strong>I'm a Renter</strong>
                <p>Find apartments and share honest reviews based on your experience.</p>
              </button>
              <button className="role-card" onClick={() => handleRoleSelect('landlord')}>
                <span className="role-icon">🔑</span>
                <strong>I'm a Landlord</strong>
                <p>List your properties and manage your rental portfolio.</p>
              </button>
            </div>
            <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
          </>
        )}

        {step === 2 && (
          <>
            <button className="btn-link back-step" onClick={() => setStep(1)}>← Change role</button>
            <h1>{role === 'landlord' ? 'Landlord' : 'Renter'} Sign Up</h1>
            <p className="text-muted">
              {role === 'landlord'
                ? 'List and manage your rental properties on RentWise.'
                : 'Join RentWise to find and review apartments.'}
            </p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
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
          </>
        )}

      </div>
    </div>
  )
}
