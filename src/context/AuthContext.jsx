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

  /** Actualiza campos puntuales del usuario sin cerrar sesión (ej: avatarUrl, fullName) */
  const updateUser = (fields) => {
    setAuth((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...fields }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const isAuthenticated = !!auth?.token
  const isBusinessOwner = auth?.role === 'BUSINESS_OWNER'
  const isSuperAdmin = auth?.role === 'SUPER_ADMIN'
  const isPending = auth?.status === 'PENDING'
  const isRejected = auth?.status === 'REJECTED'
  const isActive = auth?.status === 'ACTIVE'

  return (
    <AuthContext.Provider value={{ user: auth, token: auth?.token, login, logout, updateUser, isAuthenticated, isBusinessOwner, isSuperAdmin, isPending, isRejected, isActive }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
