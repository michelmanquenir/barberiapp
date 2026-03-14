import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Store,
  AlertCircle,
  Star,
  Search,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast } from '../../lib/swal'
import { useAuth } from '../../context/AuthContext'
import StarRating from '../../components/StarRating'
import ReviewModal from '../../components/ReviewModal'
import AdminNavbar from '../../components/AdminNavbar'

// ─── helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmada',
    badge: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  completed: {
    label: 'Completada',
    badge: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelada',
    badge: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    dot: 'bg-red-400',
  },
  no_show: {
    label: 'No se presentó',
    badge: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-400',
  },
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(timeStr) {
  if (!timeStr) return '—'
  return timeStr.substring(0, 5)
}

const STATUS_FILTERS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'no_show',   label: 'No asistieron' },
  { key: 'cancelled', label: 'Canceladas' },
]

const DATE_FILTERS = [
  { key: 'all',   label: 'Todas las fechas' },
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

// Paleta de colores por negocio (hasta 8 negocios con colores distintos)
const SHOP_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-yellow-100 text-yellow-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-lime-100 text-lime-700',
]

function getDateRange(key) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (key === 'today') {
    const end = new Date(today); end.setHours(23, 59, 59, 999)
    return [today, end]
  }
  if (key === 'week') {
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())       // domingo
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    return [start, end]
  }
  if (key === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    return [start, end]
  }
  return null
}

function matchesDate(apt, dateKey) {
  if (dateKey === 'all' || !apt.date) return true
  const range = getDateRange(dateKey)
  if (!range) return true
  const d = new Date(apt.date + 'T00:00:00')
  return d >= range[0] && d <= range[1]
}

function normalize(s) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ─── Componente principal ─────────────────────────────────────────────────────

