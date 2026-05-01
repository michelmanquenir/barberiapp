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
  XCircle,
  ShoppingBag,
  Car,
  Dumbbell,
  Sparkles,
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

function CategoryBadge({ slug, size = 'md' }) {
  const cfg = CATEGORY_CONFIG[slug]
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

        // Reviews se cargan en background SIN bloquear el render de shops
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

  const filteredShops = useMemo(() => {
    let result = shopsWithDistance
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || (s.address && s.address.toLowerCase().includes(q))
      )
    }
    // Ordenar: los que tienen distancia primero (más cercanos), luego sin coordenadas
    if (userLocation) {
      result = [...result].sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0
        if (a.distance == null) return 1
        if (b.distance == null) return -1
        return a.distance - b.distance
      })
    }
    return result
  }, [shopsWithDistance, searchQuery, userLocation])

  const mappableShops = filteredShops.filter(s => s.latitude && s.longitude)

  const mapCenter = userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng }
    : mappableShops.length > 0
      ? { lat: mappableShops[0].latitude, lng: mappableShops[0].longitude }
      : DEFAULT_CENTER

  const mapZoom = userLocation ? 14 : 13

  // ── Centrar mapa en mi ubicación ───────────────────────────────────────────

  const centerOnMe = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      mapRef.current.setZoom(14)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
        <div className="text-4xl">😵</div>
        <p className="text-gray-600 dark:text-gray-300 text-center font-medium">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-full -mx-4 sm:-mx-6 lg:-mx-8">

      {/* ── Banner de ubicación ─────────────────────────────────────────── */}
      {permission === null && (
        <div className="px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
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
                className="flex-1 sm:flex-none text-sm px-4 py-2 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition font-medium"
              >
                No, gracias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + Search */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Descubre Negocios</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {userLocation
                ? 'Negocios cerca de ti, ordenados por distancia'
                : 'Encuentra el negocio ideal y agenda tu cita'}
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o dirección..."
                className="w-full pl-9 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
            </div>
            {/* Botón de re-centrar si ya tenemos ubicación */}
            {userLocation && (
              <button
                onClick={centerOnMe}
                title="Centrar en mi ubicación"
                className="p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
              >
                <LocateFixed className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Favoritos guardados */}
      {favoriteShops.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
            Tus negocios guardados
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {favoriteShops.map((fav) => {
              const slug = categoryMap[fav.shop.categoryId] ?? ''
              const cfg = CATEGORY_CONFIG[slug]
              const Icon = cfg?.Icon ?? Store
              return (
                <button
                  key={fav.id}
                  onClick={() => handleShopClick(fav.shop)}
                  className="flex-shrink-0 w-52 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-400 hover:shadow-sm transition text-left"
                >
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
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Split view: list + map */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 sm:px-6 lg:px-8 lg:h-[calc(100vh-320px)] lg:min-h-[400px]">
        {/* Left: shop cards */}
        <div className="lg:w-1/2 lg:overflow-y-auto space-y-3 pb-4 lg:pb-0 lg:pr-1">
          {filteredShops.length === 0 ? (
            <div className="text-center py-16">
              <Store className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron negocios</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {searchQuery
                  ? 'Intenta con otro término de búsqueda'
                  : 'Aún no hay negocios registrados'}
              </p>
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
        <div className="lg:w-1/2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[300px] lg:min-h-0">
          <GoogleMap
            mapContainerStyle={MAP_STYLES}
            center={mapCenter}
            zoom={mapZoom}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
            onClick={() => setOpenInfoId(null)}
          >
              {/* Marcador del usuario */}
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

              {/* Marcadores de negocios */}
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
                        className="mt-2 w-full bg-gray-900 text-white text-xs font-medium py-1.5 rounded-md hover:bg-gray-700 transition"
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
      className={`bg-white dark:bg-gray-900 rounded-xl border overflow-hidden cursor-pointer transition-all ${
        isHighlighted
          ? 'border-primary-500 shadow-md ring-1 ring-primary-200 dark:ring-primary-800'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      }`}
    >
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
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-50 truncate">{shop.name}</h3>
              {distance != null && (
                <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full flex-shrink-0 border border-blue-200 dark:border-blue-800 mt-1">
                  <Navigation className="w-3 h-3" />
                  {formatDistance(distance)}
                </span>
              )}
            </div>
            <div className="mt-1.5">
              <CategoryBadge slug={categorySlug} />
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
            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition flex-shrink-0"
          >
            <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-300'}`} />
          </button>
        </div>

        {/* Rating de reseñas (solo lectura) */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
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
  )
}

export default DiscoverShops
