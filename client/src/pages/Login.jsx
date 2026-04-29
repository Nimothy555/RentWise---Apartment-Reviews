import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function Login() {
  const [tab, setTab] = useState('email')

  // Email login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resendStatus, setResendStatus] = useState('')

  // Phone login state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [phoneStep, setPhoneStep] = useState('enter-phone') // 'enter-phone' | 'enter-otp'
  const [phoneError, setPhoneError] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)

  const { login, loginWithPhone } = useAuth()
  const navigate = useNavigate()

  const handleEmailSubmit = async (e) => {
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

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setPhoneError('')
    setPhoneLoading(true)
    try {
      await api.sendPhoneOtp(phone)
      setPhoneStep('enter-otp')
    } catch (err) {
      setPhoneError(err.message)
    } finally {
      setPhoneLoading(false)
    }
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setPhoneError('')
    setPhoneLoading(true)
    try {
      await loginWithPhone(phone, otp)
      navigate('/')
    } catch (err) {
      setPhoneError(err.message)
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="auth-container">
        <h1>Welcome back</h1>
        <p className="text-muted">Log in to browse and leave verified reviews.</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e5e5' }}>
          <button
            type="button"
            onClick={() => setTab('email')}
            style={{
              background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
              fontWeight: tab === 'email' ? 600 : 400,
              borderBottom: tab === 'email' ? '2px solid #2D5016' : '2px solid transparent',
              color: tab === 'email' ? '#2D5016' : '#666',
            }}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setTab('phone')}
            style={{
              background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
              fontWeight: tab === 'phone' ? 600 : 400,
              borderBottom: tab === 'phone' ? '2px solid #2D5016' : '2px solid transparent',
              color: tab === 'phone' ? '#2D5016' : '#666',
            }}
          >
            Phone
          </button>
        </div>

        {tab === 'email' && (
          <>
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

            <form onSubmit={handleEmailSubmit} className="auth-form">
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
          </>
        )}

        {tab === 'phone' && (
          <>
            {phoneError && <div className="error-msg">{phoneError}</div>}

            {phoneStep === 'enter-phone' && (
              <form onSubmit={handleSendOtp} className="auth-form">
                <label>
                  Phone Number
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="input" placeholder="+12125551234" required
                  />
                  <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem', display: 'block' }}>
                    Include country code (e.g. +1 for US)
                  </span>
                </label>
                <button type="submit" className="btn btn-full" disabled={phoneLoading}>
                  {phoneLoading ? 'Sending...' : 'Send Code'}
                </button>
              </form>
            )}

            {phoneStep === 'enter-otp' && (
              <form onSubmit={handlePhoneLogin} className="auth-form">
                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                  We sent a 6-digit code to <strong>{phone}</strong>.
                </p>
                <label>
                  Verification Code
                  <input
                    type="text" value={otp} onChange={e => setOtp(e.target.value)}
                    className="input" placeholder="123456" maxLength={6} required
                  />
                </label>
                <button type="submit" className="btn btn-full" disabled={phoneLoading}>
                  {phoneLoading ? 'Verifying...' : 'Log In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPhoneStep('enter-phone'); setOtp(''); setPhoneError('') }}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center', width: '100%' }}
                >
                  Use a different number
                </button>
              </form>
            )}
          </>
        )}

        <p className="auth-switch">Don't have an account? <Link to="/register">Sign up</Link></p>
      </div>
    </div>
  )
}