function AllShopsAppointments() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [shops, setShops] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtros
  const [shopFilter,   setShopFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter,   setDateFilter]   = useState('all')
  const [search,       setSearch]       = useState('')

  // Lazy loading con IntersectionObserver
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)   // elemento invisible al final de la lista

  const [completingId, setCompletingId] = useState(null)

  // Reseñas
  const [reviewsMap,   setReviewsMap]   = useState({})
  const [reviewModal,  setReviewModal]  = useState(null)

  // ── Carga ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setVisibleCount(PAGE_SIZE)
    try {
      const shopsData = await api.getMyShops()
      setShops(shopsData)

      const results = await Promise.all(
        shopsData.map((shop) =>
          api.getShopAppointments(shop.id)
            .then((apts) =>
              (apts || []).map((apt) => ({
                ...apt,
                _shopId: shop.id,
                _shopName: shop.name,
              }))
            )
            .catch(() => [])
        )
      )

      const all = results.flat().sort((a, b) => {
        const dc = (b.date ?? '').localeCompare(a.date ?? '')
        return dc !== 0 ? dc : (b.time ?? '').localeCompare(a.time ?? '')
      })

      setAppointments(all)
    } catch {
      setError('No se pudieron cargar las citas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Reset visibleCount cuando cambian los filtros
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [shopFilter, statusFilter, dateFilter, search])

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = normalize(search)
    return appointments.filter((a) => {
      if (shopFilter   !== 'all' && a._shopId  !== shopFilter)   return false
      if (statusFilter !== 'all' && a.status   !== statusFilter)  return false
      if (!matchesDate(a, dateFilter))                            return false
      if (q) {
        const client  = normalize(a.clientName ?? a.user?.fullName)
        const barber  = normalize(a.barber?.name)
        const service = normalize(a.service?.name)
        const shop    = normalize(a._shopName)
        if (!client.includes(q) && !barber.includes(q) && !service.includes(q) && !shop.includes(q)) return false
      }
      return true
    })
  }, [appointments, shopFilter, statusFilter, dateFilter, search])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // IntersectionObserver: carga el siguiente bloque al ver el sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [filtered.length])  // reconecta cuando cambia el conjunto filtrado

  // ── Estadísticas ──────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:     filtered.length,
    confirmed: filtered.filter((a) => a.status === 'confirmed').length,
    completed: filtered.filter((a) => a.status === 'completed').length,
    revenue:   filtered
      .filter((a) => a.status !== 'cancelled')
      .reduce((s, a) => s + (a.totalPrice ?? 0), 0),
  }), [filtered])

  const shopColorMap = useMemo(
    () => Object.fromEntries(shops.map((s, i) => [s.id, SHOP_COLORS[i % SHOP_COLORS.length]])),
    [shops]
  )

  // ── Marcar completada ─────────────────────────────────────────────────────

  const handleComplete = async (id) => {
    setCompletingId(id)
    try {
      const updated = await api.completeAppointment(id)
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...updated, _shopId: a._shopId, _shopName: a._shopName } : a))
      )
      toast.success('Cita marcada como completada')
      api.getAppointmentReviews(id)
        .then(r => setReviewsMap(prev => ({ ...prev, [id]: r || [] })))
        .catch(() => {})
    } catch {
      toast.error('No se pudo marcar la cita como completada')
    } finally {
      setCompletingId(null)
    }
  }

  useEffect(() => {
    const completed = appointments.filter(a => a.status === 'completed')
    completed.forEach(apt => {
      if (reviewsMap[apt.id] !== undefined) return
      api.getAppointmentReviews(apt.id)
        .then(r => setReviewsMap(prev => ({ ...prev, [apt.id]: r || [] })))
        .catch(() => setReviewsMap(prev => ({ ...prev, [apt.id]: [] })))
    })
  }, [appointments]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReviewSubmit = useCallback(async (rating, comment) => {
    if (!reviewModal) return
    await api.createReview({
      appointmentId: reviewModal.aptId,
      reviewType: 'BARBER_TO_CLIENT',
      targetUserId: reviewModal.targetUserId,
      rating,
      comment,
    })
    const updated = await api.getAppointmentReviews(reviewModal.aptId)
    setReviewsMap(prev => ({ ...prev, [reviewModal.aptId]: updated || [] }))
  }, [reviewModal])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Volver */}
          <button
            onClick={() => navigate('/admin/shops')}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Mis negocios
          </button>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Todas las citas</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {shops.length} {shops.length === 1 ? 'negocio' : 'negocios'} · {appointments.length} citas en total
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Citas visibles"  value={stats.total}     color="gray"  />
            <StatCard label="Confirmadas"     value={stats.confirmed} color="blue"  />
            <StatCard label="Completadas"     value={stats.completed} color="green" />
            <StatCard label="Ingresos"        value={`$${stats.revenue.toLocaleString()}`} color="black" />
          </div>

          {/* ── FILTROS ───────────────────────────────────────────────────── */}

          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, barbero, servicio o negocio..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro por fecha */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setDateFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  dateFilter === f.key
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtro por negocio */}
          {shops.length > 1 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-wrap">
              <button
                onClick={() => setShopFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  shopFilter === 'all'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Todos los negocios
              </button>
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => setShopFilter(shop.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    shopFilter === shop.id
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {shop.name}
                </button>
              ))}
            </div>
          )}

          {/* Filtro por estado */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => {
              const count = f.key === 'all'
                ? filtered.length
                : filtered.filter(a => a.status === f.key).length
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    statusFilter === f.key
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {f.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === f.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Carga / Error */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Lista con lazy loading */}
          {!loading && !error && (
            filtered.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {appointments.length === 0
                    ? 'Tus negocios aún no tienen citas agendadas'
                    : 'No hay citas con los filtros seleccionados'}
                </p>
                {(search || dateFilter !== 'all' || shopFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setSearch(''); setDateFilter('all'); setShopFilter('all'); setStatusFilter('all') }}
                    className="mt-3 text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length} citas
                </p>

                <div className="space-y-3">
                  {visible.map((apt) => (
                    <AppointmentCard
                      key={`${apt._shopId}-${apt.id}`}
                      appointment={apt}
                      shopColor={shopColorMap[apt._shopId]}
                      showShopBadge={shopFilter === 'all' && shops.length > 1}
                      onComplete={handleComplete}
                      completing={completingId === apt.id}
                      onGoToShop={() => navigate(`/admin/shops/${apt._shopId}/appointments`)}
                      reviews={reviewsMap[apt.id] ?? null}
                      onRateClient={() => setReviewModal({
                        aptId: apt.id,
                        clientName: apt.clientName ?? apt.user?.fullName ?? 'Cliente',
                        targetUserId: apt.user?.id ?? null,
                      })}
                    />
                  ))}
                </div>

                {/* Sentinel para infinite scroll */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}
              </>
            )
          )}
        </div>
      </main>

      {/* Modal de reseña barbero → cliente */}
      <ReviewModal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        onSubmit={handleReviewSubmit}
        targetName={reviewModal?.clientName ?? 'Cliente'}
        targetType="client"
      />
    </div>
  )
}

