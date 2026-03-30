import { Link } from 'react-router-dom'
import StarRating from './StarRating'

export default function ApartmentCard({ apartment, saved, onToggleSave }) {
  const { id, name, street_address, city, state, property_type, year_built, avg_rating, review_count, photo } = apartment

  const handleSaveClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleSave) onToggleSave(id)
  }

  return (
    <Link to={`/apartments/${id}`} className="apartment-card">
      {onToggleSave && (
        <button
          className={`save-btn${saved ? ' saved' : ''}`}
          onClick={handleSaveClick}
          title={saved ? 'Remove from saved' : 'Save listing'}
        >
          {saved ? '♥' : '♡'}
        </button>
      )}
      {photo && (
        <div className="card-photo">
          <img src={photo} alt={name} />
        </div>
      )}
      <div className="card-header">
        <h3>{name}</h3>
      </div>
      <p className="card-address">{street_address}, {city}, {state}</p>
      <div className="card-details">
        {property_type && <span className="badge">{property_type}</span>}
        {year_built && <span>Built {year_built}</span>}
      </div>
      <div className="card-footer">
        <StarRating rating={avg_rating} size="sm" />
        <span className="review-count">{review_count} review{review_count !== 1 ? 's' : ''}</span>
      </div>
    </Link>
  )
}
