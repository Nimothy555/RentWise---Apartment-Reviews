import { useState, useEffect } from 'react'
import { api } from '../api'
import ApartmentCard from '../components/ApartmentCard'

export default function Home() {
  const [apartments, setApartments] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '', minRating: '', sort: 'newest', page: 1
  })

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

  return (
    <div className="page">
      <div className="hero">
        <h1>Real reviews from real renters</h1>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search apartments..."
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          className="input search-input"
        />
        <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className="input">
          <option value="newest">Newest</option>
          <option value="rating">Rating</option>
          <option value="reviews">Most Reviews</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading apartments...</div>
      ) : apartments.length === 0 ? (
        <div className="empty">No apartments found. Try adjusting your filters.</div>
      ) : (
        <>
          <div className="apartment-grid">
            {apartments.map(apt => <ApartmentCard key={apt.id} apartment={apt} />)}
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
  )
}
