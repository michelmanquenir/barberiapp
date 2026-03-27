import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Autocomplete } from '@react-google-maps/api'
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
  const d = new Date(iso)
  const day = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

// ── Haversine (igual que barbería a domicilio) ────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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

// ── Fare Calculator ───────────────────────────────────────────────────────────
function calculateFare(distanceKm, pricePerKm) {
  if (!distanceKm || !pricePerKm) return null
  return Math.ceil(distanceKm * pricePerKm)
}

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ event, assignment, onClose, onSuccess }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const autocompleteRef = useRef(null)

  const [destinationAddress, setDestinationAddress] = useState('')
  const [destLatLng, setDestLatLng]   = useState(null)  // { lat, lng } del destino
  const [originLatLng, setOriginLatLng] = useState(null) // { lat, lng } de la comuna origen
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [calcState, setCalcState] = useState('idle') // idle | loading | done | error

  const pricePerKm  = event?.pricePerKm ?? null
  const available   = assignment.availableSeats ?? 0
  const eventAddress = event?.address   // dirección completa del evento (origen del viaje)

  // Geocodificar la dirección del evento al abrir el modal (una sola vez)
  useEffect(() => {
    if (!eventAddress || !window.google?.maps) return
    setCalcState('loading')
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: eventAddress }, (results, status) => {
      if (status === 'OK' && results[0]?.geometry) {
        setOriginLatLng({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        })
      } else {
        setCalcState('error')
      }
    })
  }, [eventAddress])

  // Calcular distancia con haversine cuando ambos puntos estén listos
  useEffect(() => {
    if (originLatLng && destLatLng) {
      const km = haversineKm(originLatLng.lat, originLatLng.lng, destLatLng.lat, destLatLng.lng)
      setDistanceKm(km)
      setCalcState('done')
    }
  }, [originLatLng, destLatLng])

  const [distanceKm, setDistanceKm] = useState(null)
  const fare = calculateFare(distanceKm, pricePerKm)

  // Al seleccionar una sugerencia de Google
  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setDestinationAddress(place.formatted_address || place.name || '')
    setDestLatLng({ lat, lng })
    setCalcState(originLatLng ? 'loading' : 'idle')
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!user) {
      navigate('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
      return
    }
    if (!destinationAddress.trim()) {
      setError('Por favor ingresa tu dirección de destino')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await api.bookPassengerSeat({
        assignmentId: assignment.id,
        clientCommune: destinationAddress.trim(),
        notes: [
          eventAddress ? `Origen: ${eventAddress}` : '',
          destinationAddress.trim() ? `Destino: ${destinationAddress.trim()}` : '',
          distanceKm ? `Distancia: ${distanceKm.toFixed(1)} km` : '',
          fare ? `Tarifa estimada: ${formatCLP(fare)}` : '',
          notes.trim(),
        ].filter(Boolean).join(' | ') || null,
      })
      onSuccess(result)
    } catch (err) {
      setError(err.message || 'Error al realizar la reserva')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[95dvh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 pt-4 pb-6 sm:pt-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Reservar asiento</h3>
          <p className="text-sm text-gray-500 mb-4">{event.title} · {formatDate(event.eventDate)}</p>

          {/* Vehicle info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-5">
            {assignment.vehicle?.imageUrl
              ? <img src={assignment.vehicle.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              : <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center text-2xl flex-shrink-0">🚌</div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{assignment.vehicle?.brand} {assignment.vehicle?.model} {assignment.vehicle?.year && `(${assignment.vehicle.year})`}</p>
              <p className="text-xs text-gray-500">Conductor: <span className="font-medium">{assignment.driver?.name ?? 'Por confirmar'}</span></p>
              {assignment.vehicle?.commune && (
                <p className="text-xs text-indigo-600 font-medium">📍 Sale desde: {assignment.vehicle.commune}</p>
              )}
              <p className="text-xs text-green-600 font-medium">{available} asientos disponibles</p>
            </div>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">

            {/* ── Dirección de destino ── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                📍 Tu dirección de destino
              </label>
              <Autocomplete
                onLoad={ac => { autocompleteRef.current = ac }}
                onPlaceChanged={handlePlaceChanged}
                options={{ componentRestrictions: { country: 'cl' } }}
              >
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={e => {
                    setDestinationAddress(e.target.value)
                    if (!e.target.value) { setDestinationPlace(null); setDistanceM(null); setCalcState('idle') }
                  }}
                  placeholder="Ej: Av. Vicuña Mackenna 1234, Santiago"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </Autocomplete>
              <p className="text-xs text-gray-400 mt-1">Selecciona una sugerencia para calcular la tarifa automáticamente.</p>
            </div>

            {/* ── Resumen de tarifa ── */}
            {destLatLng && (
              <div className={`rounded-xl border p-4 transition-all ${
                calcState === 'done'    ? 'bg-blue-50 border-blue-200' :
                calcState === 'loading' ? 'bg-gray-50 border-gray-200' :
                calcState === 'error'   ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resumen de tarifa</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">🚌 Origen</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%]">{eventAddress ?? '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">📍 Destino</span>
                    <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{destinationAddress}</span>
                  </div>

                  {calcState === 'loading' && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 pt-1">
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Calculando distancia...
                    </div>
                  )}

                  {calcState === 'done' && distanceKm != null && (
                    <>
                      <div className="border-t border-blue-200 my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">📏 Distancia</span>
                        <span className="font-medium text-gray-800">{distanceKm.toFixed(1)} km</span>
                      </div>
                      {pricePerKm && fare ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">💲 Tarifa/km</span>
                            <span className="font-medium text-gray-800">{formatCLP(pricePerKm)}/km</span>
                          </div>
                          <div className="border-t border-blue-200 my-2" />
                          <div className="flex justify-between text-base font-bold">
                            <span className="text-blue-700">Total estimado</span>
                            <span className="text-blue-700">{formatCLP(fare)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">* Distancia en línea recta, tarifa referencial.</p>
                        </>
                      ) : (
                        <div className="text-sm text-amber-600 font-medium mt-1">
                          💬 Precio a convenir con el conductor
                        </div>
                      )}
                    </>
                  )}

                  {calcState === 'error' && (
                    <p className="text-sm text-red-500">No se pudo calcular la distancia. Puedes continuar de todas formas.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Notas ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
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
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {fare ? `Reservar · ${formatCLP(fare)}` : 'Confirmar reserva'}
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
function VehicleCard({ assignment, selectedCommune, onBook }) {
  const capacity  = assignment.vehicle?.passengerCapacity ?? 0
  const booked    = assignment.bookedSeats ?? 0
  const available = assignment.availableSeats ?? Math.max(0, capacity - booked)
  const isFull    = available <= 0
  const isMatch   = selectedCommune &&
    (assignment.vehicle?.commune || '').toLowerCase() === selectedCommune.toLowerCase()

  return (
    <div className={`bg-white rounded-2xl border transition-all hover:shadow-md overflow-hidden
      ${isFull ? 'opacity-60' : ''}
      ${isMatch ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm' : 'border-gray-200 shadow-sm'}
    `}>
      {/* Vehicle image */}
      {assignment.vehicle?.imageUrl ? (
        <div className="relative">
          <img src={assignment.vehicle.imageUrl} alt={`${assignment.vehicle.brand} ${assignment.vehicle.model}`} className="w-full h-36 object-cover" />
          {isMatch && (
            <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-semibold shadow">
              📍 Cerca de ti
            </span>
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-5xl relative">
          🚌
          {isMatch && (
            <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
              📍 Cerca de ti
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Vehicle name + commune badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">
              {assignment.vehicle?.brand} {assignment.vehicle?.model}
              {assignment.vehicle?.year && <span className="font-normal text-gray-400 text-xs ml-1">({assignment.vehicle.year})</span>}
            </p>
            {assignment.vehicle?.licensePlate && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{assignment.vehicle.licensePlate}</p>
            )}
          </div>
          {assignment.vehicle?.commune && (
            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
              isMatch
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}>
              {assignment.vehicle.commune}
            </span>
          )}
        </div>

        {/* Driver */}
        {assignment.driver && (
          <div className="flex items-center gap-2 mb-3 py-2 px-2.5 bg-gray-50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs flex-shrink-0">
              {assignment.driver.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{assignment.driver.name}</p>
              {assignment.driver.phone && (
                <p className="text-xs text-gray-400">{assignment.driver.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Seats progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Asientos disponibles</span>
            <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
              {available}/{capacity}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : available <= 2 ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${Math.min(100, (booked / (capacity || 1)) * 100)}%` }}
            />
          </div>
          {available <= 2 && !isFull && (
            <p className="text-xs text-amber-600 mt-1 font-medium">⚡ ¡Solo quedan {available} asientos!</p>
          )}
        </div>

        {isFull ? (
          <span className="block w-full text-center py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium">Sin cupos</span>
        ) : (
          <button
            onClick={() => onBook(assignment)}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition"
          >
            Reservar asiento
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
      className={`w-full text-left rounded-2xl border transition-all overflow-hidden
        ${selected
          ? 'border-blue-500 ring-2 ring-blue-200 shadow-md bg-white'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white shadow-sm'
        }`}
    >
      {event.bannerImageUrl ? (
        <div className="relative">
          <img src={event.bannerImageUrl} alt={event.title} className="w-full h-40 object-cover" />
          {selected && (
            <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">✓ Seleccionado</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`w-full h-24 flex items-center justify-center text-4xl ${selected ? 'bg-blue-50' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
          🚌
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{event.title}</h3>
          {event.eventCode && (
            <span className="text-xs font-mono text-gray-400 flex-shrink-0">{event.eventCode}</span>
          )}
        </div>
        {event.address && (
          <p className="text-sm text-gray-500 flex items-start gap-1.5 mb-1">
            <span className="flex-shrink-0">📍</span>
            <span className="line-clamp-1">{event.address}</span>
          </p>
        )}
        <p className="text-sm text-blue-600 font-medium flex items-center gap-1.5">
          <span>📅</span>
          <span>{formatDate(event.eventDate)}</span>
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
  const vehiclesSectionRef = useRef(null)

  const [shop, setShop]                   = useState(null)
  const [events, setEvents]               = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [errorEvents, setErrorEvents]     = useState(null)

  const [selectedEvent, setSelectedEvent]         = useState(null)
  const [assignments, setAssignments]             = useState([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  const [communeQuery, setCommuneQuery]   = useState('')
  const [driverQuery, setDriverQuery]     = useState('')
  const [bookingTarget, setBookingTarget] = useState(null)
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

  // Select event → load its assignments + scroll
  const handleSelectEvent = useCallback(async (event) => {
    if (selectedEvent?.id === event.id) {
      setSelectedEvent(null)
      setAssignments([])
      return
    }
    setSelectedEvent(event)
    setAssignments([])
    setCommuneQuery('')
    setDriverQuery('')
    setLoadingAssignments(true)
    try {
      const data = await api.getPublicEventAssignments(event.id)
      setAssignments(data || [])
    } catch {
      setAssignments([])
    } finally {
      setLoadingAssignments(false)
    }
    // Auto-scroll to vehicles section
    setTimeout(() => {
      vehiclesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }, [selectedEvent])

  // Filter + sort assignments
  const filteredAssignments = assignments
    .filter(a => {
      const driverOk = !driverQuery ||
        (a.driver?.name || '').toLowerCase().includes(driverQuery.toLowerCase())
      return driverOk
    })
    .sort((a, b) => {
      const aCommune = (a.vehicle?.commune || '').toLowerCase()
      const bCommune = (b.vehicle?.commune || '').toLowerCase()
      const query = communeQuery.toLowerCase()
      if (query) {
        const aExact = aCommune === query
        const bExact = bCommune === query
        const aPartial = aCommune.includes(query)
        const bPartial = bCommune.includes(query)
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        if (aPartial && !bPartial) return -1
        if (!aPartial && bPartial) return 1
      }
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
    if (selectedEvent) {
      api.getPublicEventAssignments(selectedEvent.id)
        .then(data => setAssignments(data || []))
        .catch(() => {})
    }
  }

  // Communes present in current event vehicles (for datalist)
  const eventCommunes = [...new Set(assignments.map(a => a.vehicle?.commune).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 flex-shrink-0">
              ←
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-lg leading-tight truncate">{shop?.name ?? slug}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🚌 Transporte</span>
            </div>
          </div>
          {user && (
            <button onClick={() => navigate('/appointments')} className="text-sm text-blue-600 font-medium hover:underline flex-shrink-0">
              Mis reservas
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {loadingEvents && <Spinner text="Cargando eventos..." />}

        {errorEvents && !loadingEvents && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm text-center">
            {errorEvents}
          </div>
        )}

        {!loadingEvents && !errorEvents && events.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚌</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin eventos disponibles</h2>
            <p className="text-sm text-gray-400">No hay eventos de transporte publicados por este negocio.</p>
          </div>
        )}

        {!loadingEvents && events.length > 0 && (
          <>
            {/* ── PASO 1: Eventos ─────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <h2 className="text-base font-semibold text-gray-800">Selecciona un evento</h2>
              </div>
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

            {/* ── PASO 2: Vehículos ────────────────────────────────────────── */}
            <section ref={vehiclesSectionRef}>
              {!selectedEvent ? (
                <div className="flex items-center gap-3 p-5 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-sm">Selecciona un evento para ver los vehículos disponibles</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <h2 className="text-base font-semibold text-gray-800">
                      Elige tu vehículo
                      <span className="text-blue-600 ml-1">· {selectedEvent.title}</span>
                    </h2>
                  </div>

                  {/* Filters */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
                    {/* Commune search */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        📍 Buscar por comuna de salida
                      </label>
                      <input
                        type="text"
                        list="communes-filter"
                        value={communeQuery}
                        onChange={e => setCommuneQuery(e.target.value)}
                        placeholder="Ej: Puente Alto, Santiago..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                      <datalist id="communes-filter">
                        {/* First show communes actually in this event */}
                        {eventCommunes.map(c => <option key={c} value={c} />)}
                        {/* Then all Chile communes */}
                        {CHILEAN_COMMUNES.filter(c => !eventCommunes.includes(c)).map(c => <option key={c} value={c} />)}
                      </datalist>
                      {eventCommunes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {eventCommunes.map(c => (
                            <button
                              key={c}
                              onClick={() => setCommuneQuery(communeQuery === c ? '' : c)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                                communeQuery === c
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Driver search */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        🧑‍✈️ Buscar por conductor
                      </label>
                      <input
                        type="text"
                        value={driverQuery}
                        onChange={e => setDriverQuery(e.target.value)}
                        placeholder="Nombre del conductor..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    </div>

                    {(communeQuery || driverQuery) && (
                      <button
                        onClick={() => { setCommuneQuery(''); setDriverQuery('') }}
                        className="text-xs text-red-500 hover:text-red-700 transition"
                      >
                        ✕ Limpiar filtros
                      </button>
                    )}
                  </div>

                  {/* Results */}
                  {loadingAssignments ? (
                    <Spinner text="Cargando vehículos..." />
                  ) : filteredAssignments.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-gray-500 text-sm font-medium">
                        {assignments.length === 0
                          ? 'No hay vehículos asignados a este evento'
                          : 'No hay vehículos que coincidan con tu búsqueda'}
                      </p>
                      {assignments.length > 0 && (
                        <button
                          onClick={() => { setCommuneQuery(''); setDriverQuery('') }}
                          className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                          Ver todos los vehículos
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {communeQuery && (
                        <p className="text-xs text-gray-400 mb-3">
                          Mostrando {filteredAssignments.length} vehículo{filteredAssignments.length !== 1 ? 's' : ''} ordenados por proximidad a <strong className="text-gray-600">{communeQuery}</strong>
                        </p>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {filteredAssignments.map(a => (
                          <VehicleCard
                            key={a.id}
                            assignment={a}
                            selectedCommune={communeQuery}
                            onBook={handleBook}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      {/* Booking Modal */}
      {bookingTarget && selectedEvent && (
        <BookingModal
          event={selectedEvent}
          assignment={bookingTarget}
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
