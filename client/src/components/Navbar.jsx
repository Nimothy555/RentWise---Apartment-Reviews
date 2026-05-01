import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setMenuOpen(false)
    navigate('/')
  }

  const close = () => setMenuOpen(false)

  return (
    <nav className="navbar">
      <div className="nav-content">
        <Link to="/" className="nav-logo" onClick={close}>
          <span className="logo-dot"></span>RentWise<span className="logo-dot"></span>
        </Link>

        <button
          className={`nav-hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>

        <div className={`nav-links${menuOpen ? ' nav-links--open' : ''}`}>
          <Link to="/" onClick={close}>Browse</Link>
          {user ? (
            <>
              <Link to="/dashboard" onClick={close}>Dashboard</Link>
              <Link to="/add" onClick={close}>Add Listing</Link>
              <Link to="/saved" onClick={close}>Saved</Link>
              <Link to="/profile" onClick={close}>My Profile</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn btn-sm" onClick={close}>Admin Panel</Link>
              )}
              <button onClick={handleLogout} className="btn-link">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login" onClick={close}>Login</Link>
              <Link to="/register" className="btn btn-sm" onClick={close}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
