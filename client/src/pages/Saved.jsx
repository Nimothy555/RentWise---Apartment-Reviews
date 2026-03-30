import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import ApartmentCard from '../components/ApartmentCard'

export default function Saved() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    api.getSaved()
      .then(data => {
        setApartments(data.apartments || [])
        setSavedIds(new Set((data.apartments || []).map(a => a.id)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleToggleSave = async (aptId) => {
    try {
      const data = await api.toggleSave(aptId)
      if (!data.saved) {
        setApartments(prev => prev.filter(a => a.id !== aptId))
        setSavedIds(prev => { const s = new Set(prev); s.delete(aptId); return s })
      }
    } catch {}
  }

  if (loading) return <div className="page"><div className="loading">Loading saved listings...</div></div>

  return (
    <div className="page">
      <h1>Saved Listings</h1>
      {apartments.length === 0 ? (
        <p className="empty">No saved listings yet. <Link to="/">Browse apartments</Link> to get started.</p>
      ) : (
        <div className="apartment-grid">
          {apartments.map(apt => (
            <ApartmentCard
              key={apt.id}
              apartment={apt}
              saved={savedIds.has(apt.id)}
              onToggleSave={() => handleToggleSave(apt.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
