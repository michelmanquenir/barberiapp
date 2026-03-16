import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Scissors,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CreditCard,
  Check,
  Loader2,
  User,
  MapPin,
  Tag,
  Home,
} from 'lucide-react'
import { Autocomplete } from '@react-google-maps/api'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AdminNavbar from '../../components/AdminNavbar'

// ─── helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}


const DAY_NAMES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function nextDays(count = 14) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
]

// Para barberos: marcar el pasado pero seguir permitiendo selección
function isSlotPast(timeStr, isToday) {
  if (!isToday) return false
  const now = new Date()
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m < now.getHours() * 60 + now.getMinutes()
}

// ─── Componente principal ─────────────────────────────────────────────────────

function BarberBooking() {
  const { shopId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [shop, setShop]       = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Perfil del barbero logueado (para preseleccionarlo)
  const [myBarberProfile, setMyBarberProfile] = useState(null)

  // Estado del formulario
  const [form, setForm] = useState({
    clientName:      '',
    serviceId:       null,
    barberId:        null,
    date:            todayStr(),
    time:            '',
    paymentMethod:   'cash',
    locationType:    'barbershop',
    clientAddress:   '',
    clientLatitude:  null,
    clientLongitude: null,
    homeDistanceKm:  null,
    surchargeAmount: 0,
  })

  const autocompleteRef = useRef(null)

  const [bookedBarberIds, setBookedBarberIds] = useState([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [done, setDone]               = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState(null)

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [shops, servicesData, barberProfile] = await Promise.all([
      api.getMyShops(),
      api.getShopServices(shopId).catch(() => []),
      api.getMyBarberProfile().catch(() => null),
    ])
    const found = shops.find((s) => s.id === shopId)
    if (!found) throw new Error('Negocio no encontrado')
    setShop(found)
    setServices(servicesData || [])
    setMyBarberProfile(barberProfile)

    // Preseleccionar al barbero logueado si está en este shop
    if (barberProfile) {
      const isInShop = (found.barbers ?? []).some((b) => b.id === barberProfile.id)
      if (isInShop) {
        setForm((prev) => ({ ...prev, barberId: barberProfile.id }))
      }
    }
  }, [shopId])

  useEffect(() => {
    loadData()
      .catch(() => setError('No se pudo cargar la información del negocio'))
      .finally(() => setLoading(false))
  }, [loadData])

  // ── Disponibilidad al cambiar hora ───────────────────────────────────────────

  const handleTimeSelect = async (time) => {
    setForm((prev) => ({ ...prev, time, barberId: prev.barberId }))
    if (!form.date) return
    const duration = form.locationType === 'home' ? 180 : 30
    setLoadingAvailability(true)
    try {
      const booked = await api.getBookedBarbers(shopId, form.date, time, duration)
      setBookedBarberIds(booked || [])
    } catch {
      setBookedBarberIds([])
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleLocationTypeChange = (locationType) => {
    setForm((prev) => ({
      ...prev,
      locationType,
      // Resetear campos de domicilio si se cambia a barbershop
      ...(locationType === 'barbershop' ? {
        clientAddress: '', clientLatitude: null,
        clientLongitude: null, homeDistanceKm: null, surchargeAmount: 0,
      } : {}),
      // Resetear hora/barbero porque cambia la disponibilidad
      time: '', barberId: null,
    }))
    setBookedBarberIds([])
  }

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
    setForm((prev) => ({
      ...prev,
      clientAddress: address,
      clientLatitude: lat,
      clientLongitude: lng,
      homeDistanceKm: distKm,
      surchargeAmount: surcharge,
    }))
  }, [shop])

  const handleDateSelect = (dateStr) => {
    setForm((prev) => ({ ...prev, date: dateStr, time: '' }))
    setBookedBarberIds([])
  }

  // ── Envío ────────────────────────────────────────────────────────────────────

  const canSubmit =
    form.clientName.trim() &&
    form.serviceId &&
    form.barberId &&
    form.date &&
    form.time &&
    form.paymentMethod &&
    (form.locationType !== 'home' || !!form.clientAddress)

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const apt = await api.barberCreateAppointment({
        shopId,
        serviceId:       form.serviceId,
        barberId:        form.barberId,
        date:            form.date,
        time:            form.time,
        clientName:      form.clientName.trim(),
        paymentMethod:   form.paymentMethod,
        locationType:    form.locationType,
        clientAddress:   form.clientAddress || null,
        clientLatitude:  form.clientLatitude || null,
        clientLongitude: form.clientLongitude || null,
        homeDistanceKm:  form.homeDistanceKm || null,
        surchargeAmount: form.surchargeAmount || 0,
      })
      setCreatedAppointment(apt)
      setDone(true)
    } catch (err) {
      setSubmitError(err.message ?? 'Error al agendar la cita')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setDone(false)
    setCreatedAppointment(null)
    setForm({
      clientName: '', serviceId: null,
      barberId: myBarberProfile?.id ?? null,
      date: todayStr(), time: '',
      paymentMethod: 'cash', locationType: 'barbershop',
      clientAddress: '', clientLatitude: null, clientLongitude: null,
      homeDistanceKm: null, surchargeAmount: 0,
    })
    setBookedBarberIds([])
  }

  // ── Render: estados especiales ───────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 dark:text-blue-400 underline">
          Volver
        </button>
      </div>
    </div>
  )

  if (done) {
    const svc = services.find((s) => s.id === form.serviceId)
    const brb = (shop?.barbers ?? []).find((b) => b.id === form.barberId)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-sm w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">¡Cita agendada!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">La cita fue registrada correctamente</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left space-y-1.5 text-sm text-gray-700 dark:text-gray-200 mb-6">
            <p>👤 <strong>{form.clientName}</strong></p>
            <p>✂️ {svc?.name}</p>
            <p>📅 {form.date} a las {form.time}</p>
            <p>💈 {brb?.name}</p>
            {form.locationType === 'home' && form.clientAddress && (
              <p>🏠 {form.clientAddress}</p>
            )}
            <p>💰 $
              {form.locationType === 'home' && form.surchargeAmount > 0
                ? ((svc?.price ?? 0) + form.surchargeAmount).toLocaleString()
                : svc?.price?.toLocaleString()
              }
              {form.locationType === 'home' && form.surchargeAmount > 0 && (
                <span className="text-gray-500 dark:text-gray-400"> (+${form.surchargeAmount.toLocaleString()} domicilio)</span>
              )}
              {' '}· {form.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={resetForm}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition"
            >
              Agendar otra
            </button>
            <button
              onClick={() => navigate(`/admin/shops/${shopId}/appointments`)}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Ver citas
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: formulario ───────────────────────────────────────────────────────

  const barbers    = shop?.barbers ?? []
  const isToday    = form.date === todayStr()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Volver */}
          <button
            onClick={() => navigate(`/admin/shops/${shopId}`)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {shop?.name ?? 'Mi negocio'}
          </button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Agendar cita</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Agenda una cita directamente para un cliente en{' '}
              <span className="font-medium text-gray-700 dark:text-gray-200">{shop?.name}</span>
            </p>
          </div>

          <div className="space-y-4">

            {/* ── Cliente ── */}
            <FormCard title="Cliente" icon={<User className="w-4 h-4 text-gray-500 dark:text-gray-400" />}>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                placeholder="Nombre del cliente (ej. Juan Pérez)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Puede ser un cliente walk-in o uno que ya tiene cuenta.
              </p>
            </FormCard>

            {/* ── Servicio ── */}
            <FormCard title="Servicio" icon={<Tag className="w-4 h-4 text-gray-500 dark:text-gray-400" />}>
              {services.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No hay servicios configurados en este negocio.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {services.map((svc) => {
                    const sel = form.serviceId === svc.id
                    return (
                      <button
                        key={svc.id}
                        onClick={() => setForm((prev) => ({ ...prev, serviceId: svc.id }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          sel ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{svc.name}</span>
                          {sel && <Check className="w-4 h-4 text-gray-900 dark:text-gray-100 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-base font-bold text-gray-900 dark:text-gray-50">
                            ${svc.price?.toLocaleString()}
                          </span>
                          {svc.duration_minutes && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                              {svc.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </FormCard>

            {/* ── Fecha ── */}
            <FormCard title="Fecha" icon={<Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />}>
              <div className="grid grid-cols-7 gap-1">
                {nextDays(14).map((day) => {
                  const dateStr  = day.toISOString().split('T')[0]
                  const selected = form.date === dateStr
                  const isDay    = dateStr === todayStr()
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateSelect(dateStr)}
                      className={`flex flex-col items-center py-2 px-0.5 rounded-xl text-center transition-all border-2 ${
                        selected
                          ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={`text-xs font-medium ${selected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                        {DAY_NAMES[day.getDay()]}
                      </span>
                      <span className={`text-base font-bold leading-tight ${selected ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-gray-50'}`}>
                        {day.getDate()}
                      </span>
                      <span className={`text-xs ${selected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                        {isDay ? 'Hoy' : MONTH_NAMES[day.getMonth()]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </FormCard>

            {/* ── Hora ── */}
            <FormCard title="Hora" icon={<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />}>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {TIME_SLOTS.map((time) => {
                  const past     = isSlotPast(time, isToday)
                  const selected = form.time === time
                  return (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                        selected
                          ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : past
                            ? 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
              {isToday && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Como profesional, puedes agendar en cualquier horario, incluyendo slots pasados.
                </p>
              )}
            </FormCard>

            {/* ── Profesional ── */}
            <FormCard title="Profesional" icon={<Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />}>
              {barbers.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No hay profesionales en este negocio.</p>
              ) : loadingAvailability ? (
                <div className="flex items-center gap-2 py-3 text-gray-400 dark:text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando disponibilidad...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {barbers.map((barber) => {
                    const booked   = form.time ? bookedBarberIds.includes(barber.id) : false
                    const selected = form.barberId === barber.id
                    const isMe     = myBarberProfile?.id === barber.id
                    return (
                      <button
                        key={barber.id}
                        onClick={() => setForm((prev) => ({ ...prev, barberId: barber.id }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                          selected
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {barber.imageUrl
                            ? <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                            : <Scissors className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm truncate">{barber.name}</p>
                            {isMe && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                                Tú
                              </span>
                            )}
                          </div>
                          {form.time && (
                            <p className={`text-xs font-medium mt-0.5 ${booked ? 'text-amber-500 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                              {booked ? '● Ocupado a esta hora' : '● Disponible'}
                            </p>
                          )}
                        </div>
                        {selected && <Check className="w-4 h-4 text-gray-900 dark:text-gray-100 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </FormCard>

            {/* ── Pago y ubicación ── */}
            <FormCard title="Pago y ubicación" icon={<CreditCard className="w-4 h-4 text-gray-500" />}>
              <div className={`grid gap-3 ${shop?.homeServiceEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Método de pago */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Método de pago</p>
                  <div className="space-y-1.5">
                    {[
                      { id: 'cash',     label: '💵 Efectivo' },
                      { id: 'transfer', label: '💳 Transferencia' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: m.id }))}
                        className={`w-full p-2.5 rounded-lg border-2 text-left text-sm transition-all ${
                          form.paymentMethod === m.id
                            ? 'border-gray-900 bg-gray-50 font-medium'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Ubicación — solo si el negocio tiene domicilio habilitado */}
                {shop?.homeServiceEnabled && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Ubicación</p>
                    <div className="space-y-1.5">
                      {[
                        { id: 'barbershop', label: '🏪 En el local' },
                        { id: 'home',       label: `🏠 A domicilio (+$${(shop.pricePerKm || 0).toLocaleString()}/km)` },
                      ].map((l) => (
                        <button
                          key={l.id}
                          onClick={() => handleLocationTypeChange(l.id)}
                          className={`w-full p-2.5 rounded-lg border-2 text-left text-sm transition-all ${
                            form.locationType === l.id
                              ? 'border-gray-900 bg-gray-50 font-medium'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dirección del cliente (solo domicilio) */}
              {form.locationType === 'home' && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" /> Dirección del cliente <span className="text-red-500">*</span>
                  </p>
                  <Autocomplete
                    onLoad={(ref) => (autocompleteRef.current = ref)}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                      <input
                        type="text"
                        defaultValue={form.clientAddress}
                        placeholder="Escribe la dirección del cliente..."
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </Autocomplete>
                  {form.homeDistanceKm != null && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      📍 Distancia: <strong>{form.homeDistanceKm.toFixed(1)} km</strong>
                      {form.surchargeAmount > 0 && (
                        <span> → recargo <strong>${form.surchargeAmount.toLocaleString()}</strong></span>
                      )}
                    </p>
                  )}
                  {!form.clientAddress && (
                    <p className="text-xs text-red-400 mt-1">Debes ingresar la dirección para continuar</p>
                  )}
                </div>
              )}
            </FormCard>

            {/* ── Error y botón de envío ── */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</>
                : <><Check className="w-4 h-4" /> Confirmar cita</>
              }
            </button>

          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Tarjeta de sección ────────────────────────────────────────────────────────

function FormCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

export default BarberBooking
