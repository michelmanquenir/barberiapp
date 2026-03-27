import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import {
  Heart,
  MapPin,
  Star,
  Users,
  Store,
  Search,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

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

function DiscoverShops() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [shops, setShops] = useState([])
  const [categoryMap, setCategoryMap] = useState({}) // id → slug
  const [favoriteShops, setFavoriteShops] = useState([])
  const [favoriteShopIds, setFavoriteShopIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
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
      try {
        const [shopsData, favsData, catsData] = await Promise.all([
          api.getAllShops(),
          user ? api.getFavoriteShops(user.userId) : Promise.resolve([]),
          api.getCategories().catch(() => []),
        ])
        setShops(shopsData || [])
        const map = {}
        ;(catsData || []).forEach(c => { map[c.id] = c.slug })
        setCategoryMap(map)
        const favs = favsData || []
        setFavoriteShops(favs)
        setFavoriteShopIds(new Set(favs.map((f) => f.shop.id)))
      } catch (err) {
        console.error('Error loading shops:', err)
      } finally {
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

  const filteredShops = searchQuery.trim()
    ? shops.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : shops

  const mappableShops = filteredShops.filter((s) => s.latitude && s.longitude)

  const mapCenter =
    mappableShops.length > 0
      ? { lat: mappableShops[0].latitude, lng: mappableShops[0].longitude }
      : DEFAULT_CENTER

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-full -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Header + Search */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Descubre Negocios</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Encuentra el negocio ideal y agenda tu cita
            </p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o dirección..."
              className="w-full pl-9 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
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
            {favoriteShops.map((fav) => (
              <button
                key={fav.id}
                onClick={() => handleShopClick(fav.shop)}
                className="flex-shrink-0 w-52 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-400 hover:shadow-sm transition text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary-50 dark:bg-primary-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm truncate">
                      {fav.shop.name}
                    </p>
                    {fav.shop.address && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {fav.shop.address}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
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
            zoom={13}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
            onClick={() => setOpenInfoId(null)}
          >
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
                          url: 'https://maps.google.com/mapfiles/ms/icons/barbershop.png',
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

function ShopCard({ shop, categorySlug, isFavorite, isHighlighted, onToggleFavorite, onClick, onHover, onLeave }) {
  const rating = getShopRating(shop.barbers)
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`bg-white dark:bg-gray-900 rounded-xl border p-5 cursor-pointer transition-all ${
        isHighlighted
          ? 'border-primary-500 shadow-md ring-1 ring-primary-200 dark:ring-primary-800'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0" onClick={onClick}>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-50 truncate">{shop.name}</h3>
          {shop.address && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{shop.address}</span>
            </div>
          )}
          {shop.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2">{shop.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{rating}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>
                {shop.barbers?.length || 0} {getProfLabel(categorySlug, shop.barbers?.length || 0)}
              </span>
            </div>
            {!shop.latitude && (
              <span className="text-xs text-gray-300 dark:text-gray-600">Sin ubicación</span>
            )}
          </div>
        </div>

        {/* Favorite toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950 transition flex-shrink-0"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-300'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default DiscoverShops
