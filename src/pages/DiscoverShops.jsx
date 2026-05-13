import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, Marker, InfoWindow, Circle } from '@react-google-maps/api'
import {
  Heart,
  MapPin,
  Star,
  Users,
  Store,
  Search,
  X,
  Scissors,
  Images,
  Navigation,
  Loader2,
  LocateFixed,
  ShoppingBag,
  Car,
  Dumbbell,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import { useUserLocation, haversineDistance, formatDistance } from '../hooks/useUserLocation'

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 }
const MAP_STYLES = { height: '100%', width: '100%' }
const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
}

function getShopRating(barbers) {
  if (!barbers || barbers.length === 0) return null
  const sum = barbers.reduce((acc, b) => acc + (b.rating || 0), 0)
  return (sum / barbers.length).toFixed(1)
}

const CATEGORY_CONFIG = {
  barberia:         { label: 'Barbería',    Icon: Scissors,    color: 'bg-blue-50   text-blue-700   dark:bg-blue-950   dark:text-blue-300   border-blue-200   dark:border-blue-800' },
  estilista:        { label: 'Estilista',   Icon: Sparkles,    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  lashes:           { label: 'Lashes',      Icon: Sparkles,    color: 'bg-pink-50   text-pink-700   dark:bg-pink-950   dark:text-pink-300   border-pink-200   dark:border-pink-800' },
  bazar:            { label: 'Bazar',       Icon: ShoppingBag, color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  'gimnasio-boxeo': { label: 'Gym & Boxeo', Icon: Dumbbell,    color: 'bg-red-50    text-red-700    dark:bg-red-950    dark:text-red-300    border-red-200    dark:border-red-800' },
  transporte:       { label: 'Transporte',  Icon: Car,         color: 'bg-green-50  text-green-700  dark:bg-green-950  dark:text-green-300  border-green-200  dark:border-green-800' },
}

const GYM_CFG = CATEGORY_CONFIG['gimnasio-boxeo']

function getCategoryConfig(slug) {
  if (!slug) return null
  if (CATEGORY_CONFIG[slug]) return CATEGORY_CONFIG[slug]
  if (slug.includes('gym') || slug.includes('box') || slug.includes('gimn')) return GYM_CFG
  return null
}

function CategoryBadge({ slug, size = 'md' }) {
  const cfg = getCategoryConfig(slug)
  if (!cfg) return null
  const { label, Icon, color } = cfg
  const cls = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-1'
    : 'text-xs px-2 py-0.5 gap-1'
  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${color} ${cls} flex-shrink-0`}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {label}
    </span>
  )
}

const PROFESSIONAL_TITLES = {
  barberia:         { singular: 'barbero',      plural: 'barberos' },
  estilista:        { singular: 'estilista',     plural: 'estilistas' },
  lashes:           { singular: 'especialista',  plural: 'especialistas' },
  bazar:            { singular: 'vendedor',      plural: 'vendedores' },
  'gimnasio-boxeo': { singular: 'instructor',    plural: 'instructores' },
  transporte:       { singular: 'conductor',     plural: 'conductores' },
}

function getProfLabel(slug, count) {
  const entry = PROFESSIONAL_TITLES[slug] ?? { singular: 'profesional', plural: 'profesionales' }
  return count === 1 ? entry.singular : entry.plural
}

// ─── Orbs de fondo ────────────────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <>
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-purple-400/20 dark:bg-purple-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 rounded-full bg-cyan-400/15 dark:bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 w-80 h-80 rounded-full bg-fuchsia-400/10 dark:bg-fuchsia-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-amber-400/10 dark:bg-amber-500/10 blur-3xl" />
    </>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

function DiscoverShops() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { location: userLocation, permission, loading: locationLoading, requestLocation, dismissLocation } = useUserLocation()

  const [shops, setShops] = useState([])
  const [categoryMap, setCategoryMap] = useState({})
  const [favoriteShops, setFavoriteShops] = useState([])
  const [favoriteShopIds, setFavoriteShopIds] = useState(new Set())
  const [shopReviews, setShopReviews] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [highlightedShopId, setHighlightedShopId] = useState(null)
  const [openInfoId, setOpenInfoId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Filtros avanzados ──────────────────────────────────────────────────────
  const [showFilters, setShowFilters]         = useState(false)
  const [filterCategory, setFilterCategory]   = useState('')
  const [filterMinRating, setFilterMinRating] = useState(0)
  const [filterMaxDist, setFilterMaxDist]     = useState(0)
  const [sortBy, setSortBy]                   = useState('smart')

  const mapRef = useRef(null)

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [shopsData, favsData, catsData] = await Promise.all([
          api.getAllShops(),
          user ? api.getFavoriteShops(user.userId) : Promise.resolve([]),
          api.getCategories().catch(() => []),
        ])
        const loadedShops = shopsData || []
        setShops(loadedShops)
        const map = {}
        ;(catsData || []).forEach(c => { map[c.id] = c.slug })
        setCategoryMap(map)
        const favs = favsData || []
        setFavoriteShops(favs)
        setFavoriteShopIds(new Set(favs.map((f) => f.shop.id)))

        setLoading(false)

        Promise.all(
          loadedShops.map(s =>
            api.getShopReviews(s.id)
              .then(r => ({ id: s.id, reviews: r || [] }))
              .catch(() => ({ id: s.id, reviews: [] }))
          )
        ).then(reviewResults => {
          const reviewsMap = {}
          reviewResults.forEach(({ id, reviews }) => { reviewsMap[id] = reviews })
          setShopReviews(reviewsMap)
        })
      } catch (err) {
        console.error('Error loading shops:', err)
        setLoadError('No se pudieron cargar los negocios. Intenta de nuevo.')
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const toggleFavorite = async (shopId) => {
    if (!user) {
      navigate('/login', { state: { from: '/booking' } })
      return
    }
    try {
      if (favoriteShopIds.has(shopId)) {
        const fav = favoriteShops.find((f) => f.shop.id === shopId)
        if (fav) {
          await api.removeFavoriteShop(fav.id, user.userId)
          setFavoriteShops((prev) => prev.filter((f) => f.id !== fav.id))
          setFavoriteShopIds((prev) => {
            const s = new Set(prev)
            s.delete(shopId)
            return s
          })
        }
      } else {
        const newFav = await api.addFavoriteShop(shopId, user.userId)
        setFavoriteShops((prev) => [...prev, newFav])
        setFavoriteShopIds((prev) => new Set([...prev, shopId]))
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  const handleShopClick = (shop) => {
    const catSlug = categoryMap[shop.categoryId] ?? ''
    if (catSlug === 'transporte') {
      navigate(`/transport/${shop.slug}`)
    } else {
      navigate(`/book/${shop.slug}`)
    }
  }

  const handleCardHover = (shop) => {
    setHighlightedShopId(shop.id)
    if (mapRef.current && shop.latitude && shop.longitude) {
      mapRef.current.panTo({ lat: shop.latitude, lng: shop.longitude })
    }
  }

  // ── Calcular distancias y ordenar ──────────────────────────────────────────

  const shopsWithDistance = useMemo(() => {
    if (!userLocation) return shops.map(s => ({ ...s, distance: null }))
    return shops.map(s => {
      if (!s.latitude || !s.longitude) return { ...s, distance: null }
      const dist = haversineDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude)
      return { ...s, distance: dist }
    })
  }, [shops, userLocation])

  const shopAvgRating = useMemo(() => {
    const map = {}
    Object.entries(shopReviews).forEach(([id, reviews]) => {
      if (reviews.length === 0) { map[id] = null; return }
      map[id] = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    })
    return map
  }, [shopReviews])

  const filteredShops = useMemo(() => {
    let result = shopsWithDistance

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || (s.address && s.address.toLowerCase().includes(q))
      )
    }

    if (filterCategory) {
      result = result.filter(s => (categoryMap[s.categoryId] ?? '') === filterCategory)
    }

    if (filterMinRating > 0) {
      result = result.filter(s => {
        const avg = shopAvgRating[s.id]
        return avg !== null && avg !== undefined && avg >= filterMinRating
      })
    }

    if (filterMaxDist > 0 && userLocation) {
      result = result.filter(s => s.distance != null && s.distance <= filterMaxDist * 1000)
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'rating') {
        const ra = shopAvgRating[a.id] ?? -1
        const rb = shopAvgRating[b.id] ?? -1
        return rb - ra
      }
      if (userLocation) {
        if (a.distance == null && b.distance == null) return 0
        if (a.distance == null) return 1
        if (b.distance == null) return -1
        return a.distance - b.distance
      }
      const ra = shopAvgRating[a.id] ?? -1
      const rb = shopAvgRating[b.id] ?? -1
      return rb - ra
    })

    return result
  }, [shopsWithDistance, searchQuery, filterCategory, filterMinRating, filterMaxDist, sortBy, categoryMap, shopAvgRating, userLocation])

  const activeFilterCount = [
    filterCategory !== '',
    filterMinRating > 0,
    filterMaxDist > 0,
    sortBy !== 'smart',
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterCategory('')
    setFilterMinRating(0)
    setFilterMaxDist(0)
    setSortBy('smart')
    setSearchQuery('')
  }

  const mappableShops = filteredShops.filter(s => s.latitude && s.longitude)

  const mapCenter = userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng }
    : mappableShops.length > 0
      ? { lat: mappableShops[0].latitude, lng: mappableShops[0].longitude }
      : DEFAULT_CENTER

  const mapZoom = userLocation ? 14 : 13

  const centerOnMe = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      mapRef.current.setZoom(14)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-cyan-50/20 dark:from-gray-950 dark:via-purple-950/40 dark:to-gray-950">
        <BackgroundOrbs />
        <div className="w-10 h-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-white via-purple-50/40 to-cyan-50/20 dark:from-gray-950 dark:via-purple-950/40 dark:to-gray-950 gap-4 px-4">
        <BackgroundOrbs />
        <div className="text-4xl">😵</div>
        <p className="text-gray-600 dark:text-gray-300 text-center font-medium">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition shadow-[0_0_16px_rgba(139,92,246,0.35)]"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="relative max-w-full -mx-4 sm:-mx-6 lg:-mx-8 overflow-x-hidden min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-cyan-50/10 dark:from-gray-950 dark:via-purple-950/30 dark:to-gray-950">

      {/* Orbs de fondo */}
      <BackgroundOrbs />

      {/* ── Banner de ubicación ─────────────────────────────────────────── */}
      {permission === null && (
        <div className="relative px-4 sm:px-6 lg:px-8 pt-4 mb-4">
          <div className="bg-white/70 dark:bg-blue-950/40 backdrop-blur-sm border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100/80 dark:bg-blue-900/60 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Activar ubicación
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Muestra negocios cerca de ti y ordénalos por distancia
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={requestLocation}
                disabled={locationLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60 font-medium"
              >
                {locationLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Obteniendo...</>
                  : <><LocateFixed className="w-3.5 h-3.5" />Permitir</>
                }
              </button>
              <button
                onClick={dismissLocation}
                className="flex-1 sm:flex-none text-sm px-4 py-2 border border-blue-300/60 dark:border-blue-700/60 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition font-medium"
              >
                No, gracias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + Search + Filtros */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-4 mb-4">
        {/* Título con gradiente */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-500 dark:from-purple-400 dark:via-fuchsia-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Descubre Negocios
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {userLocation
                ? `${filteredShops.length} negocio${filteredShops.length !== 1 ? 's' : ''} cerca de ti`
                : `${filteredShops.length} negocio${filteredShops.length !== 1 ? 's' : ''} disponibles`}
            </p>
          </div>
        </div>

        {/* Barra de búsqueda + botones */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o dirección..."
              className="w-full pl-9 pr-8 py-2.5 border border-purple-200/50 dark:border-purple-700/30 rounded-lg text-sm bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>

          {/* Filtros */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition flex-shrink-0 ${
              showFilters || activeFilterCount > 0
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-transparent shadow-[0_0_14px_rgba(139,92,246,0.35)]'
                : 'bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/30 text-gray-700 dark:text-gray-200 hover:border-purple-400/70 dark:hover:border-purple-500/50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 bg-white/25 text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Centrar en ubicación */}
          {userLocation && (
            <button
              onClick={centerOnMe}
              title="Centrar en mi ubicación"
              className="p-2.5 border border-purple-200/50 dark:border-purple-700/30 rounded-lg hover:bg-white/80 dark:hover:bg-gray-800/60 transition flex-shrink-0 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm"
            >
              <LocateFixed className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          )}
        </div>

        {/* Chips de categoría */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterCategory('')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filterCategory === ''
                ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-transparent shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                : 'bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-purple-200/50 dark:border-gray-600/60 hover:border-purple-400/60 dark:hover:border-purple-500/50'
            }`}
          >
            <Store className="w-3 h-3" />
            Todos
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([slug, { label, Icon, color }]) => (
            <button
              key={slug}
              onClick={() => setFilterCategory(prev => prev === slug ? '' : slug)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                filterCategory === slug
                  ? `${color} font-semibold shadow-sm`
                  : 'bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm text-gray-600 dark:text-gray-300 border-purple-200/50 dark:border-gray-600/60 hover:border-purple-400/60 dark:hover:border-purple-500/50'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Panel de filtros avanzados */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md border border-purple-100/60 dark:border-purple-800/30 rounded-xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">

              {/* Ordenar por */}
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Ordenar por
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'smart',  label: userLocation ? 'Más cercano' : 'Mejor valorado' },
                    { value: 'rating', label: '★ Valoración' },
                    { value: 'name',   label: 'A–Z Nombre' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSortBy(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        sortBy === value
                          ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-transparent shadow-[0_0_8px_rgba(139,92,246,0.3)]'
                          : 'bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-purple-200/50 dark:border-gray-600/60 hover:border-purple-400/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valoración mínima */}
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-gray-400" />
                  Valoración mínima
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 3, 4, 4.5].map(val => (
                    <button
                      key={val}
                      onClick={() => setFilterMinRating(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        filterMinRating === val
                          ? 'bg-yellow-400 text-gray-900 border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.4)]'
                          : 'bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-purple-200/50 dark:border-gray-600/60 hover:border-purple-400/60'
                      }`}
                    >
                      {val === 0 ? 'Todas' : `${val}★ o más`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radio máximo */}
              {userLocation && (
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />
                    Distancia máxima
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[0, 0.5, 1, 3, 5].map(km => (
                      <button
                        key={km}
                        onClick={() => setFilterMaxDist(km)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          filterMaxDist === km
                            ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.35)]'
                            : 'bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border-purple-200/50 dark:border-gray-600/60 hover:border-purple-400/60'
                        }`}
                      >
                        {km === 0 ? 'Cualquiera' : km < 1 ? `${km * 1000}m` : `${km} km`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Limpiar filtros */}
            {(activeFilterCount > 0 || searchQuery) && (
              <div className="pt-2 border-t border-purple-100/60 dark:border-purple-800/30">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Favoritos guardados */}
      {favoriteShops.length > 0 && (
        <div className="relative px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            Tus negocios guardados
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {favoriteShops.map((fav) => {
              const slug = categoryMap[fav.shop.categoryId] ?? ''
              const cfg = getCategoryConfig(slug)
              const Icon = cfg?.Icon ?? Store
              return (
                <button
                  key={fav.id}
                  onClick={() => handleShopClick(fav.shop)}
                  className="flex-shrink-0 w-52 p-[1px] bg-gradient-to-br from-purple-300/50 via-fuchsia-300/30 to-cyan-300/50 dark:from-purple-600/40 dark:via-fuchsia-500/20 dark:to-cyan-600/40 hover:from-purple-400 hover:via-fuchsia-400 hover:to-cyan-400 dark:hover:from-purple-500 dark:hover:to-cyan-500 rounded-xl hover:shadow-[0_0_16px_rgba(139,92,246,0.25)] dark:hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-all"
                >
                  <div className="bg-white/85 dark:bg-gray-900/75 backdrop-blur-md rounded-xl p-4 text-left h-full">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${cfg?.color ?? 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm truncate">
                          {fav.shop.name}
                        </p>
                        {cfg && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{cfg.label}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Split view: list + map */}
      <div className="relative flex flex-col lg:flex-row gap-4 px-4 sm:px-6 lg:px-8 lg:h-[calc(100vh-320px)] lg:min-h-[400px] pb-4">
        {/* Left: shop cards */}
        <div className="lg:w-1/2 lg:overflow-y-auto space-y-3 pb-4 lg:pb-0 lg:pr-1">
          {filteredShops.length === 0 ? (
            <div className="text-center py-16">
              <Store className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron negocios</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {activeFilterCount > 0 || searchQuery
                  ? 'Prueba ajustando los filtros o el término de búsqueda'
                  : 'Aún no hay negocios registrados'}
              </p>
              {(activeFilterCount > 0 || searchQuery) && (
                <button onClick={clearFilters} className="mt-3 text-xs text-purple-600 dark:text-purple-400 underline">
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                categorySlug={categoryMap[shop.categoryId] ?? ''}
                isFavorite={favoriteShopIds.has(shop.id)}
                isHighlighted={highlightedShopId === shop.id}
                reviews={shopReviews[shop.id] || []}
                distance={shop.distance}
                onToggleFavorite={() => toggleFavorite(shop.id)}
                onClick={() => handleShopClick(shop)}
                onHover={() => handleCardHover(shop)}
                onLeave={() => setHighlightedShopId(null)}
              />
            ))
          )}
        </div>

        {/* Right: Google Map */}
        <div className="lg:w-1/2 rounded-xl overflow-hidden border border-purple-200/40 dark:border-purple-700/30 min-h-[300px] lg:min-h-0 shadow-[0_0_30px_rgba(139,92,246,0.08)] dark:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
          <GoogleMap
            mapContainerStyle={MAP_STYLES}
            center={mapCenter}
            zoom={mapZoom}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
            onClick={() => setOpenInfoId(null)}
          >
              {userLocation && (
                <>
                  <Marker
                    position={{ lat: userLocation.lat, lng: userLocation.lng }}
                    title="Tu ubicación"
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: { width: 40, height: 40 },
                    }}
                    zIndex={1000}
                  />
                  <Circle
                    center={{ lat: userLocation.lat, lng: userLocation.lng }}
                    radius={200}
                    options={{
                      fillColor: '#3b82f6',
                      fillOpacity: 0.1,
                      strokeColor: '#3b82f6',
                      strokeOpacity: 0.3,
                      strokeWeight: 1,
                    }}
                  />
                </>
              )}

              {mappableShops.map((shop) => (
                <Marker
                  key={shop.id}
                  position={{ lat: shop.latitude, lng: shop.longitude }}
                  title={shop.name}
                  icon={
                    highlightedShopId === shop.id
                      ? {
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: { width: 40, height: 40 },
                        }
                      : {
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: { width: 32, height: 32 },
                        }
                  }
                  onMouseOver={() => setHighlightedShopId(shop.id)}
                  onMouseOut={() => setHighlightedShopId(null)}
                  onClick={() => setOpenInfoId(shop.id)}
                />
              ))}

              {openInfoId && (() => {
                const shop = mappableShops.find((s) => s.id === openInfoId)
                if (!shop) return null
                return (
                  <InfoWindow
                    position={{ lat: shop.latitude, lng: shop.longitude }}
                    onCloseClick={() => setOpenInfoId(null)}
                  >
                    <div className="text-sm min-w-[160px] p-1">
                      <p className="font-semibold text-gray-900 text-base">{shop.name}</p>
                      <div className="mt-1 mb-1">
                        <CategoryBadge slug={categoryMap[shop.categoryId] ?? ''} size="sm" />
                      </div>
                      {shop.address && (
                        <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {shop.address}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {getShopRating(shop.barbers) && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-600">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            {getShopRating(shop.barbers)}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {shop.barbers?.length || 0} {getProfLabel(categoryMap[shop.categoryId] ?? '', shop.barbers?.length || 0)}
                        </span>
                        {shop.distance != null && (
                          <span className="text-xs text-blue-600 font-medium">
                            {formatDistance(shop.distance)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleShopClick(shop)}
                        className="mt-2 w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-medium py-1.5 rounded-md hover:opacity-90 transition"
                      >
                        Reservar cita →
                      </button>
                    </div>
                  </InfoWindow>
                )
              })()}
          </GoogleMap>
        </div>
      </div>
    </div>
  )
}

// ─── ShopCard ─────────────────────────────────────────────────────────────────

function ShopCard({ shop, categorySlug, isFavorite, isHighlighted, reviews = [], distance, onToggleFavorite, onClick, onHover, onLeave }) {
  const [gallery, setGallery] = useState([])

  useEffect(() => {
    api.getShopGallery(shop.id).then(imgs => setGallery(imgs || [])).catch(() => {})
  }, [shop.id])

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null

  const previewPhotos = gallery.slice(0, 4)
  const extraCount = gallery.length > 4 ? gallery.length - 4 : 0

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`p-[1px] rounded-xl cursor-pointer transition-all duration-200 ${
        isHighlighted
          ? 'bg-gradient-to-br from-purple-500 via-fuchsia-500 to-cyan-500 shadow-[0_0_28px_rgba(139,92,246,0.45)] dark:shadow-[0_0_36px_rgba(139,92,246,0.6)]'
          : 'bg-gradient-to-br from-purple-200/60 via-fuchsia-200/30 to-cyan-200/60 dark:from-purple-600/30 dark:via-fuchsia-600/15 dark:to-cyan-600/30 hover:from-purple-400/80 hover:via-fuchsia-400/60 hover:to-cyan-400/80 dark:hover:from-purple-500/60 dark:hover:via-fuchsia-500/40 dark:hover:to-cyan-500/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] dark:hover:shadow-[0_0_24px_rgba(139,92,246,0.4)]'
      }`}
    >
      <div className="bg-white/85 dark:bg-gray-900/75 backdrop-blur-md rounded-xl overflow-hidden">
        {/* Franja de galería */}
        {previewPhotos.length > 0 && (
          <div className="flex gap-0.5 h-28 overflow-hidden">
            {previewPhotos.map((img, idx) => (
              <div key={img.id} className="relative flex-1 overflow-hidden">
                <img src={img.imageUrl} alt={img.caption || ''} className="w-full h-full object-cover" />
                {idx === previewPhotos.length - 1 && extraCount > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">+{extraCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-50 truncate">{shop.name}</h3>
                <CategoryBadge slug={categorySlug} />
                {distance != null && (
                  <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/60 px-2 py-0.5 rounded-full flex-shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                    <Navigation className="w-3 h-3" />
                    {formatDistance(distance)}
                  </span>
                )}
              </div>
              {shop.address && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{shop.address}</span>
                </div>
              )}
              {shop.description && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2">{shop.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{shop.barbers?.length || 0} {getProfLabel(categorySlug, shop.barbers?.length || 0)}</span>
                </div>
                {gallery.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Images className="w-3.5 h-3.5" />
                    <span>{gallery.length} foto{gallery.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Favorite toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              className="p-2 rounded-full hover:bg-red-50/80 dark:hover:bg-red-950/50 transition flex-shrink-0"
            >
              <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-300'}`} />
            </button>
          </div>

          {/* Rating */}
          <div className="mt-3 pt-3 border-t border-purple-100/60 dark:border-purple-800/20 flex items-center gap-2">
            <StarRating value={avgRating !== null ? Math.round(avgRating) : 0} size="sm" />
            {avgRating !== null ? (
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {avgRating.toFixed(1)}
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">({reviews.length} reseña{reviews.length !== 1 ? 's' : ''})</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">Sin reseñas aún</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiscoverShops
