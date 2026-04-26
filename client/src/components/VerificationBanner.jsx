import { useState } from 'react'
import { api } from '../api'

export default function VerificationBanner({ user }) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [verifying, setVerifying] = useState(false)

  if (!user || user.is_verified) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await api.resendVerification()
      setSent(true)
      setShowOtp(true)
    } catch {}
    setSending(false)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim()) return
    setVerifying(true)
    setOtpError('')
    try {
      const data = await api.verifyOtp(user.email, otp.trim())
      if (data.token) localStorage.setItem('token', data.token)
      window.location.reload()
    } catch (err) {
      setOtpError(err.message || 'Invalid code')
    }
    setVerifying(false)
  }

  return (
    <div className="unverified-banner">
      {!showOtp ? (
        <>
          <span><strong>Please verify your email</strong> — check your inbox for a verification link or code.</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="btn btn-sm btn-outline" onClick={() => setShowOtp(true)}>
              Enter code
            </button>
            {sent ? (
              <span className="text-muted">Email sent!</span>
            ) : (
              <button className="btn btn-sm btn-outline" onClick={handleResend} disabled={sending}>
                {sending ? 'Sending...' : 'Resend email'}
              </button>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span><strong>Enter your 6-digit code:</strong></span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="input"
            style={{ width: '8rem' }}
            autoFocus
          />
          <button type="submit" className="btn btn-sm" disabled={verifying || otp.length !== 6}>
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowOtp(false)}>
            Cancel
          </button>
          {otpError && <span className="error-msg">{otpError}</span>}
          {!sent && (
            <button type="button" className="btn-link" onClick={handleResend} disabled={sending} style={{ fontSize: '0.85rem' }}>
              {sending ? 'Sending...' : 'Resend email'}
            </button>
          )}
        </form>
      )}
    </div>
  )
}
