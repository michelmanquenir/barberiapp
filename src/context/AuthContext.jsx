import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'barbershop_auth'

/** Decodifica el payload de un JWT sin librería externa */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/** Devuelve true si el token JWT ya expiró */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 < Date.now()
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      const parsed = JSON.parse(stored)
      // Si el token ya expiró al cargar, no restaurar la sesión
      if (parsed?.token && isTokenExpired(parsed.token)) {
        localStorage.removeItem(STORAGE_KEY)
        sessionStorage.setItem('session_expired', '1')
        return null
      }
      return parsed
    } catch {
      return null
    }
  })

  const login = (authData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
    setAuth(authData)
  }

  const logout = (expired = false) => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
    if (expired) {
      sessionStorage.setItem('session_expired', '1')
    }
  }

  // Escuchar el evento auth:expired que dispara api.js cuando recibe 401/403
  useEffect(() => {
    const handleExpired = () => {
      localStorage.removeItem(STORAGE_KEY)
      setAuth(null)
      sessionStorage.setItem('session_expired', '1')
      // Redirigir al login con recarga completa para limpiar estado
      window.location.href = '/login'
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [])

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
  const isSuperAdmin = auth?.role === 'SUPER_ADMIN'
  // Super admin tiene acceso a todo — también pasa el guard de business owner
  const isBusinessOwner = auth?.role === 'BUSINESS_OWNER' || isSuperAdmin
  const isPending = auth?.status === 'PENDING'
  const isRejected = auth?.status === 'REJECTED'
  const isActive = auth?.status === 'ACTIVE'
  const mustChangePassword = !!auth?.mustChangePassword

  /** Llama esto tras cambiar la contraseña exitosamente para limpiar el flag */
  const clearMustChangePassword = () => updateUser({ mustChangePassword: false })

  return (
    <AuthContext.Provider value={{ user: auth, token: auth?.token, login, logout, updateUser, isAuthenticated, isBusinessOwner, isSuperAdmin, isPending, isRejected, isActive, mustChangePassword, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
