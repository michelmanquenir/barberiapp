import { Calendar, Clock, User, MapPin, CreditCard, Star, AlertCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { toast, confirm } from '../lib/swal'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import ReviewModal from '../components/ReviewModal'

// ─── Estado de la cita (cliente) ──────────────────────────────────────────────

const STATUS_LABELS = {
  pending:   { text: 'Esperando confirmación', cls: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  confirmed: { text: 'Confirmada',             cls: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400' },
  completed: { text: 'Completada',             cls: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' },
  cancelled: { text: 'Cancelada',              cls: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' },
  no_show:   { text: 'No asististe',           cls: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-400' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

function Appointments() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('upcoming')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  // reviewsMap: { appointmentId: ReviewResponse[] }
  const [reviewsMap, setReviewsMap] = useState({})

  // Modal
  const [modal, setModal] = useState(null) // { aptId, barberId, shopId, barberName, shopName, type }

  useEffect(() => {
    api.getAppointments(user.userId)
      .then(data => setAppointments(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.userId])

  // Cargar reseñas para citas completadas cuando se cambia al tab
  useEffect(() => {
    if (filter !== 'completed') return
    const completed = appointments.filter(a => a.status === 'completed')
    if (completed.length === 0) return
    completed.forEach(apt => {
      if (reviewsMap[apt.id] !== undefined) return // ya cargada
      api.getAppointmentReviews(apt.id)
        .then(reviews => setReviewsMap(prev => ({ ...prev, [apt.id]: reviews || [] })))
        .catch(() => setReviewsMap(prev => ({ ...prev, [apt.id]: [] })))
    })
  }, [filter, appointments]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async (id) => {
    const ok = await confirm(
      'Cancelar cita',
      '¿Seguro que deseas cancelar esta cita?',
      { confirmText: 'Sí, cancelar', icon: 'warning' }
    )
    if (!ok) return
    try {
      const updated = await api.cancelAppointment(id, user.userId)
      setAppointments(prev => prev.map(apt => apt.id === id ? updated : apt))
      toast.success('Cita cancelada')
    } catch (err) {
      console.error('Error al cancelar la cita:', err)
      toast.error('No se pudo cancelar la cita')
    }
  }

  const openModal = (apt, type) => {
    setModal({
      aptId: apt.id,
      barberId: apt.barber?.id,
      shopId: apt.barber?.shopId,
      barberName: apt.barber?.name ?? 'Barbero',
      shopName: apt.shopName ?? apt.barber?.shopName ?? 'Barbería',
      type,
    })
  }

  const handleReviewSubmit = useCallback(async (rating, comment) => {
    if (!modal) return
    const req = {
      appointmentId: modal.aptId,
      rating,
      comment,
    }
    if (modal.type === 'CLIENT_TO_BARBER') {
      req.reviewType = 'CLIENT_TO_BARBER'
      req.targetBarberId = modal.barberId
    } else {
      req.reviewType = 'CLIENT_TO_SHOP'
    }
    await api.createReview(req)
    const updated = await api.getAppointmentReviews(modal.aptId)
    setReviewsMap(prev => ({ ...prev, [modal.aptId]: updated || [] }))
  }, [modal])

  // Filtrado:
  // "upcoming"  → pending + confirmed
  // "completed" → completed
  // "history"   → cancelled + no_show
  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'upcoming')  return apt.status === 'pending' || apt.status === 'confirmed'
    if (filter === 'completed') return apt.status === 'completed'
    if (filter === 'history')   return apt.status === 'cancelled' || apt.status === 'no_show'
    return true
  })

  const pendingCount = appointments.filter(a => a.status === 'pending').length

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Cargando citas...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Mis Citas</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingCount} cita{pendingCount !== 1 ? 's' : ''} esperando confirmación del negocio
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`relative px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'upcoming'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            Próximas
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'completed'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            Completadas
          </button>
          <button
            onClick={() => setFilter('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'history'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            Historial
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAppointments.map((appointment) => {
          const aptReviews = reviewsMap[appointment.id] ?? null
          const clientToBarber = aptReviews?.find(r => r.reviewType === 'CLIENT_TO_BARBER')
          const clientToShop = aptReviews?.find(r => r.reviewType === 'CLIENT_TO_SHOP')
          const barberToClient = aptReviews?.find(r => r.reviewType === 'BARBER_TO_CLIENT')
          const loadingReviews = filter === 'completed' && aptReviews === null
          const statusInfo = STATUS_LABELS[appointment.status] ?? STATUS_LABELS.confirmed

          return (
            <div key={appointment.id} className={`card hover:shadow-md transition-shadow ${
              appointment.status === 'pending' ? 'border-amber-300 dark:border-amber-700' : ''
            }`}>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50">
                        {appointment.service?.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                        <User className="h-4 w-4" />
                        {appointment.barber?.name}
                        {appointment.barber?.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {appointment.barber.rating.toFixed(1)}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.cls}`}>
                      {statusInfo.text}
                    </span>
                  </div>

                  {/* Aviso si está pendiente */}
                  {appointment.status === 'pending' && (
                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Tu cita está pendiente de confirmación por parte del negocio. Te avisarán cuando sea confirmada.
                        Puedes cancelarla si lo necesitas.
                      </p>
                    </div>
                  )}

                  {/* Aviso no-show */}
                  {appointment.status === 'no_show' && (
                    <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700 dark:text-orange-300">
                        El negocio registró que no asististe a esta cita.
                        {appointment.paymentMethod === 'cash' && (
                          <> Si tenías una deuda pendiente, contacta al negocio para resolverla.</>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {appointment.time?.substring(0, 5)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {appointment.location === 'home' ? 'A Domicilio' : 'En la Barbería'}
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {appointment.paymentMethod === 'cash' ? 'Efectivo'
                        : appointment.paymentMethod === 'subscription' ? 'Suscripción'
                        : 'Transferencia'}
                    </div>
                  </div>

                  {/* ── Sección de reseñas (solo tab Completadas) ── */}
                  {filter === 'completed' && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2.5">
                      {loadingReviews ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Cargando reseñas...</p>
                      ) : (
                        <>
                          {/* Calificación del barbero por el cliente */}
                          {clientToBarber ? (
                            <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg px-3 py-2">
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tu reseña del profesional</p>
                                <StarRating value={clientToBarber.rating} size="sm" />
                                {clientToBarber.comment && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{clientToBarber.comment}"</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openModal(appointment, 'CLIENT_TO_BARBER')}
                              className="flex items-center gap-1.5 text-xs text-yellow-600 hover:text-yellow-700 font-medium transition border border-yellow-200 hover:border-yellow-400 rounded-lg px-3 py-1.5"
                            >
                              <Star className="w-3.5 h-3.5 fill-yellow-400" />
                              Calificar al profesional
                            </button>
                          )}

                          {/* Calificación de la barbería por el cliente */}
                          {clientToShop ? (
                            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 rounded-lg px-3 py-2">
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tu reseña del negocio</p>
                                <StarRating value={clientToShop.rating} size="sm" />
                                {clientToShop.comment && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{clientToShop.comment}"</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openModal(appointment, 'CLIENT_TO_SHOP')}
                              className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition border border-blue-200 dark:border-blue-800 hover:border-blue-400 rounded-lg px-3 py-1.5"
                            >
                              <Star className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                              Calificar el negocio
                            </button>
                          )}

                          {/* Calificación del barbero SOBRE el cliente */}
                          {barberToClient && (
                            <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-950 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                              <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">El profesional te calificó</p>
                                <StarRating value={barberToClient.rating} size="sm" />
                                {barberToClient.comment && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">"{barberToClient.comment}"</p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="lg:border-l lg:border-gray-100 dark:lg:border-gray-800 lg:pl-6 flex flex-col justify-between">
                  <div className="text-right mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                      ${appointment.totalPrice?.toLocaleString()}
                    </p>
                  </div>

                  {/* Solo se puede cancelar si está pending o confirmed */}
                  {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancel(appointment.id)}
                      className="btn-secondary w-full"
                    >
                      Cancelar cita
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filteredAppointments.length === 0 && (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              {filter === 'upcoming'  ? 'No tienes citas próximas'  :
               filter === 'completed' ? 'No tienes citas completadas' :
                                        'No hay citas en el historial'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de reseña */}
      <ReviewModal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        onSubmit={handleReviewSubmit}
        targetName={modal?.type === 'CLIENT_TO_BARBER' ? modal?.barberName : modal?.shopName}
        targetType={modal?.type === 'CLIENT_TO_BARBER' ? 'barber' : 'shop'}
      />
    </div>
  )
}

export default Appointments
