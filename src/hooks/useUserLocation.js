import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'weserv_user_location'
const PERMISSION_KEY = 'weserv_location_permission' // 'granted' | 'denied' | 'prompt'

/**
 * Hook para obtener y persistir la ubicación del usuario.
 *
 * Estados de permiso:
 * - null       → todavía no se ha preguntado
 * - 'granted'  → el usuario aceptó (ubicación guardada)
 * - 'denied'   → el usuario rechazó
 * - 'prompt'   → el navegador todavía espera respuesta
 *
 * @returns {{ location, permission, loading, error, requestLocation, dismissLocation }}
 */
export function useUserLocation() {
  const [location, setLocation] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [permission, setPermission] = useState(() => {
    return localStorage.getItem(PERMISSION_KEY) || null
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Intenta obtener la ubicación vía Geolocation API
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setPermission('denied')
      localStorage.setItem(PERMISSION_KEY, 'denied')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
        }
        setLocation(loc)
        setPermission('granted')
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
        localStorage.setItem(PERMISSION_KEY, 'granted')
        setLoading(false)
      },
      (err) => {
        console.warn('Geolocation error:', err.message)
        setError(err.message)
        setPermission('denied')
        localStorage.setItem(PERMISSION_KEY, 'denied')
        setLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // 5 min cache
      }
    )
  }, [])

  // El usuario descarta el banner → no preguntar más en esta sesión
  const dismissLocation = useCallback(() => {
    setPermission('denied')
    localStorage.setItem(PERMISSION_KEY, 'denied')
  }, [])

  // Resetear permiso (para "volver a intentar" desde ajustes, etc.)
  const resetPermission = useCallback(() => {
    setPermission(null)
    setLocation(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(PERMISSION_KEY)
  }, [])

  return { location, permission, loading, error, requestLocation, dismissLocation, resetPermission }
}

/**
 * Calcula la distancia entre dos puntos (lat/lng) usando la fórmula Haversine.
 * Retorna la distancia en kilómetros.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // radio de la Tierra en km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Formatea distancia en km a texto legible.
 * < 1 km → "850 m"
 * 1-10 km → "2.3 km"
 * 10+ km → "15 km"
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
