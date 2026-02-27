import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'barbershop_auth'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (authData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
    setAuth(authData)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

  const isAuthenticated = !!auth?.token
  const isBarber = auth?.role === 'BARBER'

  return (
    <AuthContext.Provider value={{ user: auth, token: auth?.token, login, logout, isAuthenticated, isBarber }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
