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
      <h1 className="page-title">Admin — Pending Verifications</h1>

      {actionError && <div className="error-msg" style={{ marginBottom: '1rem' }}>{actionError}</div>}

      {verifications.length === 0 ? (
        <p className="text-muted">No pending verifications.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {verifications.map(v => (
            <div key={v.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{v.first_name} {v.last_name}</p>
                  <p style={{ margin: '0.15rem 0', color: '#555', fontSize: '0.9rem' }}>{v.email}</p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.9rem' }}>
                    <strong>{v.apartment_name}</strong> — {v.street_address}, {v.city}, {v.state} {v.zip_code}
                  </p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.85rem', color: '#888' }}>
                    {DOC_LABELS[v.doc_type] || v.doc_type} · Submitted {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#f0f0f0', color: '#333' }}
                    onClick={() => setPreview(preview?.id === v.id ? null : v)}
                  >
                    {preview?.id === v.id ? 'Hide Doc' : 'View Doc'}
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
                <div style={{ marginTop: '1rem' }}>
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
