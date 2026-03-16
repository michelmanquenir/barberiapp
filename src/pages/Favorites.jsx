import { Heart, Star, Calendar, Scissors, MapPin, Users, Store } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function Favorites() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('barbers') // 'barbers' | 'shops'
  const [barberFavs, setBarberFavs] = useState([])
  const [shopFavs, setShopFavs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getFavorites(user.userId).catch(() => []),
      api.getFavoriteShops(user.userId).catch(() => []),
    ]).then(([barbers, shops]) => {
      setBarberFavs(barbers || [])
      setShopFavs(shops || [])
    }).finally(() => setLoading(false))
  }, [user.userId])

  const handleRemoveBarber = useCallback(async (favoriteId) => {
    try {
      await api.removeFavorite(favoriteId, user.userId)
      setBarberFavs(prev => prev.filter(f => f.id !== favoriteId))
    } catch (err) {
      console.error('Error al eliminar favorito:', err)
    }
  }, [user.userId])

  const handleRemoveShop = useCallback(async (favoriteId) => {
    try {
      await api.removeFavoriteShop(favoriteId, user.userId)
      setShopFavs(prev => prev.filter(f => f.id !== favoriteId))
    } catch (err) {
      console.error('Error al eliminar favorito:', err)
    }
  }, [user.userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-50 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando favoritos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Favoritos</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('barbers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'barbers'
                ? 'bg-gray-900 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            <Users className="w-4 h-4" />
            Profesionales
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'barbers' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {barberFavs.length}
            </span>
          </button>
          <button
            onClick={() => setTab('shops')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'shops'
                ? 'bg-gray-900 text-white'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            <Store className="w-4 h-4" />
            Negocios
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'shops' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {shopFavs.length}
            </span>
          </button>
        </div>

        {/* ── Tab: Barberos ── */}
        {tab === 'barbers' && (
          barberFavs.length === 0 ? (
            <EmptyState
              icon={<Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
              title="Aún no tienes profesionales favoritos"
              desc="Explora los negocios y marca como favoritos a tus profesionales preferidos"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {barberFavs.map((fav) => {
                const barber = fav.barber
                const specialties = parseSpecialties(barber?.specialties)
                return (
                  <div key={fav.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {barber?.imageUrl
                          ? <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                          : <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        }
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{barber?.name ?? '—'}</h3>
                        {barber?.rating != null && barber.rating > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm text-yellow-600 font-medium">
                              {Number(barber.rating).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Quitar */}
                      <button
                        onClick={() => handleRemoveBarber(fav.id)}
                        title="Quitar de favoritos"
                        className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition flex-shrink-0"
                      >
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </button>
                    </div>

                    {/* Bio */}
                    {barber?.bio && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{barber.bio}</p>
                    )}

                    {/* Especialidades */}
                    {specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {specialties.map((s, i) => (
                          <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Tab: Barberías ── */}
        {tab === 'shops' && (
          shopFavs.length === 0 ? (
            <EmptyState
              icon={<Store className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
              title="Aún no tienes negocios favoritos"
              desc="Explora los negocios y guarda tus preferidos"
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {shopFavs.map((fav) => {
                const shop = fav.shop
                return (
                  <div key={fav.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Icono negocio */}
                      <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{shop?.name ?? '—'}</h3>
                        {shop?.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{shop.address}</span>
                          </p>
                        )}
                      </div>
                      {/* Quitar */}
                      <button
                        onClick={() => handleRemoveShop(fav.id)}
                        title="Quitar de favoritos"
                        className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition flex-shrink-0"
                      >
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </button>
                    </div>

                    {/* Descripción */}
                    {shop?.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{shop.description}</p>
                    )}

                    {/* Botón reservar */}
                    {shop?.slug && (
                      <button
                        onClick={() => navigate(`/book/${shop.slug}`)}
                        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-700 transition"
                      >
                        <Calendar className="w-4 h-4" />
                        Reservar cita
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseSpecialties(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500">{desc}</p>
    </div>
  )
}

export default Favorites
