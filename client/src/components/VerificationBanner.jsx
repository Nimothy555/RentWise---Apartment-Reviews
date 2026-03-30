import { useState } from 'react'
import { api } from '../api'

export default function VerificationBanner({ user }) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  if (!user || user.is_verified) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await api.resendVerification()
      setSent(true)
    } catch {}
    setSending(false)
  }

  return (
    <div className="unverified-banner">
      <span><strong>Please verify your email</strong> — check your inbox for a verification link.</span>
      {sent ? (
        <span className="text-muted">Email sent!</span>
      ) : (
        <button className="btn btn-sm btn-outline" onClick={handleResend} disabled={sending}>
          {sending ? 'Sending...' : 'Resend email'}
        </button>
      )}
    </div>
  )
}
