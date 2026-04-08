import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Autocomplete } from '@react-google-maps/api'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PublicUserMenu from '../components/PublicUserMenu'

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

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function BookingModal({ event, assignment, onClose, onSuccess }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const autocompleteRef = useRef(null)

  const [destinationAddress, setDestinationAddress] = useState('')
  const [distanceKm, setDistanceKm] = useState(null)
  const [fare, setFare]             = useState(null)
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [vehicleImgError, setVehicleImgError] = useState(false)

  // Coordenadas del origen: las del evento directo, o geocodificadas como fallback
  const [originLat, setOriginLat] = useState(event?.latitude ?? null)
  const [originLng, setOriginLng] = useState(event?.longitude ?? null)
  const [destLat, setDestLat]     = useState(null)
  const [destLng, setDestLng]     = useState(null)

  const pricePerKm   = event?.pricePerKm ?? null
  const available    = assignment.availableSeats ?? 0
  const eventAddress = event?.address

  // Fallback: si el evento NO tiene coordenadas pero SÍ tiene dirección, geocodificar
  useEffect(() => {
    if (originLat != null || !eventAddress || !window.google?.maps) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: eventAddress }, (results, status) => {
      if (status === 'OK' && results[0]?.geometry) {
        setOriginLat(results[0].geometry.location.lat())
        setOriginLng(results[0].geometry.location.lng())
      }
    })
  }, [eventAddress, originLat])

  // Recalcular distancia + tarifa cada vez que cambian las coordenadas
  const calcFare = useCallback((oLat, oLng, dLat, dLng) => {
    if (oLat == null || dLat == null) return
    const km = haversineKm(oLat, oLng, dLat, dLng)
    setDistanceKm(km)
    setFare(pricePerKm != null ? Math.ceil(km * pricePerKm) : null)
  }, [pricePerKm])

  // Cuando el geocoding del origen termina y ya hay destino seleccionado
  useEffect(() => {
    if (originLat != null && destLat != null) calcFare(originLat, originLng, destLat, destLng)
  }, [originLat, originLng, destLat, destLng, calcFare])

  // Al seleccionar una sugerencia de Google
  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setDestinationAddress(place.formatted_address || place.name || '')
    setDestLat(lat)
    setDestLng(lng)
    // Cálculo directo si el origen ya está listo
    if (originLat != null) calcFare(originLat, originLng, lat, lng)
  }, [originLat, originLng, calcFare])

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
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[95dvh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="px-5 pt-4 pb-6 sm:pt-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">Reservar asiento</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{event.title} · {formatDate(event.eventDate)}</p>

          {/* Vehicle info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-5">
            {assignment.vehicle?.imageUrl && !vehicleImgError
              ? <img
                  src={assignment.vehicle.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  onError={() => setVehicleImgError(true)}
                />
              : <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0">🚌</div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{assignment.vehicle?.brand} {assignment.vehicle?.model} {assignment.vehicle?.year && `(${assignment.vehicle.year})`}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Conductor: <span className="font-medium">{assignment.driver?.name ?? 'Por confirmar'}</span></p>
              {assignment.vehicle?.commune && (
                <p className="text-xs text-indigo-600 font-medium">📍 Sale desde: {assignment.vehicle.commune}</p>
              )}
              <p className="text-xs text-green-600 font-medium">{available} asientos disponibles</p>
            </div>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">

            {/* ── Dirección de destino ── */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
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
                    if (!e.target.value) { setDistanceKm(null); setFare(null) }
                  }}
                  placeholder="Ej: Av. Vicuña Mackenna 1234, Santiago"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </Autocomplete>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Selecciona una sugerencia para calcular la tarifa automáticamente.</p>
            </div>

            {/* ── Resumen de tarifa (mismo patrón que el bazar) ── */}
            <div className={`rounded-xl border p-4 ${distanceKm != null ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Resumen de tarifa</p>
              <div className="space-y-2">

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">🚌 Origen</span>
                  <span className="font-medium text-gray-800 dark:text-gray-100 text-right max-w-[65%] leading-tight">
                    {eventAddress || '—'}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">📍 Destino</span>
                  <span className={`text-right max-w-[65%] truncate ${destinationAddress ? 'font-medium text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                    {destinationAddress || 'Ingresa tu dirección'}
                  </span>
                </div>

                {distanceKm != null && (
                  <>
                    <div className="border-t border-blue-200 dark:border-blue-800 my-1" />

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        📏 Distancia
                        <span className="text-xs text-gray-400 dark:text-gray-500">(línea recta)</span>
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{distanceKm.toFixed(1)} km</span>
                    </div>

                    {pricePerKm != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          💲 Tarifa
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                            ({distanceKm.toFixed(1)} km × {formatCLP(pricePerKm)}/km)
                          </span>
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">{formatCLP(fare)}</span>
                      </div>
                    )}

                    <div className="border-t border-blue-200 dark:border-blue-800 my-1" />

                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-base">Total estimado</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">
                        {fare != null ? formatCLP(fare) : 'A convenir'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">* Tarifa referencial en línea recta.</p>
                  </>
                )}

                {originLat == null && distanceKm == null && (
                  <p className="text-xs text-amber-600 pt-1">
                    💬 El conductor definirá el precio según la dirección ingresada.
                  </p>
                )}
              </div>
            </div>

            {/* ── Notas ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Notas <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Punto de encuentro, necesidades especiales..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {fare != null ? `Reservar · ${formatCLP(fare)}` : 'Confirmar reserva'}
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">¡Reserva confirmada!</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Tu asiento ha sido reservado exitosamente.</p>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide mb-0.5">Código de reserva</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 font-mono">#{booking.id}</p>
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
  const [imgError, setImgError] = useState(false)

  const showImage = assignment.vehicle?.imageUrl && !imgError

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all hover:shadow-md overflow-hidden
      ${isFull ? 'opacity-60' : ''}
      ${isMatch ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-900 shadow-sm' : 'border-gray-200 dark:border-gray-700 shadow-sm'}
    `}>
      {/* Vehicle image */}
      {showImage ? (
        <div className="relative">
          <img
            src={assignment.vehicle.imageUrl}
            alt={`${assignment.vehicle.brand} ${assignment.vehicle.model}`}
            className="w-full h-36 object-cover"
            onError={() => setImgError(true)}
          />
          {isMatch && (
            <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-semibold shadow">
              📍 Cerca de ti
            </span>
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-5xl relative">
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
            <p className="font-bold text-gray-900 dark:text-gray-50 text-sm leading-tight">
              {assignment.vehicle?.brand} {assignment.vehicle?.model}
              {assignment.vehicle?.year && <span className="font-normal text-gray-400 dark:text-gray-500 text-xs ml-1">({assignment.vehicle.year})</span>}
            </p>
            {assignment.vehicle?.licensePlate && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{assignment.vehicle.licensePlate}</p>
            )}
          </div>
          {assignment.vehicle?.commune && (
            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
              isMatch
                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-semibold'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}>
              {assignment.vehicle.commune}
            </span>
          )}
        </div>

        {/* Driver */}
        {assignment.driver && (
          <div className="flex items-center gap-2 mb-3 py-2 px-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs flex-shrink-0">
              {assignment.driver.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{assignment.driver.name}</p>
              {assignment.driver.phone && (
                <p className="text-xs text-gray-400 dark:text-gray-500">{assignment.driver.phone}</p>
              )}
            </div>
          </div>
        )}

        {/* Seats progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Asientos disponibles</span>
            <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
              {available}/{capacity}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
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
          <span className="block w-full text-center py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-medium">Sin cupos</span>
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
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 shadow-md bg-white dark:bg-gray-900'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm bg-white dark:bg-gray-900 shadow-sm'
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
        <div className={`w-full h-24 flex items-center justify-center text-4xl ${selected ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700'}`}>
          🚌
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 dark:text-gray-50 text-base leading-tight">{event.title}</h3>
          {event.eventCode && (
            <span className="text-xs font-mono text-gray-400 flex-shrink-0">{event.eventCode}</span>
          )}
        </div>
        {event.address && (
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1.5 mb-1">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 flex-shrink-0">
              ←
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 dark:text-gray-50 text-lg leading-tight truncate">{shop?.name ?? slug}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🚌 Transporte</span>
            </div>
          </div>
          <PublicUserMenu loginRedirect={`/transport/${slug}`} dark={false} />
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
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Sin eventos disponibles</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">No hay eventos de transporte publicados por este negocio.</p>
          </div>
        )}

        {!loadingEvents && events.length > 0 && (
          <>
            {/* ── PASO 1: Eventos ─────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Selecciona un evento</h2>
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
                <div className="flex items-center gap-3 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                  <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-sm">Selecciona un evento para ver los vehículos disponibles</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                      Elige tu vehículo
                      <span className="text-blue-600 ml-1">· {selectedEvent.title}</span>
                    </h2>
                  </div>

                  {/* Filters */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4 space-y-3">
                    {/* Commune search */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        📍 Buscar por comuna de salida
                      </label>
                      <select
                        value={communeQuery}
                        onChange={e => setCommuneQuery(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition appearance-none"
                      >
                        <option value="">Todas las comunas</option>
                        {eventCommunes.length > 0 && (
                          <optgroup label="Comunas del evento">
                            {eventCommunes.map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                        )}
                        <optgroup label="Otras comunas">
                          {CHILEAN_COMMUNES.filter(c => !eventCommunes.includes(c)).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      </select>
                      {eventCommunes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {eventCommunes.map(c => (
                            <button
                              key={c}
                              onClick={() => setCommuneQuery(communeQuery === c ? '' : c)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                                communeQuery === c
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:text-indigo-600'
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
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                        🧑‍✈️ Buscar por conductor
                      </label>
                      <input
                        type="text"
                        value={driverQuery}
                        onChange={e => setDriverQuery(e.target.value)}
                        placeholder="Nombre del conductor..."
                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition"
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
                    <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
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
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                          Mostrando {filteredAssignments.length} vehículo{filteredAssignments.length !== 1 ? 's' : ''} ordenados por proximidad a <strong className="text-gray-600 dark:text-gray-300">{communeQuery}</strong>
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