// ─── Tarjeta de cita ──────────────────────────────────────────────────────────

function AppointmentCard({ appointment: apt, shopColor, showShopBadge, onComplete, completing, onGoToShop, reviews, onRateClient }) {
  const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.confirmed

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Fila superior */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-base">
              {apt.service?.name ?? 'Servicio desconocido'}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />
              {status.label}
            </span>
            {showShopBadge && (
              <button
                onClick={onGoToShop}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${shopColor} hover:opacity-80 transition flex items-center gap-1`}
              >
                <Store className="w-3 h-3" />
                {apt._shopName}
              </button>
            )}
          </div>

          {/* Grid de detalles */}
          <div className="grid sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">
                <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">Cliente:</span>
                {apt.clientName ?? apt.user?.fullName ?? 'Desconocido'}
                {apt.bookedByBarber && (
                  <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">walk-in</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">
                <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">Barbero:</span>
                {apt.barber?.name ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>{formatDate(apt.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>{formatTime(apt.time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>{apt.location === 'home' ? 'A domicilio' : 'En la barbería'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>
                {apt.paymentMethod === 'cash' ? 'Efectivo'
                  : apt.paymentMethod === 'subscription' ? 'Suscripción'
                  : 'Transferencia'}
              </span>
            </div>
          </div>
        </div>

        {/* Precio + acciones */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
              ${apt.totalPrice?.toLocaleString() ?? '—'}
            </p>
          </div>
          {apt.status === 'confirmed' && (
            <button
              onClick={() => onComplete(apt.id)}
              disabled={completing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
            >
              {completing
                ? <><Loader2 className="w-3 h-3 animate-spin" />Guardando...</>
                : <><CheckCircle className="w-3 h-3" />Completada</>}
            </button>
          )}

          {apt.status === 'completed' && apt.user?.id && (() => {
            const barberToClient = reviews?.find(r => r.reviewType === 'BARBER_TO_CLIENT')
            if (barberToClient) {
              return (
                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950 rounded-lg px-2 py-1 border border-yellow-100 dark:border-yellow-800">
                  <StarRating value={barberToClient.rating} size="sm" />
                </div>
              )
            }
            return (
              <button
                onClick={onRateClient}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-950 transition whitespace-nowrap"
              >
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                Calificar cliente
              </button>
            )
          })()}

          {apt.status === 'cancelled' && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <XCircle className="w-3.5 h-3.5" />Cancelada
            </span>
          )}
          {apt.status === 'no_show' && (
            <span className="flex items-center gap-1 text-xs text-orange-500">
              <XCircle className="w-3.5 h-3.5" />No se presentó
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  const colors = {
    gray:  'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
    blue:  'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    black: 'bg-gray-900 border-gray-900 text-white',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default AllShopsAppointments
