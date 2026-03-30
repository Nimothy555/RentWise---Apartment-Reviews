import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return }
    api.verifyEmail(token)
      .then(data => { setStatus('success'); setMessage(data.message || 'Email verified!') })
      .catch(err => { setStatus('error'); setMessage(err.message) })
  }, [])

  return (
    <div className="page">
      <div className="auth-form">
        {status === 'loading' && <p>Verifying your email...</p>}
        {status === 'success' && (
          <>
            <h2>Email Verified!</h2>
            <p>{message}</p>
            <Link to="/" className="btn btn-full">Go to Home</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h2>Verification Failed</h2>
            <p className="error-msg">{message}</p>
            <Link to="/" className="btn-link">Go to Home</Link>
          </>
        )}
      </div>
    </div>
  )
}
