import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Scissors, Calendar, Clock, Users, CreditCard, Check,
  ChevronRight, ChevronLeft, LogIn, MapPin, Star, Loader2,
  Home, AlertTriangle, Crown, Repeat2, ShoppingBag, Package,
  X, Images,
} from 'lucide-react'
import { Autocomplete } from '@react-google-maps/api'
import { api } from '../lib/api'
import { toast } from '../lib/swal'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import PublicUserMenu from '../components/PublicUserMenu'

// ─── Títulos profesionales ─────────────────────────────────────────────────────

const PROFESSIONAL_TITLES = {
  barberia:         { singular: 'Barbero/a',    plural: 'Barberos/as' },
  estilista:        { singular: 'Estilista',     plural: 'Estilistas' },
  lashes:           { singular: 'Especialista',  plural: 'Especialistas' },
  bazar:            { singular: 'Vendedor/a',    plural: 'Vendedores/as' },
  'gimnasio-boxeo': { singular: 'Instructor/a',  plural: 'Instructores/as' },
  transporte:       { singular: 'Conductor/a',   plural: 'Conductores/as' },
}

function getProfessionalTitle(slug, plural = false) {
  const entry = PROFESSIONAL_TITLES[slug] ?? { singular: 'Profesional', plural: 'Profesionales' }
  return plural ? entry.plural : entry.singular
}

function getServiceUnit(slug = '') {
  if (slug.includes('gym') || slug.includes('box'))    return 'clases'
  if (slug.includes('transport'))                       return 'viajes'
  if (slug.includes('bazar') || slug.includes('shop')) return 'compras'
  if (slug.includes('salon') || slug.includes('spa'))  return 'sesiones'
  return 'cortes'
}

// ─── Helpers fecha/hora ────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function nextDays(count = 21) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const DAY_NAMES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function isPastTime(timeStr, isToday) {
  if (!isToday) return false
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m <= now.getHours() * 60 + now.getMinutes() + 15
}

function isTodayExhausted() {
  return TIME_SLOTS.every(slot => isPastTime(slot, true))
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
]

// ─── Helpers reseñas ───────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-violet-600',
]

function getAvatarGradient(name = '') {
  if (!name) return AVATAR_GRADIENTS[0]
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]
}

function formatReviewDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  } catch { return '' }
}

// ─── Componente principal ──────────────────────────────────────────────────────

