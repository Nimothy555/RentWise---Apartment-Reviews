import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resendStatus, setResendStatus] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setResendStatus('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      if (err.status === 403) {
        setUnverified(true)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendStatus('sending')
    try {
      await api.resendVerificationByEmail(email)
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  return (
    <div className="page">
      <div className="auth-container">
        <h1>Welcome back</h1>
        <p className="text-muted">Log in to browse and leave verified reviews.</p>

        {error && <div className="error-msg">{error}</div>}

        {unverified && (
          <div className="error-msg" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '0.75rem' }}>Your email isn't verified yet. Check your inbox or resend the link.</p>
            {resendStatus === 'sent' ? (
              <p style={{ color: '#2D5016', fontWeight: 500 }}>Verification email sent! Check your inbox.</p>
            ) : (
              <button
                className="btn btn-full"
                onClick={handleResend}
                disabled={resendStatus === 'sending'}
              >
                {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
            {resendStatus === 'error' && <p style={{ marginTop: '0.5rem' }}>Failed to send. Please try again.</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input" placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="input" placeholder="••••••••" required />
          </label>
          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.85rem' }}>
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        </form>

        <p className="auth-switch">Don't have an account? <Link to="/register">Sign up</Link></p>
      </div>
    </div>
  )
}
