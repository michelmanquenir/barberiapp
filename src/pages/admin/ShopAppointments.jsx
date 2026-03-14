import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  UserX,
  Bell,
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'
import { useAuth } from '../../context/AuthContext'
import StarRating from '../../components/StarRating'
import ReviewModal from '../../components/ReviewModal'
import AdminNavbar from '../../components/AdminNavbar'

// ─── helpers ──────────────────────────────────────────────────────────────────

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
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(timeStr) {
  if (!timeStr) return '—'
  return timeStr.substring(0, 5)
}

const FILTERS = [
  { key: 'all',       label: 'Todas' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'no_show',   label: 'No asistieron' },
  { key: 'cancelled', label: 'Canceladas' },
]

// ─── Componente principal ─────────────────────────────────────────────────────

function ShopAppointments() {
  const { shopId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState(null)  // ID de cita en proceso
  const [shopName, setShopName] = useState('')

  // Reseñas
  const [reviewsMap, setReviewsMap] = useState({})
  const [reviewModal, setReviewModal] = useState(null) // { aptId, clientName, targetUserId }

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, shops] = await Promise.all([
        api.getShopAppointments(shopId),
        api.getMyShops(),
      ])
      setAppointments(data || [])
      const found = shops.find((s) => s.id === shopId)
      if (found) setShopName(found.name)
    } catch {
      setError('No se pudieron cargar las citas')
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // ── Acciones ────────────────────────────────────────────────────────────────

  const handleConfirm = async (appointmentId) => {
    setActionId(appointmentId)
    try {
      const updated = await api.confirmAppointment(appointmentId)
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      toast.success('Cita confirmada')
    } catch {
      toast.error('No se pudo confirmar la cita')
    } finally {
      setActionId(null)
    }
  }

  const handleComplete = async (appointmentId) => {
    setActionId(appointmentId)
    try {
      const updated = await api.completeAppointment(appointmentId)
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      toast.success('Cita marcada como completada')
      api.getAppointmentReviews(appointmentId)
        .then(r => setReviewsMap(prev => ({ ...prev, [appointmentId]: r || [] })))
        .catch(() => {})
    } catch {
      toast.error('No se pudo marcar la cita como completada')
    } finally {
      setActionId(null)
    }
  }

  const handleCancelByBarber = async (appointmentId) => {
    const ok = await confirm(
      'Cancelar cita',
      'El cliente verá esta cita como cancelada. ¿Deseas continuar?',
      { confirmText: 'Sí, cancelar', icon: 'warning' }
    )
    if (!ok) return
    setActionId(appointmentId)
    try {
      const updated = await api.cancelByBarber(appointmentId)
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      toast.success('Cita cancelada')
    } catch {
      toast.error('No se pudo cancelar la cita')
    } finally {
      setActionId(null)
    }
  }

  const handleNoShow = async (appointmentId, paymentMethod) => {
    const payText = paymentMethod === 'cash'
      ? 'El pago era en efectivo — quedará registrado como deuda pendiente.'
      : 'El pago ya había sido realizado.'
    const ok = await confirm(
      '¿El cliente no se presentó?',
      payText,
      { confirmText: 'Sí, registrar no-show', icon: 'warning' }
    )
    if (!ok) return
    setActionId(appointmentId)
    try {
      const updated = await api.noShowAppointment(appointmentId)
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      toast.warning('Cita registrada como no-show')
    } catch {
      toast.error('No se pudo registrar el no-show')
    } finally {
      setActionId(null)
    }
  }

  // Cargar reseñas de citas completadas al montar
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

  // ── Filtrado y estadísticas ────────────────────────────────────────────────

  const filtered = appointments.filter((a) =>
    filter === 'all' ? true : a.status === filter
  )

  const pendingCount = appointments.filter((a) => a.status === 'pending').length

  const stats = {
    pending:   appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    noShow:    appointments.filter((a) => a.status === 'no_show').length,
    revenue: appointments
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + (a.totalPrice ?? 0), 0),
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Volver */}
          <button
            onClick={() => navigate(`/admin/shops/${shopId}`)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al negocio
          </button>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Citas del negocio</h1>
              {shopName && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{shopName}</p>}
            </div>
            <button
              onClick={loadAppointments}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {/* Alerta de pendientes */}
          {pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5">
              <Bell className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Tienes <strong>{pendingCount}</strong> cita{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de confirmar.
              </p>
              <button
                onClick={() => setFilter('pending')}
                className="ml-auto text-xs px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition whitespace-nowrap"
              >
                Ver pendientes
              </button>
            </div>
          )}

          {/* Estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <StatCard label="Pendientes"    value={stats.pending}   color="amber" />
            <StatCard label="Confirmadas"   value={stats.confirmed} color="blue" />
            <StatCard label="Completadas"   value={stats.completed} color="green" />
            <StatCard label="No asistieron" value={stats.noShow}    color="orange" />
            <StatCard label="Ingresos"      value={`$${stats.revenue.toLocaleString()}`} color="black" />
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const count = f.key === 'all'
                ? appointments.length
                : appointments.filter((a) => a.status === f.key).length
              const isPending = f.key === 'pending' && pendingCount > 0
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    filter === f.key
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {f.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === f.key ? 'bg-white/20' : isPending ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-800'
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

          {/* Lista de citas */}
          {!loading && !error && (
            <>
              {filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {filter === 'all'
                      ? 'Este negocio aún no tiene citas agendadas'
                      : `No hay citas con estado "${FILTERS.find(f => f.key === filter)?.label}"`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      appointment={apt}
                      onConfirm={handleConfirm}
                      onComplete={handleComplete}
                      onNoShow={handleNoShow}
                      onCancel={handleCancelByBarber}
                      processing={actionId === apt.id}
                      reviews={reviewsMap[apt.id] ?? null}
                      onRateClient={() => setReviewModal({
                        aptId: apt.id,
                        clientName: apt.clientName ?? apt.user?.fullName ?? 'Cliente',
                        targetUserId: apt.user?.id ?? null,
                      })}
                    />
                  ))}
                </div>
              )}
            </>
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

