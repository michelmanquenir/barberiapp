import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ── Comunas de Chile ──────────────────────────────────────────────────────────
const CHILEAN_COMMUNES = [
  'Santiago', 'Las Condes', 'Providencia', 'Ñuñoa', 'La Florida', 'Maipú',
  'Pudahuel', 'Puente Alto', 'Quilicura', 'San Bernardo', 'Peñalolén', 'Macul',
  'La Granja', 'El Bosque', 'La Pintana', 'Cerro Navia', 'Lo Espejo', 'Lo Prado',
  'Lo Barnechea', 'Vitacura', 'Conchalí', 'Recoleta', 'Independencia',
  'Estación Central', 'Quinta Normal', 'Renca', 'Huechuraba', 'Colina', 'Lampa',
  'Buin', 'Paine', 'San José de Maipo', 'Talagante', 'Melipilla',
  'Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana',
  'Concepción', 'Talcahuano', 'San Pedro de la Paz',
  'Antofagasta', 'La Serena', 'Coquimbo', 'Temuco', 'Puerto Montt', 'Iquique', 'Arica',
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ text = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ event, assignment, commune, onClose, onSuccess }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [originCommune, setOriginCommune] = useState(commune || '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!user) {
      navigate('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await api.bookPassengerSeat({
        assignmentId: assignment.id,
        clientCommune: originCommune.trim() || null,
        notes: notes.trim() || null,
      })
      onSuccess(result)
    } catch (err) {
      setError(err.message || 'Error al realizar la reserva')
    } finally {
      setSaving(false)
    }
  }

  const available = assignment.availableSeats ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md">
        {/* Handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 pt-4 pb-5 sm:pt-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Confirmar reserva</h3>
          <p className="text-sm text-gray-500 mb-4">{event.title} · {formatDate(event.eventDate)}</p>

          {/* Vehicle info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
            {assignment.vehicle?.imageUrl
              ? <img src={assignment.vehicle.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              : <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">🚌</div>
            }
            <div>
              <p className="font-semibold text-gray-800 text-sm">{assignment.vehicle?.brand} {assignment.vehicle?.model} {assignment.vehicle?.year && `(${assignment.vehicle.year})`}</p>
              <p className="text-xs text-gray-500">Conductor: {assignment.driver?.name ?? 'Por confirmar'}</p>
              <p className="text-xs text-blue-600 font-medium">{available} asientos disponibles</p>
            </div>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu comuna de origen</label>
              <input
                type="text"
                list="communes-booking"
                value={originCommune}
                onChange={e => setOriginCommune(e.target.value)}
                placeholder="Selecciona o escribe tu comuna"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="communes-booking">
                {CHILEAN_COMMUNES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Punto de encuentro, necesidades especiales..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirmar reserva
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Success overlay ───────────────────────────────────────────────────────────
function SuccessScreen({ booking, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">¡Reserva confirmada!</h3>
        <p className="text-gray-500 text-sm mb-4">Tu asiento ha sido reservado exitosamente.</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-0.5">Código de reserva</p>
          <p className="text-2xl font-bold text-blue-700 font-mono">#{booking.id}</p>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition">
          Entendido
        </button>
      </div>
    </div>
  )
}

// ── Vehicle Card ──────────────────────────────────────────────────────────────
function VehicleCard({ assignment, onBook }) {
  const capacity = assignment.vehicle?.passengerCapacity ?? 0
  const booked   = assignment.bookedSeats ?? 0
  const available = assignment.availableSeats ?? Math.max(0, capacity - booked)
  const isFull = available <= 0

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-shadow hover:shadow-md ${isFull ? 'opacity-60' : ''}`}>
      {/* Vehicle image */}
      {assignment.vehicle?.imageUrl ? (
        <img src={assignment.vehicle.imageUrl} alt={`${assignment.vehicle.brand} ${assignment.vehicle.model}`} className="w-full h-36 object-cover rounded-t-2xl" />
      ) : (
        <div className="w-full h-36 bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-2xl flex items-center justify-center text-5xl">🚌</div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-bold text-gray-900">{assignment.vehicle?.brand} {assignment.vehicle?.model}</p>
            {assignment.vehicle?.year && <p className="text-xs text-gray-400">{assignment.vehicle.year}</p>}
          </div>
          {assignment.vehicle?.commune && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex-shrink-0">
              {assignment.vehicle.commune}
            </span>
          )}
        </div>

        {assignment.driver?.name && (
          <p className="text-xs text-gray-500 mb-3">Conductor: <span className="font-medium text-gray-700">{assignment.driver.name}</span></p>
        )}

        {/* Seats progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Asientos disponibles</span>
            <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
              {available}/{capacity}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-green-400'}`}
              style={{ width: `${Math.min(100, (booked / (capacity || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {isFull ? (
          <span className="block w-full text-center py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium">Sin cupos</span>
        ) : (
          <button onClick={() => onBook(assignment)} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
            Reservar
          </button>
        )}
      </div>
    </div>
  )
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventCard({ event, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md overflow-hidden ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      {event.bannerImageUrl && (
        <img src={event.bannerImageUrl} alt={event.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-900 text-base">{event.title}</h3>
            {event.eventCode && (
              <span className="text-xs font-mono text-gray-400">{event.eventCode}</span>
            )}
          </div>
          {selected && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex-shrink-0">Seleccionado</span>}
        </div>
        {event.address && (
          <p className="text-sm text-gray-500 mt-2 flex items-start gap-1.5">
            <span className="flex-shrink-0 mt-0.5">📍</span>{event.address}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
          <span>📅</span>{formatDate(event.eventDate)}
        </p>
      </div>
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

function PublicTransport() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [errorEvents, setErrorEvents] = useState(null)

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  const [selectedCommune, setSelectedCommune] = useState('')
  const [bookingTarget, setBookingTarget] = useState(null)  // assignment to book
  const [successBooking, setSuccessBooking] = useState(null)

  // Load shop + events
  useEffect(() => {
    async function load() {
      setLoadingEvents(true)
      setErrorEvents(null)
      try {
        const [shopData, eventsData] = await Promise.all([
          api.getShopBySlug(slug),
          api.getPublicTransportEvents(slug),
        ])
        setShop(shopData)
        setEvents(eventsData || [])
      } catch (err) {
        setErrorEvents(err.message || 'Error al cargar el contenido')
      } finally {
        setLoadingEvents(false)
      }
    }
    load()
  }, [slug])

  // Load assignments when event selected
  const handleSelectEvent = useCallback(async (event) => {
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null)
      setAssignments([])
      return
    }
    setSelectedEvent(event)
    setAssignments([])
    setLoadingAssignments(true)
    try {
      const data = await api.getPublicEventAssignments(event.id)
      setAssignments(data || [])
    } catch {
      setAssignments([])
    } finally {
      setLoadingAssignments(false)
    }
  }, [selectedEvent])

  // Sort assignments: exact commune match first
  const sortedAssignments = [...assignments].sort((a, b) => {
    const aCommune = (a.vehicle?.commune || '').toLowerCase()
    const bCommune = (b.vehicle?.commune || '').toLowerCase()
    const sel = selectedCommune.toLowerCase()
    const aMatch = sel && aCommune === sel
    const bMatch = sel && bCommune === sel
    if (aMatch && !bMatch) return -1
    if (!aMatch && bMatch) return 1
    return aCommune.localeCompare(bCommune)
  })

  const handleBook = (assignment) => {
    if (!user) {
      navigate('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
      return
    }
    setBookingTarget(assignment)
  }

  const handleBookingSuccess = (booking) => {
    setBookingTarget(null)
    setSuccessBooking(booking)
    // Refresh assignments to update seat count
    if (selectedEvent) {
      api.getPublicEventAssignments(selectedEvent.id).then(data => {
        setAssignments(data || [])
      }).catch(() => {})
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500">
              ←
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">
                {shop?.name ?? slug}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Transporte</span>
            </div>
          </div>
          {user && (
            <button onClick={() => navigate('/appointments')} className="text-sm text-blue-600 font-medium hover:underline">
              Mis reservas
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">

        {loadingEvents && <Spinner text="Cargando eventos..." />}

        {errorEvents && !loadingEvents && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm text-center">
            {errorEvents}
          </div>
        )}

        {!loadingEvents && !errorEvents && events.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🚌</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">Sin eventos disponibles</h2>
            <p className="text-sm text-gray-400">No hay eventos de transporte publicados por este negocio.</p>
          </div>
        )}

        {!loadingEvents && events.length > 0 && (
          <>
            {/* Events list */}
            <section className="mb-6">
              <h2 className="text-base font-semibold text-gray-700 mb-3">Próximos eventos</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map(ev => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    selected={selectedEvent?.id === ev.id}
                    onClick={() => handleSelectEvent(ev)}
                  />
                ))}
              </div>
            </section>

            {/* Vehicles section */}
            {selectedEvent && (
              <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="text-base font-semibold text-gray-700">Vehículos disponibles · <span className="text-blue-600">{selectedEvent.title}</span></h2>
                </div>

                {/* Commune filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Filtrar por comuna de salida</label>
                  <select
                    value={selectedCommune}
                    onChange={e => setSelectedCommune(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas las comunas</option>
                    {CHILEAN_COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {loadingAssignments ? (
                  <Spinner text="Cargando vehículos..." />
                ) : sortedAssignments.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
                    <div className="text-4xl mb-2">🚌</div>
                    <p className="text-gray-500 text-sm">No hay vehículos asignados a este evento</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sortedAssignments.map(a => (
                      <VehicleCard key={a.id} assignment={a} onBook={handleBook} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Booking Modal */}
      {bookingTarget && selectedEvent && (
        <BookingModal
          event={selectedEvent}
          assignment={bookingTarget}
          commune={selectedCommune}
          onClose={() => setBookingTarget(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Success screen */}
      {successBooking && (
        <SuccessScreen booking={successBooking} onClose={() => setSuccessBooking(null)} />
      )}
    </div>
  )
}

export default PublicTransport