function PublicBooking() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [shop, setShop]                     = useState(null)
  const [categorySlug, setCategorySlug]     = useState('')
  const [services, setServices]             = useState([])
  const [shopReviews, setShopReviews]       = useState([])
  const [shopGallery, setShopGallery]       = useState([])
  const [plans, setPlans]                   = useState([])
  const [products, setProducts]             = useState([])
  const [loadingShop, setLoadingShop]       = useState(true)
  const [shopError, setShopError]           = useState(null)
  const [activeSubscription, setActiveSubscription] = useState(null)

  // step: 1=idle, 2=fecha, 3=hora+profesional, 4=confirmar
  const [step, setStep]     = useState(1)
  const [booking, setBooking] = useState({
    serviceId: null, date: '', time: '', barberId: null,
    paymentMethod: 'cash', locationType: 'barbershop',
    clientAddress: '', clientLatitude: null, clientLongitude: null,
    homeDistanceKm: null, surchargeAmount: 0, durationMinutes: 30,
  })
  const [confirming, setConfirming]         = useState(false)
  const [confirmed, setConfirmed]           = useState(false)
  const [selectedProducts, setSelectedProducts] = useState({})

  const sidebarRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.getShopBySlug(slug),
      api.getCategories().catch(() => []),
    ])
      .then(async ([shopData, categories]) => {
        const cat = (categories || []).find(c => c.id === shopData.categoryId)
        if (cat?.slug?.includes('bazar')) {
          navigate(`/shop/${slug}`, { replace: true })
          return
        }
        const extras = [
          api.getShopServices(shopData.id).catch(() => []),
          api.getShopReviews(shopData.id).catch(() => []),
          api.getShopSubscriptionPlans(shopData.id).catch(() => []),
          api.getShopProducts(shopData.id).catch(() => []),
          api.getShopGallery(shopData.id).catch(() => []),
        ]
        if (isAuthenticated) {
          extras.push(api.getMyActiveSubscription(shopData.id).catch(() => null))
        }
        const [servicesData, reviewsData, plansData, productsData, galleryData, activeSub] = await Promise.all(extras)
        setShop(shopData)
        setCategorySlug(cat?.slug ?? '')
        setServices(servicesData || [])
        setShopReviews(reviewsData || [])
        setShopGallery(galleryData || [])
        setPlans(plansData || [])
        setProducts(productsData || [])
        if (activeSub) setActiveSubscription(activeSub)
      })
      .catch(() => setShopError('No se encontró el negocio'))
      .finally(() => setLoadingShop(false))
  }, [slug, isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const barbers        = shop?.barbers ?? []
  const selectedService = services.find(s => s.id === booking.serviceId)
  const selectedBarber  = barbers.find(b => b.id === booking.barberId)

  const handleServiceSelect = (serviceId) => {
    setBooking(prev => ({ ...prev, serviceId, date: '', time: '', barberId: null }))
    setStep(2)
    setTimeout(() => {
      sidebarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleLocationChange = (locationType) => {
    setBooking(prev => ({
      ...prev, locationType,
      durationMinutes: locationType === 'home' ? 180 : 30,
      time: '', barberId: null,
    }))
    if (step >= 3) setStep(2)
  }

  const canProceed = () => {
    if (step === 2) return !!booking.date
    if (step === 3) return !!booking.time && !!booking.barberId
    if (step === 4) {
      if (!booking.paymentMethod) return false
      if (booking.locationType === 'home' && !booking.clientAddress) return false
      return true
    }
    return false
  }

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/book/${slug}` } })
      return
    }
    setConfirming(true)
    try {
      const useSubscription = booking.paymentMethod === 'subscription'
      await api.createAppointment({
        userId: user.userId, shopId: shop.id,
        serviceId: booking.serviceId, barberId: booking.barberId,
        date: booking.date, time: booking.time,
        locationType: booking.locationType,
        paymentMethod: useSubscription ? 'subscription' : booking.paymentMethod,
        clientAddress: booking.clientAddress || null,
        clientLatitude: booking.clientLatitude || null,
        clientLongitude: booking.clientLongitude || null,
        homeDistanceKm: booking.homeDistanceKm || null,
        surchargeAmount: booking.surchargeAmount || 0,
        durationMinutes: booking.durationMinutes || 30,
        useSubscription,
        products: Object.entries(selectedProducts)
          .filter(([, qty]) => qty > 0)
          .map(([productId, quantity]) => ({ productId: Number(productId), quantity })),
      })
      setConfirmed(true)
    } catch (err) {
      toast.error(err?.message || 'Error al confirmar la cita. Intenta de nuevo.')
    } finally {
      setConfirming(false)
    }
  }

  // ── Pantallas especiales ────────────────────────────────────────────────────

  if (loadingShop) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <Scissors className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">Negocio no encontrado</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm">El enlace puede ser incorrecto o el negocio ya no está disponible.</p>
        </div>
      </div>
    )
  }

  if (confirmed) {
    const svcPrice = selectedService?.price ?? 0
    const spSubtotal = Object.entries(selectedProducts).reduce((sum, [pid, qty]) => {
      const p = products.find(x => x.id === Number(pid))
      return sum + (p?.salePrice ?? 0) * qty
    }, 0)
    const grandTotal = svcPrice + (booking.locationType === 'home' ? (booking.surchargeAmount || 0) : 0) + spSubtotal
    const chosenProducts = Object.entries(selectedProducts).filter(([, qty]) => qty > 0)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">¡Cita confirmada!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Tu cita en <strong>{shop.name}</strong> fue agendada.</p>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left mb-6 space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p>📋 <strong>{selectedService?.name}</strong></p>
            <p>📅 {booking.date} a las {booking.time}</p>
            <p>✂️ {selectedBarber?.name}</p>
            {booking.locationType === 'home' && booking.clientAddress && <p>🏠 {booking.clientAddress}</p>}
            {chosenProducts.length > 0 && (
              <p>🛍️ {chosenProducts.map(([pid, qty]) => {
                const p = products.find(x => x.id === Number(pid))
                return p ? `${p.name} ×${qty}` : null
              }).filter(Boolean).join(', ')}</p>
            )}
            <p>💰 ${grandTotal.toLocaleString()} · {booking.paymentMethod === 'cash' ? 'Efectivo' : booking.paymentMethod === 'subscription' ? 'Suscripción' : 'Transferencia'}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/appointments')}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition">
              Ver mis citas
            </button>
            <button
              onClick={() => {
                setConfirmed(false); setStep(1); setSelectedProducts({})
                setBooking({ serviceId: null, date: '', time: '', barberId: null, paymentMethod: 'cash', locationType: 'barbershop', clientAddress: '', clientLatitude: null, clientLongitude: null, homeDistanceKm: null, surchargeAmount: 0, durationMinutes: 30 })
              }}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Agendar otra
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Layout principal ────────────────────────────────────────────────────────

  const avgRating = shopReviews.length > 0
    ? shopReviews.reduce((sum, r) => sum + r.rating, 0) / shopReviews.length
    : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-3.5 px-6 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-gray-50 text-base leading-tight">{shop.name}</h1>
              {shop.address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{shop.address}
                </p>
              )}
            </div>
          </div>
          <PublicUserMenu loginRedirect={`/book/${slug}`} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── COLUMNA IZQUIERDA ───────────────────────────────────────── */}
          <div className="min-w-0 space-y-8">

            {/* Galería */}
            <GallerySection shopGallery={shopGallery} />

            {/* Info del negocio */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{shop.name}</h2>
              {avgRating !== null && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-gray-900 dark:text-gray-50">{avgRating.toFixed(1)}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">({shopReviews.length} reseñas)</span>
                </div>
              )}
              {shop.address && (
                <p className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-2 text-sm">
                  <MapPin className="w-4 h-4 flex-shrink-0" />{shop.address}
                </p>
              )}
              {shop.description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-3 leading-relaxed">{shop.description}</p>
              )}
            </div>

            {/* Servicios */}
            {services.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4">Servicios</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {services.map(service => (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      selected={booking.serviceId === service.id}
                      onSelect={() => handleServiceSelect(service.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suscripciones */}
            {(plans.length > 0 || activeSubscription) && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-3 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-500" /> Suscripciones
                </h3>
                {activeSubscription ? (
                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-purple-900 dark:text-purple-200">{activeSubscription.planName}</p>
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">Activa</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-purple-700 dark:text-purple-400">
                      <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{activeSubscription.cutsRemaining} {getServiceUnit(categorySlug)} restantes</span>
                      <span>{activeSubscription.daysRemaining} días</span>
                    </div>
                    <div className="mt-2 w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.round((activeSubscription.cutsUsed / activeSubscription.cutsAllowed) * 100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {plans.map(plan => (
                      <PlanCard key={plan.id} plan={plan} isAuthenticated={isAuthenticated} navigate={navigate} slug={slug} setActiveSubscription={setActiveSubscription} serviceUnit={getServiceUnit(categorySlug)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tipo de atención */}
            {shop?.homeServiceEnabled && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-3">¿Dónde prefieres el servicio?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'barbershop', label: 'En el local', emoji: '🏪', desc: 'Visita el local' },
                    { id: 'home', label: 'A domicilio', emoji: '🏠', desc: `+$${(shop.pricePerKm || 0).toLocaleString()}/km · 3 h` },
                  ].map(l => (
                    <button key={l.id} onClick={() => handleLocationChange(l.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${booking.locationType === l.id ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{l.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{l.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{l.desc}</p>
                        </div>
                        {booking.locationType === l.id && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 flex-shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reseñas */}
            <ReviewsSection shopReviews={shopReviews} avgRating={avgRating} />
          </div>

          {/* ── COLUMNA DERECHA — sidebar sticky ───────────────────────── */}
          <div className="lg:sticky lg:top-20" ref={sidebarRef}>
            <BookingSidebar
              step={step}
              setStep={setStep}
              booking={booking}
              setBooking={setBooking}
              shop={shop}
              selectedService={selectedService}
              selectedBarber={selectedBarber}
              barbers={barbers}
              shopId={shop.id}
              categorySlug={categorySlug}
              products={products.filter(p => p.active && p.stock > 0)}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
              activeSubscription={activeSubscription}
              onConfirm={handleConfirm}
              confirming={confirming}
              isAuthenticated={isAuthenticated}
              canProceed={canProceed}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── GallerySection ───────────────────────────────────────────────────────────

function GallerySection({ shopGallery }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  if (shopGallery.length === 0) return null

  return (
    <>
      <div className="rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
        {shopGallery.length === 1 ? (
          <button className="w-full" onClick={() => setLightboxIndex(0)}>
            <img src={shopGallery[0].imageUrl} alt="" className="w-full h-72 object-cover hover:opacity-95 transition" />
          </button>
        ) : (
          <div className="grid gap-1 h-72" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <button className="overflow-hidden" onClick={() => setLightboxIndex(0)}>
              <img src={shopGallery[0].imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            </button>
            <div className="grid gap-1" style={{ gridTemplateRows: '1fr 1fr' }}>
              {shopGallery.slice(1, 3).map((img, idx) => (
                <button key={img.id} className="relative overflow-hidden" onClick={() => setLightboxIndex(idx + 1)}>
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  {idx === 1 && shopGallery.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">+{shopGallery.length - 3} fotos</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxIndex(null)}>
          <button onClick={e => { e.stopPropagation(); setLightboxIndex(null) }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
          {shopGallery.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + shopGallery.length) % shopGallery.length) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % shopGallery.length) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={shopGallery[lightboxIndex].imageUrl} alt={shopGallery[lightboxIndex].caption || ''}
              className="w-full max-h-[75vh] object-contain rounded-xl" />
            {shopGallery[lightboxIndex].caption && (
              <p className="text-center text-white/70 text-sm mt-3">{shopGallery[lightboxIndex].caption}</p>
            )}
            <p className="text-center text-white/40 text-xs mt-1">{lightboxIndex + 1} / {shopGallery.length}</p>
          </div>
        </div>
      )}
    </>
  )
}

// ─── ServiceRow ───────────────────────────────────────────────────────────────

function ServiceRow({ service, selected, onSelect }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 transition-colors ${
      selected ? 'bg-gray-50 dark:bg-gray-800/60' : 'bg-white dark:bg-gray-900 hover:bg-gray-50/70 dark:hover:bg-gray-800/30'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900 dark:text-gray-50">{service.name}</h4>
          {selected && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 flex-shrink-0" />}
        </div>
        {service.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
        )}
        {service.duration_minutes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />{service.duration_minutes} min
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">
          ${service.price?.toLocaleString()}
        </span>
        <button
          onClick={onSelect}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
            selected
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
              : 'border border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-50 hover:bg-gray-900 hover:text-white dark:hover:bg-gray-100 dark:hover:text-gray-900'
          }`}
        >
          {selected ? 'Seleccionado' : 'Reservar'}
        </button>
      </div>
    </div>
  )
}

// ─── ReviewsSection ───────────────────────────────────────────────────────────

function ReviewsSection({ shopReviews, avgRating }) {
  const [showAll, setShowAll] = useState(false)

  if (shopReviews.length === 0) return null

  const starCounts = [5, 4, 3, 2, 1].map(star => ({
    star, count: shopReviews.filter(r => r.rating === star).length,
  }))

  const visible = showAll ? shopReviews : shopReviews.slice(0, 4)

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-5 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        Opiniones
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">· {avgRating?.toFixed(1)} ({shopReviews.length})</span>
      </h3>

      {/* Resumen */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
        <div className="text-center flex-shrink-0">
          <p className="text-5xl font-bold text-gray-900 dark:text-gray-50 leading-none">{avgRating.toFixed(1)}</p>
          <StarRating value={Math.round(avgRating)} size="sm" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{shopReviews.length} reseña{shopReviews.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {starCounts.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-2">{star}</span>
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${shopReviews.length > 0 ? (count / shopReviews.length) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 w-4 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjetas */}
      <div className="space-y-6">
        {visible.map(review => {
          const initials = (review.reviewerName || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
          const gradient = getAvatarGradient(review.reviewerName || '')
          return (
            <div key={review.id} className="flex gap-4">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                <span className="text-sm font-bold text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{review.reviewerName || 'Cliente'}</span>
                  <StarRating value={review.rating} size="sm" />
                </div>
                {review.createdAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatReviewDate(review.createdAt)}</p>
                )}
                {review.comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">{review.comment}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {shopReviews.length > 4 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-5 w-full py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          {showAll ? 'Ver menos' : `Ver todas las opiniones (${shopReviews.length})`}
        </button>
      )}
    </div>
  )
}

// ─── BookingSidebar ───────────────────────────────────────────────────────────

function BookingSidebar({ step, setStep, booking, setBooking, shop, selectedService, selectedBarber, barbers, shopId, categorySlug, products, selectedProducts, setSelectedProducts, activeSubscription, onConfirm, confirming, isAuthenticated, canProceed }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-50">Tu reserva</h3>
        {step > 1 && (
          <div className="flex items-center gap-1 mt-2">
            {[2, 3, 4].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Servicio seleccionado */}
      {selectedService && step > 1 && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm truncate">{selectedService.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {selectedService.duration_minutes ? `${selectedService.duration_minutes} min · ` : ''}${selectedService.price?.toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => { setStep(1); setBooking(prev => ({ ...prev, serviceId: null, date: '', time: '', barberId: null })) }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 underline flex-shrink-0"
          >
            Cambiar
          </button>
        </div>
      )}

      {/* Contenido del paso */}
      <div className="p-5">
        {step === 1 && (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Scissors className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Selecciona un servicio</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
              Elige un servicio de la lista para comenzar tu reserva
            </p>
          </div>
        )}

        {step === 2 && <DateStep booking={booking} setBooking={setBooking} />}

        {step === 3 && (
          <TimeBarberStep
            barbers={barbers}
            booking={booking}
            setBooking={setBooking}
            shopId={shopId}
            categorySlug={categorySlug}
          />
        )}

        {step === 4 && (
          <ConfirmStep
            booking={booking}
            setBooking={setBooking}
            shop={shop}
            selectedService={selectedService}
            selectedBarber={selectedBarber}
            activeSubscription={activeSubscription}
            products={products}
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />
        )}
      </div>

      {/* Navegación */}
      {step > 1 && (
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center justify-center gap-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onConfirm}
              disabled={!canProceed() || confirming}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {confirming
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                : !isAuthenticated
                  ? <><LogIn className="w-4 h-4" /> Iniciar sesión</>
                  : <><Check className="w-4 h-4" /> Confirmar cita</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Paso 2: Fecha ─────────────────────────────────────────────────────────────

function DateStep({ booking, setBooking }) {
  const days = nextDays(21)
  const today = todayStr()
  const todayExhausted = isTodayExhausted()

  return (
    <div>
      <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">Selecciona la fecha</h4>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Elige el día de tu cita</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = day.toISOString().split('T')[0]
          const selected = booking.date === dateStr
          const isToday = dateStr === today
          const disabled = isToday && todayExhausted
          return (
            <button
              key={dateStr}
              disabled={disabled}
              onClick={() => !disabled && setBooking({ ...booking, date: dateStr, time: '', barberId: null })}
              className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all border-2 ${
                disabled
                  ? 'border-transparent bg-gray-50 dark:bg-gray-900 opacity-40 cursor-not-allowed'
                  : selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`text-[10px] font-medium ${selected ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                {DAY_NAMES[day.getDay()]}
              </span>
              <span className={`text-base font-bold leading-tight ${selected ? 'text-white' : 'text-gray-900 dark:text-gray-50'}`}>
                {day.getDate()}
              </span>
              <span className={`text-[10px] ${disabled ? 'text-red-400' : selected ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                {disabled ? 'Agot.' : isToday ? 'Hoy' : MONTH_NAMES[day.getMonth()]}
              </span>
            </button>
          )
        })}
      </div>
      {booking.date && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Seleccionado: <strong className="text-gray-900 dark:text-gray-50">{booking.date}</strong>
        </p>
      )}
    </div>
  )
}

// ─── Paso 3: Hora + Profesional ────────────────────────────────────────────────

function TimeBarberStep({ barbers, booking, setBooking, shopId, categorySlug }) {
  const [bookedBarberIds, setBookedBarberIds]   = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [conflictInfo, setConflictInfo]         = useState(null)
  const [checkingConflict, setCheckingConflict] = useState(false)

  const isToday = booking.date === todayStr()

  const handleTimeSelect = async (time) => {
    if (isPastTime(time, isToday)) return
    setBooking({ ...booking, time, barberId: null })
    setConflictInfo(null)
    setLoadingAvailability(true)
    try {
      const booked = await api.getBookedBarbers(shopId, booking.date, time, booking.durationMinutes || 30)
      setBookedBarberIds(booked || [])
    } catch { setBookedBarberIds([]) }
    finally { setLoadingAvailability(false) }
  }

  const handleBarberSelect = async (barberId) => {
    setBooking({ ...booking, barberId })
    setConflictInfo(null)
    setCheckingConflict(true)
    try {
      const result = await api.checkScheduleConflict({ barberId, shopId, date: booking.date, time: booking.time, durationMinutes: booking.durationMinutes || 30 })
      setConflictInfo(result?.hasConflict ? result : null)
    } catch { setConflictInfo(null) }
    finally { setCheckingConflict(false) }
  }

  return (
    <div className="space-y-5">
      {/* Horarios */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-3 flex items-center gap-1.5 text-sm">
          <Clock className="w-4 h-4" /> Hora disponible
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_SLOTS.map(time => {
            const past = isPastTime(time, isToday)
            const selected = booking.time === time
            return (
              <button key={time} disabled={past} onClick={() => handleTimeSelect(time)}
                className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                  past ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-950 cursor-not-allowed line-through'
                    : selected ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                }`}
              >
                {time}
              </button>
            )
          })}
        </div>
      </div>

      {/* Profesionales */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-3 flex items-center gap-1.5 text-sm">
          <Users className="w-4 h-4" />
          {booking.time ? `${getProfessionalTitle(categorySlug, true)} disponibles` : getProfessionalTitle(categorySlug, true)}
        </h4>

        {!booking.time ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <Clock className="w-7 h-7 mb-2 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-xs">Selecciona una hora primero</p>
          </div>
        ) : loadingAvailability ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-2">
            {barbers.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No hay profesionales registrados</p>
            )}
            {barbers.map(barber => {
              const booked   = bookedBarberIds.includes(barber.id)
              const selected = booking.barberId === barber.id
              return (
                <button key={barber.id} disabled={booked} onClick={() => !booked && handleBarberSelect(barber.id)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    booked ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-50 cursor-not-allowed'
                      : selected ? 'border-gray-900 bg-gray-50 dark:bg-gray-800 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {barber.imageUrl
                      ? <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                      : <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{barber.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {barber.rating != null && barber.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-medium">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{Number(barber.rating).toFixed(1)}
                        </span>
                      )}
                      <span className={`text-xs font-medium ${booked ? 'text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {booked ? 'Ocupado' : '● Disponible'}
                      </span>
                    </div>
                  </div>
                  {selected && !checkingConflict && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 flex-shrink-0" />}
                  {selected && checkingConflict && <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />}
                </button>
              )
            })}

            {conflictInfo && (
              <div className="mt-2 flex gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Aviso de horario</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">{conflictInfo.message}</p>
                  <p className="text-xs text-amber-600 mt-1.5">Puedes continuar de todas formas.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Paso 4: Confirmar ─────────────────────────────────────────────────────────

function ConfirmStep({ booking, setBooking, shop, selectedService, selectedBarber, activeSubscription, products, selectedProducts, setSelectedProducts }) {
  const autocompleteRef = useRef(null)
  const subUsable = activeSubscription?.status === 'active' && activeSubscription?.cutsRemaining > 0

  const paymentMethods = [
    { id: 'cash', label: 'Efectivo', emoji: '💵', desc: 'Paga al llegar' },
    { id: 'transfer', label: 'Transferencia', emoji: '💳', desc: 'Transferencia bancaria' },
    ...(subUsable ? [{
      id: 'subscription', label: 'Suscripción', emoji: '🏷️',
      desc: `${activeSubscription.cutsRemaining} disponible${activeSubscription.cutsRemaining !== 1 ? 's' : ''} · ${activeSubscription.planName}`,
    }] : []),
  ]

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return
    const address = place.formatted_address || place.name || ''
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    let surcharge = 0, distKm = null
    if (shop?.latitude && shop?.longitude) {
      distKm = haversineKm(shop.latitude, shop.longitude, lat, lng)
      surcharge = Math.round(distKm * 2 * (shop.pricePerKm || 0))
    }
    setBooking(b => ({ ...b, clientAddress: address, clientLatitude: lat, clientLongitude: lng, homeDistanceKm: distKm, surchargeAmount: surcharge }))
  }, [shop, setBooking])

  const servicePrice      = selectedService?.price ?? 0
  const productsSubtotal  = (products || []).reduce((sum, p) => sum + p.salePrice * (selectedProducts?.[p.id] || 0), 0)
  const totalPrice        = (booking.locationType === 'home' ? servicePrice + (booking.surchargeAmount || 0) : servicePrice) + productsSubtotal

  const adjustProduct = (productId, delta, maxStock) => {
    setSelectedProducts(prev => {
      const current = prev[productId] || 0
      const next = Math.max(0, Math.min(maxStock, current + delta))
      if (next === 0) { const copy = { ...prev }; delete copy[productId]; return copy }
      return { ...prev, [productId]: next }
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">Confirma tu cita</h4>
        <p className="text-xs text-gray-400 dark:text-gray-500">Revisa los detalles y elige cómo pagar</p>
      </div>

      {/* Resumen */}
      <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs"><Scissors className="w-3.5 h-3.5" /> Servicio</span>
          <span className="font-semibold text-gray-900 dark:text-gray-50 text-xs">{selectedService?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5" /> Fecha</span>
          <span className="font-semibold text-gray-900 dark:text-gray-50 text-xs">{booking.date}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs"><Clock className="w-3.5 h-3.5" /> Hora</span>
          <span className="font-semibold text-gray-900 dark:text-gray-50 text-xs">{booking.time}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Profesional</span>
          <span className="font-semibold text-gray-900 dark:text-gray-50 text-xs">{selectedBarber?.name}</span>
        </div>
        {booking.locationType === 'home' && booking.surchargeAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5" /> Recargo domicilio</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50 text-xs">+${booking.surchargeAmount.toLocaleString()}</span>
          </div>
        )}
        {productsSubtotal > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-xs"><ShoppingBag className="w-3.5 h-3.5" /> Productos</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50 text-xs">+${productsSubtotal.toLocaleString()}</span>
          </div>
        )}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between items-center">
          <span className="font-bold text-gray-900 dark:text-gray-50 text-sm">Total</span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-50">${totalPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Dirección domicilio */}
      {booking.locationType === 'home' && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
            <Home className="w-4 h-4" /> Tu dirección <span className="text-red-500">*</span>
          </h4>
          <Autocomplete onLoad={ref => (autocompleteRef.current = ref)} onPlaceChanged={onPlaceChanged}>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <input type="text" defaultValue={booking.clientAddress} placeholder="Escribe tu dirección..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </Autocomplete>
          {booking.homeDistanceKm != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              📍 {booking.homeDistanceKm.toFixed(1)} km
              {booking.surchargeAmount > 0 && <span> → recargo <strong>${booking.surchargeAmount.toLocaleString()}</strong></span>}
            </p>
          )}
        </div>
      )}

      {/* Productos */}
      {products && products.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Agregar productos
            <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </h4>
          <div className="space-y-2">
            {products.map(p => {
              const qty = selectedProducts?.[p.id] || 0
              return (
                <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${qty > 0 ? 'border-gray-900 dark:border-gray-400 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-50 truncate">{p.name}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-50 mt-0.5">${p.salePrice?.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {qty > 0 ? (
                      <>
                        <button onClick={() => adjustProduct(p.id, -1, p.stock)} className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition">−</button>
                        <span className="w-4 text-center text-xs font-bold text-gray-900 dark:text-gray-50">{qty}</span>
                        <button onClick={() => adjustProduct(p.id, +1, p.stock)} disabled={qty >= p.stock} className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-30">+</button>
                      </>
                    ) : (
                      <button onClick={() => adjustProduct(p.id, +1, p.stock)} className="text-xs px-2.5 py-1 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:opacity-80 transition font-medium">
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Método de pago */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Método de pago</h4>
        <div className="space-y-2">
          {paymentMethods.map(m => (
            <button key={m.id} onClick={() => setBooking({ ...booking, paymentMethod: m.id })}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2.5 ${booking.paymentMethod === m.id ? 'border-gray-900 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}>
              <span className="text-lg">{m.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{m.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.desc}</p>
              </div>
              {booking.paymentMethod === m.id && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PlanCard ──────────────────────────────────────────────────────────────────

function PlanCard({ plan, isAuthenticated, navigate, slug, setActiveSubscription, serviceUnit = 'cortes' }) {
  const [subscribing, setSubscribing] = useState(false)
  const [done, setDone]               = useState(false)
  const [err, setErr]                 = useState(null)

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/book/${slug}` } })
      return
    }
    setSubscribing(true); setErr(null)
    try {
      const sub = await api.subscribe(plan.id)
      setActiveSubscription(sub); setDone(true)
    } catch (e) {
      setErr(e?.message || 'No se pudo completar la suscripción')
    } finally { setSubscribing(false) }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-300">
        <Check className="w-4 h-4 flex-shrink-0" />
        <span>¡Suscrito a <strong>{plan.name}</strong>!</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{plan.name}</p>
          <span className="text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 rounded-full font-medium">${plan.price?.toLocaleString()}/mes</span>
          <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
            <Repeat2 className="w-3 h-3" />{plan.cutsPerPeriod} {serviceUnit}
          </span>
        </div>
        {plan.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{plan.description}</p>}
        {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
      </div>
      <button onClick={handleSubscribe} disabled={subscribing}
        className="ml-3 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 whitespace-nowrap flex-shrink-0">
        {subscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
        {subscribing ? 'Procesando...' : isAuthenticated ? 'Suscribirse' : 'Iniciar sesión'}
      </button>
    </div>
  )
}

export default PublicBooking
