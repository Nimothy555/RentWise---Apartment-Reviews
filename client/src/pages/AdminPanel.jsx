import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const DOC_LABELS = { lease: 'Lease Agreement', utility_bill: 'Utility Bill', postal_mail: 'Postal Mail' }

export default function AdminPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (!user) return navigate('/login')
    if (user.role !== 'admin') return navigate('/')
    api.getAdminVerifications()
      .then(data => setVerifications(data.verifications))
      .catch(err => setActionError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  async function decide(id, status) {
    setActionError(null)
    try {
      await api.updateVerificationStatus(id, status)
      setVerifications(prev => prev.filter(v => v.id !== id))
      if (preview?.id === id) setPreview(null)
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading) return <div className="page-container"><p>Loading...</p></div>

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Pending Verifications</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {verifications.length === 0 ? 'All caught up.' : `${verifications.length} submission${verifications.length !== 1 ? 's' : ''} awaiting review`}
        </p>
      </div>

      {actionError && <div className="error-msg" style={{ marginBottom: '1rem' }}>{actionError}</div>}

      {verifications.length === 0 ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {verifications.map(v => (
            <div key={v.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <p style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}>{v.first_name} {v.last_name}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>{v.email}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>{v.apartment_name}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#555' }}>
                    {v.street_address}, {v.city}, {v.state} {v.zip_code}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>
                    {DOC_LABELS[v.doc_type] || v.doc_type} &nbsp;&middot;&nbsp; Submitted {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#f0f0f0', color: '#333' }}
                    onClick={() => setPreview(preview?.id === v.id ? null : v)}
                  >
                    {preview?.id === v.id ? 'Hide Document' : 'View Document'}
                  </button>
                  <button className="btn btn-sm" onClick={() => decide(v.id, 'verified')}>
                    Approve
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#c0392b', color: '#fff' }}
                    onClick={() => decide(v.id, 'failed')}
                  >
                    Deny
                  </button>
                </div>
              </div>

              {preview?.id === v.id && (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #eee', paddingTop: '1.25rem' }}>
                  {v.document_url.startsWith('data:image') ? (
                    <img
                      src={v.document_url}
                      alt="Submitted document"
                      style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                  ) : v.document_url.startsWith('data:application/pdf') ? (
                    <iframe
                      src={v.document_url}
                      title="Submitted document"
                      style={{ width: '100%', height: '500px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                  ) : (
                    <a href={v.document_url} download="document" className="btn btn-sm">Download Document</a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
