import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Scissors,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  LogIn,
  MapPin,
  Star,
  Loader2,
  Home,
  AlertTriangle,
  Crown,
  Repeat2,
  ShoppingBag,
  Package,
} from 'lucide-react'
import { Autocomplete } from '@react-google-maps/api'
import { api } from '../lib/api'
import { toast } from '../lib/swal'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'

// ─── helpers de fecha/hora ────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/** Retorna los próximos `count` días como objetos Date (empezando hoy) */
function nextDays(count = 21) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * true si el slot no cumple la anticipación mínima de 15 minutos.
 * Solo aplica cuando la fecha seleccionada es hoy.
 */
function isPastTime(timeStr, isToday) {
  if (!isToday) return false
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  const slotMinutes = h * 60 + m
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  // Bloquear si el slot está a menos de 15 minutos de ahora
  return slotMinutes <= nowMinutes + 15
}

/**
 * true si ya no quedan slots disponibles para hoy
 * (todos los TIME_SLOTS son pasados o están a menos de 15 min).
 */
function isTodayExhausted() {
  return TIME_SLOTS.every(slot => isPastTime(slot, true))
}

/** Calcula distancia en km usando la fórmula de Haversine */
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

// ─── Componente principal ──────────────────────────────────────────────────────

function PublicBooking() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [shop, setShop] = useState(null)
  const [services, setServices] = useState([])
  const [shopReviews, setShopReviews] = useState([])
  const [plans, setPlans] = useState([])
  const [products, setProducts] = useState([])
  const [loadingShop, setLoadingShop] = useState(true)
  const [shopError, setShopError] = useState(null)
  const [activeSubscription, setActiveSubscription] = useState(null)

  // Paso actual: 1 Servicio | 2 Fecha | 3 Hora+Barbero | 4 Confirmar
  const [step, setStep] = useState(1)
  const [booking, setBooking] = useState({
    serviceId: null,
    date: '',
    time: '',
    barberId: null,
    paymentMethod: 'cash',
    locationType: 'barbershop',
    clientAddress: '',
    clientLatitude: null,
    clientLongitude: null,
    homeDistanceKm: null,
    surchargeAmount: 0,
    durationMinutes: 30,
  })
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  // { [productId]: quantity } — productos elegidos en el paso 4
  const [selectedProducts, setSelectedProducts] = useState({})

  useEffect(() => {
    api.getShopBySlug(slug)
      .then(async (shopData) => {
        // Cargar servicios, reseñas, planes, productos y suscripción activa del usuario en paralelo
        const extras = [
          api.getShopServices(shopData.id).catch(() => []),
          api.getShopReviews(shopData.id).catch(() => []),
          api.getShopSubscriptionPlans(shopData.id).catch(() => []),
          api.getShopProducts(shopData.id).catch(() => []),
        ]
        if (isAuthenticated) {
          extras.push(api.getMyActiveSubscription(shopData.id).catch(() => null))
        }
        const [servicesData, reviewsData, plansData, productsData, activeSub] = await Promise.all(extras)
        setShop(shopData)
        setServices(servicesData || [])
        setShopReviews(reviewsData || [])
        setPlans(plansData || [])
        setProducts(productsData || [])
        if (activeSub) setActiveSubscription(activeSub)
      })
      .catch(() => setShopError('No se encontró el negocio'))
      .finally(() => setLoadingShop(false))
  }, [slug, isAuthenticated])

  const barbers = shop?.barbers ?? []
  const selectedService = services.find((s) => s.id === booking.serviceId)
  const selectedBarber = barbers.find((b) => b.id === booking.barberId)

  const canProceed = () => {
    if (step === 1) return !!booking.serviceId
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
        userId: user.userId,
        shopId: shop.id,
        serviceId: booking.serviceId,
        barberId: booking.barberId,
        date: booking.date,
        time: booking.time,
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
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">¡Cita confirmada!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Tu cita en <strong>{shop.name}</strong> fue agendada.</p>
          {/* Resumen rápido */}
          {(() => {
            const svcPrice = selectedService?.price ?? 0
            const spSubtotal = Object.entries(selectedProducts).reduce((sum, [pid, qty]) => {
              const p = products.find((x) => x.id === Number(pid))
              return sum + (p?.salePrice ?? 0) * qty
            }, 0)
            const grandTotal = svcPrice + (booking.locationType === 'home' ? (booking.surchargeAmount || 0) : 0) + spSubtotal
            const chosenProductEntries = Object.entries(selectedProducts).filter(([, qty]) => qty > 0)
            return (
              <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left mb-6 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <p>📋 <strong>{selectedService?.name}</strong></p>
                <p>📅 {booking.date} a las {booking.time}</p>
                <p>✂️ {selectedBarber?.name}</p>
                {booking.locationType === 'home' && booking.clientAddress && (
                  <p>🏠 {booking.clientAddress}</p>
                )}
                {chosenProductEntries.length > 0 && (
                  <p>🛍️ {chosenProductEntries.map(([pid, qty]) => {
                    const p = products.find((x) => x.id === Number(pid))
                    return p ? `${p.name} ×${qty}` : null
                  }).filter(Boolean).join(', ')}</p>
                )}
                <p>💰 ${grandTotal.toLocaleString()}
                  {' '}· {booking.paymentMethod === 'cash' ? 'Efectivo' : booking.paymentMethod === 'subscription' ? 'Suscripción' : 'Transferencia'}
                </p>
              </div>
            )
          })()}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/appointments')}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
            >
              Ver mis citas
            </button>
            <button
              onClick={() => {
                setConfirmed(false)
                setStep(1)
                setSelectedProducts({})
                setBooking({ serviceId: null, date: '', time: '', barberId: null, paymentMethod: 'cash', locationType: 'barbershop', clientAddress: '', clientLatitude: null, clientLongitude: null, homeDistanceKm: null, surchargeAmount: 0, durationMinutes: 30 })
              }}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Agendar otra
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Layout principal ────────────────────────────────────────────────────────

  const steps = [
    { n: 1, label: 'Servicio', icon: Scissors },
    { n: 2, label: 'Fecha', icon: Calendar },
    { n: 3, label: 'Hora y barbero', icon: Clock },
    { n: 4, label: 'Confirmar', icon: Check },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 text-white py-4 px-6 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">{shop.name}</h1>
              {shop.address && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{shop.address}
                </p>
              )}
            </div>
          </div>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login', { state: { from: `/book/${slug}` } })}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Stepper */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon
            const done = step > s.n
            const active = step === s.n
            return (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm font-bold ${
                    done ? 'bg-gray-900 text-white'
                    : active ? 'bg-gray-900 text-white ring-4 ring-gray-200 dark:ring-gray-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`mt-1.5 text-xs font-medium text-center leading-tight ${active || done ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400 dark:text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${step > s.n ? 'bg-gray-900' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Mini-resumen de selecciones previas */}
        {(booking.serviceId || booking.date || booking.time) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedService && (
              <span className="bg-gray-900 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Scissors className="w-3 h-3" /> {selectedService.name} · ${selectedService.price?.toLocaleString()}
              </span>
            )}
            {booking.date && (
              <span className="bg-gray-900 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {booking.date}
              </span>
            )}
            {booking.time && (
              <span className="bg-gray-900 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> {booking.time}
              </span>
            )}
            {selectedBarber && (
              <span className="bg-gray-900 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" /> {selectedBarber.name}
              </span>
            )}
          </div>
        )}

        {/* Contenido del paso */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-5 shadow-sm">
          {step === 1 && (
            <ServiceStep
              services={services}
              booking={booking}
              setBooking={setBooking}
              shop={shop}
              shopReviews={shopReviews}
              plans={plans}
              activeSubscription={activeSubscription}
              setActiveSubscription={setActiveSubscription}
              isAuthenticated={isAuthenticated}
              navigate={navigate}
              slug={slug}
            />
          )}
          {step === 2 && (
            <DateStep booking={booking} setBooking={setBooking} />
          )}
          {step === 3 && (
            <TimeBarberStep
              barbers={barbers}
              booking={booking}
              setBooking={setBooking}
              shopId={shop.id}
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
              products={products.filter((p) => p.active && p.stock > 0)}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
            />
          )}

        </div>

        {/* Navegación */}
        <div className="flex justify-between">
          <button
            onClick={() => step === 1 ? navigate(-1) : setStep((s) => s - 1)}
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Volver' : 'Anterior'}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!canProceed() || confirming}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {confirming ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Confirmando...</>
              ) : !isAuthenticated ? (
                <><LogIn className="h-4 w-4" /> Iniciar sesión para confirmar</>
              ) : (
                <><Check className="h-4 w-4" /> Confirmar cita</>
              )}
            </button>
          )}
        </div>

        {/* ── Productos disponibles ── */}
        {products.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Productos disponibles</h2>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                {products.length}
              </span>
            </div>

            {/* Agrupar por categoría */}
            {(() => {
              const grouped = products.reduce((acc, p) => {
                const cat = p.category || 'Otros'
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(p)
                return acc
              }, {})
              return Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-5">
                  {Object.keys(grouped).length > 1 && (
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{category}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
                      >
                        {/* Imagen */}
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-28 object-cover"
                          />
                        ) : (
                          <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                        {/* Info */}
                        <div className="p-3">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 line-clamp-1">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
                              ${product.salePrice?.toLocaleString()}
                            </span>
                            {(product.stock ?? 0) < 5 && (product.stock ?? 0) > 0 && (
                              <span className="text-xs text-orange-500 font-medium">
                                Últimas {product.stock}
                              </span>
                            )}
                            {(product.stock ?? 0) === 0 && (
                              <span className="text-xs text-red-400 font-medium">Sin stock</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Paso 1: Servicio ──────────────────────────────────────────────────────────

function ServiceStep({ services, booking, setBooking, shop, shopReviews = [], plans = [], activeSubscription, setActiveSubscription, isAuthenticated, navigate, slug }) {
  const handleLocationChange = (locationType) => {
    setBooking((b) => ({
      ...b,
      locationType,
      durationMinutes: locationType === 'home' ? 180 : 30,
      // Resetear hora/barbero porque cambia la disponibilidad
      time: '',
      barberId: null,
    }))
  }

  // Calcular rating promedio del negocio
  const avgRating = shopReviews.length > 0
    ? shopReviews.reduce((sum, r) => sum + r.rating, 0) / shopReviews.length
    : null

  if (services.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
        No hay servicios disponibles en este momento.
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Selecciona un servicio</h2>
        {/* Rating promedio del negocio */}
        {avgRating !== null && (
          <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded-lg px-2.5 py-1 flex-shrink-0">
            <StarRating value={Math.round(avgRating)} size="sm" />
            <span className="text-xs font-semibold text-yellow-700">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-yellow-600">{shopReviews.length})</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Elige el servicio que deseas reservar</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {services.map((service) => {
          const selected = booking.serviceId === service.id
          return (
            <button
              key={service.id}
              onClick={() => setBooking({ ...booking, serviceId: service.id })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected ? 'border-gray-900 bg-gray-50 dark:bg-gray-800 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{service.name}</h3>
                {selected && <Check className="h-4 w-4 text-gray-900 dark:text-gray-50 flex-shrink-0" />}
              </div>
              {service.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{service.description}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
                  ${service.price?.toLocaleString()}
                </span>
                {service.duration_minutes && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {service.duration_minutes} min
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Planes de suscripción */}
      {(plans.length > 0 || activeSubscription) && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-purple-500" /> Planes de suscripción
          </h3>

          {/* Suscripción activa */}
          {activeSubscription && (
            <div className="mb-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">{activeSubscription.planName}</p>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">Activa</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-purple-700 dark:text-purple-400">
                <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" />{activeSubscription.cutsRemaining} cortes restantes</span>
                <span>{activeSubscription.daysRemaining} días</span>
              </div>
              {/* Barra de progreso */}
              <div className="mt-2 w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full"
                  style={{ width: `${Math.round((activeSubscription.cutsUsed / activeSubscription.cutsAllowed) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Planes disponibles (solo si no tiene suscripción activa) */}
          {!activeSubscription && plans.length > 0 && (
            <div className="space-y-2">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isAuthenticated={isAuthenticated}
                  navigate={navigate}
                  slug={slug}
                  setActiveSubscription={setActiveSubscription}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selector de ubicación (solo si el negocio ofrece domicilio) */}
      {shop?.homeServiceEnabled && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> ¿Dónde prefieres el servicio?
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'barbershop', label: 'En la barbería', emoji: '🏪', desc: 'Visita el local' },
              { id: 'home', label: 'A domicilio', emoji: '🏠', desc: `+$${(shop.pricePerKm || 0).toLocaleString()}/km ida y vuelta · 3 h bloqueo` },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => handleLocationChange(l.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  booking.locationType === l.id ? 'border-gray-900 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{l.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{l.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{l.desc}</p>
                  </div>
                  {booking.locationType === l.id && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 flex-shrink-0 mt-0.5" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reseñas recientes del negocio */}
      {shopReviews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Reseñas de clientes
          </h3>
          <div className="space-y-2.5">
            {shopReviews.slice(0, 5).map((review) => (
              <div key={review.id} className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    {review.reviewerName || 'Cliente'}
                  </span>
                  <StarRating value={review.rating} size="sm" />
                </div>
                {review.comment && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
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
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">Selecciona la fecha</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Elige el día de tu cita</p>
      <div className="grid grid-cols-7 gap-1.5">
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
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-all border-2 ${
                disabled
                  ? 'border-transparent bg-gray-50 dark:bg-gray-900 opacity-40 cursor-not-allowed'
                  : selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`text-xs font-medium ${
                disabled ? 'text-gray-400 dark:text-gray-500'
                : selected ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {DAY_NAMES[day.getDay()]}
              </span>
              <span className={`text-lg font-bold leading-tight ${
                disabled ? 'text-gray-400 dark:text-gray-500'
                : selected ? 'text-white' : 'text-gray-900 dark:text-gray-50'
              }`}>
                {day.getDate()}
              </span>
              <span className={`text-xs ${
                disabled ? 'text-red-400 dark:text-red-500'
                : selected ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {disabled ? 'Agotado' : isToday ? 'Hoy' : MONTH_NAMES[day.getMonth()]}
              </span>
            </button>
          )
        })}
      </div>
      {booking.date && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Fecha seleccionada: <strong className="text-gray-900 dark:text-gray-50">{booking.date}</strong>
        </p>
      )}
    </div>
  )
}

// ─── Paso 3: Hora + Barbero ────────────────────────────────────────────────────

function TimeBarberStep({ barbers, booking, setBooking, shopId }) {
  const [bookedBarberIds, setBookedBarberIds] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [conflictInfo, setConflictInfo] = useState(null)      // aviso de conflicto entre negocios
  const [checkingConflict, setCheckingConflict] = useState(false)

  const isToday = booking.date === todayStr()

  const handleTimeSelect = async (time) => {
    if (isPastTime(time, isToday)) return
    // Reset barber y conflicto al cambiar hora
    setBooking({ ...booking, time, barberId: null })
    setConflictInfo(null)
    setLoadingAvailability(true)
    try {
      const booked = await api.getBookedBarbers(shopId, booking.date, time, booking.durationMinutes || 30)
      setBookedBarberIds(booked || [])
    } catch {
      setBookedBarberIds([])
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleBarberSelect = async (barberId) => {
    setBooking({ ...booking, barberId })
    setConflictInfo(null)
    setCheckingConflict(true)
    try {
      const result = await api.checkScheduleConflict({
        barberId,
        shopId,
        date: booking.date,
        time: booking.time,
        durationMinutes: booking.durationMinutes || 30,
      })
      setConflictInfo(result?.hasConflict ? result : null)
    } catch {
      setConflictInfo(null)
    } finally {
      setCheckingConflict(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">Hora y barbero</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
        Elige la hora y ve qué barberos están disponibles
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Columna izquierda: horarios */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Hora disponible
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((time) => {
              const past = isPastTime(time, isToday)
              const selected = booking.time === time
              return (
                <button
                  key={time}
                  disabled={past}
                  onClick={() => handleTimeSelect(time)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    past
                      ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-950 cursor-not-allowed line-through'
                      : selected
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </div>

        {/* Columna derecha: barberos */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {booking.time ? 'Barberos disponibles' : 'Barberos'}
          </h3>

          {!booking.time ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 text-gray-400 dark:text-gray-500">
              <Clock className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">Selecciona una hora para<br />ver la disponibilidad</p>
            </div>
          ) : loadingAvailability ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {barbers.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No hay barberos en este negocio</p>
              )}
              {barbers.map((barber) => {
                const booked = bookedBarberIds.includes(barber.id)
                const selected = booking.barberId === barber.id
                return (
                  <button
                    key={barber.id}
                    disabled={booked}
                    onClick={() => !booked && handleBarberSelect(barber.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                      booked
                        ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-50 cursor-not-allowed'
                        : selected
                          ? 'border-gray-900 bg-gray-50 dark:bg-gray-800 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {barber.imageUrl
                        ? <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                        : <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{barber.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {barber.rating != null && barber.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-600 font-medium">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            {Number(barber.rating).toFixed(1)}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${booked ? 'text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {booked ? 'Ocupado a esta hora' : '● Disponible'}
                        </span>
                      </div>
                    </div>
                    {selected && !checkingConflict && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 flex-shrink-0" />}
                    {selected && checkingConflict && <Loader2 className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin flex-shrink-0" />}
                  </button>
                )
              })}

              {/* ── Aviso de conflicto de horario ── */}
              {conflictInfo && (
                <div className="mt-3 flex gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-xl p-3.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Aviso de horario</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                      {conflictInfo.message}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-amber-700 dark:text-amber-300">
                      <span className="bg-amber-100 rounded px-2 py-0.5">
                        Otra cita: {conflictInfo.existingStart} – {conflictInfo.existingEnd}
                      </span>
                      <span className="bg-amber-100 rounded px-2 py-0.5">
                        Esta cita: {conflictInfo.newStart} – {conflictInfo.newEnd}
                      </span>
                      <span className="bg-amber-100 rounded px-2 py-0.5 font-semibold">
                        Margen: {conflictInfo.gapMinutes} min
                      </span>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Puedes continuar de todas formas. El barbero podría llegar tarde o necesitar reorganizar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Paso 4: Confirmar ─────────────────────────────────────────────────────────

function ConfirmStep({ booking, setBooking, shop, selectedService, selectedBarber, activeSubscription, products, selectedProducts, setSelectedProducts }) {
  const autocompleteRef = useRef(null)
  const subUsable = activeSubscription?.status === 'active'
    && activeSubscription?.cutsRemaining > 0
  const paymentMethods = [
    { id: 'cash', label: 'Efectivo', emoji: '💵', desc: 'Paga al llegar' },
    { id: 'transfer', label: 'Transferencia', emoji: '💳', desc: 'Transferencia bancaria' },
    ...(subUsable ? [{
      id: 'subscription',
      label: 'Suscripción',
      emoji: '🏷️',
      desc: `${activeSubscription.cutsRemaining} corte${activeSubscription.cutsRemaining !== 1 ? 's' : ''} disponible${activeSubscription.cutsRemaining !== 1 ? 's' : ''} · ${activeSubscription.planName}`,
    }] : []),
  ]

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return
    const address = place.formatted_address || place.name || ''
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    let surcharge = 0
    let distKm = null
    if (shop?.latitude && shop?.longitude) {
      distKm = haversineKm(shop.latitude, shop.longitude, lat, lng)
      surcharge = Math.round(distKm * 2 * (shop.pricePerKm || 0))
    }
    setBooking((b) => ({
      ...b,
      clientAddress: address,
      clientLatitude: lat,
      clientLongitude: lng,
      homeDistanceKm: distKm,
      surchargeAmount: surcharge,
    }))
  }, [shop, setBooking])

  const servicePrice = selectedService?.price ?? 0
  const productsSubtotal = (products || []).reduce((sum, p) => {
    const qty = selectedProducts?.[p.id] || 0
    return sum + p.salePrice * qty
  }, 0)
  const totalPrice = (booking.locationType === 'home'
    ? servicePrice + (booking.surchargeAmount || 0)
    : servicePrice) + productsSubtotal

  const adjustProduct = (productId, delta, maxStock) => {
    setSelectedProducts((prev) => {
      const current = prev[productId] || 0
      const next = Math.max(0, Math.min(maxStock, current + delta))
      if (next === 0) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: next }
    })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">Confirma tu cita</h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Revisa los detalles y elige cómo pagar</p>

      {/* Resumen */}
      <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Resumen</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> Servicio</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">{selectedService?.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Fecha</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">{booking.date}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Hora</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">{booking.time}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Barbero</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">{selectedBarber?.name}</span>
          </div>
          {booking.locationType === 'home' && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Servicio</span>
              <span className="font-semibold text-gray-900 dark:text-gray-50">A domicilio · 3 h</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Servicio</span>
            <span className="font-semibold text-gray-900 dark:text-gray-50">${servicePrice.toLocaleString()}</span>
          </div>
          {booking.locationType === 'home' && booking.surchargeAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Recargo domicilio
                {booking.homeDistanceKm && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({booking.homeDistanceKm.toFixed(1)} km × 2)</span>
                )}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-50">+${booking.surchargeAmount.toLocaleString()}</span>
            </div>
          )}
          {productsSubtotal > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Productos
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-50">+${productsSubtotal.toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5 flex justify-between items-center">
            <span className="text-gray-900 dark:text-gray-50 font-semibold flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Total</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-50">${totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dirección (solo domicilio) */}
      {booking.locationType === 'home' && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
            <Home className="w-4 h-4" /> Tu dirección <span className="text-red-500">*</span>
          </h3>
          <Autocomplete
            onLoad={(ref) => (autocompleteRef.current = ref)}
            onPlaceChanged={onPlaceChanged}
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                defaultValue={booking.clientAddress}
                placeholder="Escribe tu dirección..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </Autocomplete>
          {booking.homeDistanceKm != null && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              📍 Distancia estimada: <strong>{booking.homeDistanceKm.toFixed(1)} km</strong>
              {booking.surchargeAmount > 0 && (
                <span> → recargo <strong>${booking.surchargeAmount.toLocaleString()}</strong></span>
              )}
            </p>
          )}
          {!booking.clientAddress && (
            <p className="text-xs text-red-400 mt-1">Debes seleccionar una dirección para continuar</p>
          )}
        </div>
      )}

      {/* Agregar productos de la tienda */}
      {products && products.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Agregar productos de la tienda
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(opcional)</span>
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Selecciona productos para incluir en tu atención</p>
          <div className="space-y-2">
            {products.map((p) => {
              const qty = selectedProducts?.[p.id] || 0
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    qty > 0
                      ? 'border-gray-900 dark:border-gray-400 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  {/* Imagen */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      : <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    }
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.category && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                      )}
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-50">
                        ${p.salePrice?.toLocaleString()}
                      </span>
                      {p.stock <= 5 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Solo {p.stock} disponibles
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {qty > 0 ? (
                      <>
                        <button
                          onClick={() => adjustProduct(p.id, -1, p.stock)}
                          className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-bold text-base"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-gray-900 dark:text-gray-50">{qty}</span>
                        <button
                          onClick={() => adjustProduct(p.id, +1, p.stock)}
                          disabled={qty >= p.stock}
                          className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-30 font-bold text-base"
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => adjustProduct(p.id, +1, p.stock)}
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:opacity-80 transition font-medium"
                      >
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
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Método de pago</h3>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => setBooking({ ...booking, paymentMethod: m.id })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                booking.paymentMethod === m.id ? 'border-gray-900 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{m.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{m.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.desc}</p>
                </div>
                {booking.paymentMethod === m.id && <Check className="w-4 h-4 text-gray-900 dark:text-gray-50 ml-auto" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PlanCard ───────────────────────────────────────────────────────────────────

function PlanCard({ plan, isAuthenticated, navigate, slug, setActiveSubscription }) {
  const [subscribing, setSubscribing] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/book/${slug}` } })
      return
    }
    setSubscribing(true)
    setErr(null)
    try {
      const sub = await api.subscribe(plan.id)
      setActiveSubscription(sub)
      setDone(true)
    } catch (e) {
      setErr(e?.message || 'No se pudo completar la suscripción')
    } finally {
      setSubscribing(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-300">
        <Check className="w-4 h-4 flex-shrink-0" />
        <span>¡Te suscribiste a <strong>{plan.name}</strong>! Ya puedes usar un corte en tu próxima cita.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{plan.name}</p>
          <span className="text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 rounded-full font-medium">${plan.price?.toLocaleString()}/mes</span>
          <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
            <Repeat2 className="w-3 h-3" />{plan.cutsPerPeriod} cortes
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
