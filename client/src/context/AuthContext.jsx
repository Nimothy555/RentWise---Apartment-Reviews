import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

// Decode JWT payload locally — no signature check, just for instant state hydration
function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    // Discard already-expired tokens immediately
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // Seed user state instantly from localStorage — no page-refresh flicker or false logout
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    if (!token) return null
    const decoded = decodeToken(token)
    if (!decoded) { localStorage.removeItem('token'); return null }
    return {
      id:          decoded.id,
      first_name:  decoded.first_name,
      last_name:   decoded.last_name,
      email:       decoded.email,
      role:        decoded.role,
      is_verified: decoded.is_verified,
    }
  })

  // loading is only true while the background server verification is in flight
  const [loading, setLoading] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    // Background server check — catches revoked or server-invalidated tokens
    api.getMe()
      .then(data => setUser(data.user))
      .catch(err => {
        // Only log out on a hard 401 rejection — never on network errors or server cold starts
        if (err.status === 401) {
          localStorage.removeItem('token')
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const register = async (first_name, last_name, email, password, role, phone) => {
    const data = await api.register({ first_name, last_name, email, password, role, ...(phone ? { phone } : {}) })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const loginWithPhone = async (phone, otp) => {
    const data = await api.loginPhone(phone, otp)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const logout = async () => {
    try { await api.logout() } catch { /* ignore network errors on logout */ }
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithPhone, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
