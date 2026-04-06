import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="nav-content">
      <Link to="/" className="nav-logo">
        <span className="logo-dot"></span>RentWise<span className="logo-dot"></span>
      </Link>
        <div className="nav-links">
          <Link to="/">Browse</Link>
          {user ? (
            <>
              {user.role === 'landlord' && <Link to="/add">+ Add Listing</Link>}
              {user.role === 'landlord' && <Link to="/my-listings">My Listings</Link>}
              {user.role !== 'landlord' && <Link to="/dashboard">Dashboard</Link>}
              {user.role !== 'landlord' && <Link to="/saved">Saved</Link>}
              <Link to="/profile">My Profile</Link>
              <button onClick={handleLogout} className="btn-link">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login">Login</Link>
              <Link to="/register" className="btn btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
