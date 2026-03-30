import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.getMe()
      .then(data => setUser(data.user))
      .catch((err) => {
        // Only clear the token if the server explicitly rejects it (401)
        // Network errors (server down, no connection) should keep the token intact
        if (err.status === 401) {
          localStorage.removeItem('token')
        }
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const register = async (first_name, last_name, email, password, role) => {
    const data = await api.register({ first_name, last_name, email, password, role })
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const logout = async () => {
    await api.logout()
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
