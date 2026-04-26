import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import ApartmentCard from '../components/ApartmentCard'
import ApartmentMap from '../components/ApartmentMap'

export default function Home() {
  const { user } = useAuth()
  const [apartments, setApartments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '', minRating: '', sort: 'newest', page: 1, property_type: '', city: ''
  })
  const [filterOptions, setFilterOptions] = useState({ property_types: [], cities: [] })
  const [savedIds, setSavedIds] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid')
  const [heroSearch, setHeroSearch] = useState('')

  useEffect(() => {
    api.getFilterOptions().then(setFilterOptions).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    api.getSaved()
      .then(data => setSavedIds(new Set((data.apartments || []).map(a => a.id))))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    setLoading(true)
    const params = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null) params[k] = v
    })
    api.getApartments(params)
      .then(data => {
        setApartments(data.apartments)
        setPagination(data.pagination)
      })
      .catch(() => setApartments([]))
      .finally(() => setLoading(false))
  }, [filters])

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleHeroSearch = (e) => {
    e.preventDefault()
    updateFilter('search', heroSearch)
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleToggleSave = async (aptId) => {
    if (!user) return
    try {
      const data = await api.toggleSave(aptId)
      setSavedIds(prev => {
        const s = new Set(prev)
        if (data.saved) s.add(aptId)
        else s.delete(aptId)
        return s
      })
    } catch {}
  }

  return (
    <>
      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-inner">
          <h1>Find honest apartment reviews<br />you can <em>trust</em></h1>
          <p>Real experiences from verified renters — no sponsored ratings, no landlord bias.</p>

          <div className="trust-pills">
            <span className="pill pill-sage">✓ Lease verified</span>
            <span className="pill pill-sage">✓ Secure document processing</span>
            <span className="pill pill-gold">★ No landlord-sponsored ratings</span>
          </div>

          <form className="search-wrap" onSubmit={handleHeroSearch}>
            <input
              type="text"
              className="input"
              placeholder="Search by name, address, city or zip..."
              value={heroSearch}
              onChange={e => setHeroSearch(e.target.value)}
            />
            <button type="submit" className="search-btn">Search</button>
          </form>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="section">
        <div className="section-head">
          <span className="logo-dot"></span>
          <h2>How it works</h2>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Search your building</h3>
            <p>Browse thousands of apartment listings across the US. Filter by city, type, or rating.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Read verified reviews</h3>
            <p>Every reviewer uploads their lease to confirm they actually lived there — no fake posts.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Rent with confidence</h3>
            <p>Make informed decisions backed by honest, unbiased feedback from real tenants.</p>
          </div>
        </div>
      </div>

      {/* ── Listings ── */}
      <div className="page" id="listings">
        <div className="filters">
          <input
            type="text"
            placeholder="Search by name, address, city or zip..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="input search-input"
          />
          <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className="input">
            <option value="newest">Newest</option>
            <option value="rating">Rating</option>
            <option value="reviews">Most Reviews</option>
          </select>
          <select value={filters.property_type} onChange={e => updateFilter('property_type', e.target.value)} className="input">
            <option value="">All Types</option>
            {filterOptions.property_types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={filters.city} onChange={e => updateFilter('city', e.target.value)} className="input">
            <option value="">All Cities</option>
            {filterOptions.cities.map(c => (
              <option key={`${c.city}-${c.state}`} value={c.city}>{c.city}, {c.state}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button
              className={`btn btn-sm${viewMode === 'grid' ? '' : ' btn-outline'}`}
              onClick={() => setViewMode('grid')}
            >Grid</button>
            <button
              className={`btn btn-sm${viewMode === 'map' ? '' : ' btn-outline'}`}
              onClick={() => setViewMode('map')}
            >Map</button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <ApartmentMap apartments={loading ? [] : apartments} />
        ) : loading ? (
          <div className="loading">Loading apartments...</div>
        ) : apartments.length === 0 ? (
          <div className="empty">No apartments found. Try adjusting your filters.</div>
        ) : (
          <>
            <div className="apartment-grid">
              {apartments.map(apt => (
                <ApartmentCard
                  key={apt.id}
                  apartment={apt}
                  saved={savedIds.has(apt.id)}
                  onToggleSave={user ? handleToggleSave : undefined}
                />
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  className="btn btn-outline"
                >Previous</button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  className="btn btn-outline"
                >Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="footer">
        <span className="footer-brand">RentWise</span>
        <div className="footer-links">
          <a href="#">About</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  )
}
