import { Link } from 'react-router-dom'
import StarRating from './StarRating'

export default function ApartmentCard({ apartment }) {
  const { id, name, street_address, city, state, property_type, year_built, avg_rating, review_count } = apartment

  return (
    <Link to={`/apartments/${id}`} className="apartment-card">
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