function AppointmentCard({ appointment: apt, onConfirm, onComplete, onNoShow, onCancel, processing, reviews, onRateClient }) {
  const status = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.confirmed

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border p-5 hover:shadow-sm transition-shadow ${
      apt.status === 'pending'
        ? 'border-amber-300 dark:border-amber-800'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          {/* Fila superior: servicio + badge */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-base">
              {apt.service?.name ?? 'Servicio desconocido'}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badge}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${status.dot} mr-1`} />
              {status.label}
            </span>
          </div>

          {/* Grid de detalles */}
          <div className="grid sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm text-gray-600 dark:text-gray-300">
            {/* Cliente */}
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">
                <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">Cliente:</span>
                {apt.clientName ?? apt.user?.fullName ?? 'Cliente desconocido'}
                {apt.bookedByBarber && (
                  <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">walk-in</span>
                )}
              </span>
            </div>

            {/* Barbero */}
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">
                <span className="text-gray-400 dark:text-gray-500 text-xs mr-1">Barbero:</span>
                {apt.barber?.name ?? '—'}
              </span>
            </div>

            {/* Fecha */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>{formatDate(apt.date)}</span>
            </div>

            {/* Hora */}
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>{formatTime(apt.time)}</span>
            </div>

            {/* Ubicación */}
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>{apt.location === 'home' ? 'A domicilio' : 'En la barbería'}</span>
            </div>

            {/* Pago */}
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span>
                {apt.paymentMethod === 'cash' ? 'Efectivo'
                  : apt.paymentMethod === 'subscription' ? 'Suscripción'
                  : 'Transferencia'}
              </span>
            </div>
          </div>

          {/* Aviso no-show para pago efectivo */}
          {apt.status === 'no_show' && apt.paymentMethod === 'cash' && (
            <div className="mt-3 flex items-center gap-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                El cliente no llegó. Como el pago era en efectivo, quedó una deuda de <strong>${apt.totalPrice?.toLocaleString()}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Precio + acciones */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Total</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
              ${apt.totalPrice?.toLocaleString() ?? '—'}
            </p>
          </div>

          {/* Pendiente → Confirmar + Cancelar */}
          {apt.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onConfirm(apt.id)}
                disabled={processing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:opacity-80 transition disabled:opacity-50 whitespace-nowrap"
              >
                {processing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Procesando...</>
                ) : (
                  <><CheckCircle className="w-3 h-3" />Confirmar cita</>
                )}
              </button>
              <button
                onClick={() => onCancel(apt.id)}
                disabled={processing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50 whitespace-nowrap"
              >
                <XCircle className="w-3 h-3" />
                Cancelar cita
              </button>
            </div>
          )}

          {/* Confirmada → Completar / No llegó / Cancelar */}
          {apt.status === 'confirmed' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onComplete(apt.id)}
                disabled={processing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
              >
                {processing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Guardando...</>
                ) : (
                  <><CheckCircle className="w-3 h-3" />Llegó · Completar</>
                )}
              </button>
              <button
                onClick={() => onNoShow(apt.id, apt.paymentMethod)}
                disabled={processing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-orange-400 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950 transition disabled:opacity-50 whitespace-nowrap"
              >
                <UserX className="w-3 h-3" />
                No llegó
              </button>
              <button
                onClick={() => onCancel(apt.id)}
                disabled={processing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50 whitespace-nowrap"
              >
                <XCircle className="w-3 h-3" />
                Cancelar cita
              </button>
            </div>
          )}

          {/* Calificar cliente (solo citas completadas con usuario registrado) */}
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
              <XCircle className="w-3.5 h-3.5" />
              Cancelada
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta de stat ──────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  const colors = {
    gray:   'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
    amber:  'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    blue:   'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400',
    black:  'bg-gray-900 border-gray-900 text-white',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default ShopAppointments
