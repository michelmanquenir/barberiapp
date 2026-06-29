import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Plus, Minus, X, MapPin, Home, Package,
  CreditCard, Banknote, CheckCircle, Store, ArrowLeft, Loader2,
  User, Clock, Calendar, Images, ChevronLeft, ChevronRight,
  Search, SlidersHorizontal, ChevronDown, Landmark, Upload, FileText, Copy, Check,
} from 'lucide-react'
import { Autocomplete } from '@react-google-maps/api'
import { api } from '../lib/api'
import { uploadTransferProof } from '../lib/transferProofUpload'
import { useAuth } from '../context/AuthContext'
import PublicUserMenu from '../components/PublicUserMenu'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + Number(n ?? 0).toLocaleString('es-AR')

const DAY_LABEL = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
}
const DAY_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']

const pad = (n) => String(n).padStart(2, '0')

// Calcula la próxima fecha en que cae ese día de la semana
function nextDateForDay(dayOfWeek) {
  const JS_DAY = { SUNDAY:0, MONDAY:1, TUESDAY:2, WEDNESDAY:3, THURSDAY:4, FRIDAY:5, SATURDAY:6 }
  const target = JS_DAY[dayOfWeek]
  const now = new Date()
  const today = now.getDay()
  let daysAhead = target - today
  if (daysAhead <= 0) daysAhead += 7
  const d = new Date(now)
  d.setDate(d.getDate() + daysAhead)
  return d
}

// Combina fecha + hora "HH:mm" → string LOCAL sin zona ("2026-03-25T09:00:00")
// Usa fecha/hora local del dispositivo para evitar conversión UTC
function toScheduledAt(dayOfWeek, timeStr) {
  const d = nextDateForDay(dayOfWeek)
  const [h, m] = (timeStr || '09:00').split(':').map(Number)
  d.setHours(h, m, 0, 0)
  // Formateo manual → nunca se convierte a UTC
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}:00`
}

// Agrupa slots de horario por día
function groupByDay(schedules) {
  const map = {}
  for (const s of schedules) {
    if (!map[s.dayOfWeek]) map[s.dayOfWeek] = []
    map[s.dayOfWeek].push(s)
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }
  return map
}

// Genera lista de horas cada 1 hora dentro de los rangos disponibles de un día
// Ej: slots=[{startTime:"09:00:00", endTime:"14:00:00"}, {startTime:"18:30:00", endTime:"21:00:00"}]
// → ["09:00","10:00","11:00","12:00","13:00","18:30","19:30","20:30"]  (o cada hora entera dentro del rango)
function generateHourlySlots(daySlots) {
  const times = new Set()
  for (const slot of daySlots) {
    const startStr = (slot.startTime || '').substring(0, 5) // "HH:mm"
    const endStr   = (slot.endTime   || '').substring(0, 5)
    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    const startMins = sh * 60 + (isNaN(sm) ? 0 : sm)
    const endMins   = eh * 60 + (isNaN(em) ? 0 : em)
    // Primera entrada puede ser a los minutos exactos (ej 18:30), luego de ahí en horas enteras
    let cur = startMins
    while (cur < endMins) {
      times.add(`${pad(Math.floor(cur/60))}:${pad(cur%60)}`)
      // avanzar a la siguiente hora entera
      const nextHour = (Math.floor(cur / 60) + 1) * 60
      cur = nextHour
    }
  }
  return [...times].sort()
}

// ── ProductDetailModal ────────────────────────────────────────────────────────
function ProductDetailModal({ product, qty, onAdd, onRemove, onClose }) {
  const outOfStock = product.stock <= 0
  const lowStock   = product.stock > 0 && product.stock <= 5

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Imagen */}
        <div className="relative w-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full max-h-72 object-contain"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Badge stock sobre imagen */}
          <div className="absolute bottom-3 left-3">
            {outOfStock ? (
              <span className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-full font-medium shadow">Agotado</span>
            ) : lowStock ? (
              <span className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-medium shadow">Últimas {product.stock} unidades</span>
            ) : (
              <span className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-medium shadow">En stock</span>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          {product.category && (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {product.category}
            </span>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1 leading-tight">
            {product.name}
          </h2>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {fmt(product.salePrice)}
          </p>

          {product.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
              {product.description}
            </p>
          )}

          {(product.barcode || product.sku) && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
              {product.barcode && (
                <span className="font-mono">Barcode: {product.barcode}</span>
              )}
              {product.sku && (
                <span className="font-mono">SKU: {product.sku}</span>
              )}
            </div>
          )}
        </div>

        {/* Footer: acciones carrito */}
        <div className="px-5 pb-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          {qty === 0 ? (
            <button
              onClick={() => { onAdd(); onClose() }}
              disabled={outOfStock}
              className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Agregar al carrito
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button onClick={onRemove}
                className="w-11 h-11 rounded-xl border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200">
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{qty} en carrito</span>
              <button onClick={onAdd} disabled={qty >= product.stock}
                className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, qty, onAdd, onRemove, onDetail }) {
  const outOfStock = product.stock <= 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col">
      {/* Imagen clickeable */}
      <button
        type="button"
        onClick={onDetail}
        className="w-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden focus:outline-none"
        style={{ aspectRatio: '1 / 1' }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <Package className="w-10 h-10 text-gray-300 dark:text-gray-500" />
        )}
      </button>

      <div className="p-3 flex flex-col flex-1">
        {product.category && (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
            {product.category}
          </span>
        )}
        {/* Nombre clickeable */}
        <button
          type="button"
          onClick={onDetail}
          className="text-left text-sm font-semibold text-gray-900 dark:text-white flex-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {product.name}
        </button>

        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-base font-bold text-gray-900 dark:text-white">{fmt(product.salePrice)}</span>
          {outOfStock ? (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Agotado</span>
          ) : lowStock ? (
            <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">Últimas {product.stock}</span>
          ) : null}
        </div>

        <div className="mt-2">
          {qty === 0 ? (
            <button onClick={onAdd} disabled={outOfStock}
              className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button onClick={onRemove}
                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{qty}</span>
              <button onClick={onAdd} disabled={qty >= product.stock}
                className="w-9 h-9 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CopyField — campo copiable ────────────────────────────────────────────────
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-mono font-semibold text-gray-900 dark:text-white break-all">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
          copied
            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

// ── TransferPanel ─────────────────────────────────────────────────────────────
function TransferPanel({ shop, proofFile, proofUrl, uploadingProof, proofError, proofInputRef, onProofChange, onClearProof }) {
  const [copiedAll, setCopiedAll] = useState(false)

  const fields = [
    { label: 'Nombre',           value: shop?.transferAccountHolder },
    { label: 'RUT',              value: shop?.transferRut },
    { label: 'Email',            value: shop?.transferEmail },
    { label: 'Tipo de cuenta',   value: shop?.transferAccountType },
    { label: 'Número de cuenta', value: shop?.transferAccountNumber },
    { label: 'Banco',            value: shop?.transferBankName },
  ].filter(f => f.value)

  const hasData = fields.length > 0

  const copyAll = () => {
    const text = fields.map(f => f.value).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2500)
    })
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden">

      {/* Paso 1 — Datos bancarios */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">1</span>
            Transferí el monto a esta cuenta
          </p>
          {hasData && (
            <button
              type="button"
              onClick={copyAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                copiedAll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? '¡Copiado!' : 'Copiar todo'}
            </button>
          )}
        </div>

        {hasData ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl px-3 divide-y divide-gray-100 dark:divide-gray-800">
            {fields.map(({ label, value }) => (
              <CopyField key={label} label={label} value={value} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-900 rounded-xl px-3 py-3">
            El negocio te indicará los datos de transferencia por otro medio.
          </p>
        )}
      </div>

      {/* Paso 2 — Comprobante (opcional) */}
      <div className="border-t border-emerald-200 dark:border-emerald-800 bg-white/60 dark:bg-gray-900/40 p-4">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 mb-2">
          <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">2</span>
          Adjuntá el comprobante
          <span className="font-normal text-amber-600 dark:text-amber-400">· obligatorio</span>
        </p>

        <input
          ref={proofInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onProofChange}
        />

        {!proofFile ? (
          <button
            type="button"
            onClick={() => proofInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition text-xs font-medium"
          >
            <Upload className="w-4 h-4 shrink-0" />
            Subir imagen o PDF del comprobante
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-white truncate">{proofFile.name}</p>
              {uploadingProof && <p className="text-[10px] text-blue-500">Subiendo...</p>}
              {proofUrl && !uploadingProof && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Adjunto ✓</p>}
            </div>
            <button type="button" onClick={onClearProof} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}
        {proofError && <p className="text-xs text-red-500 mt-1.5">{proofError}</p>}
      </div>
    </div>
  )
}

// ── CheckoutModal ─────────────────────────────────────────────────────────────
function CheckoutModal({ cartItems, cartTotal, shop, barbers, onClose, onConfirm, submitting, isAuthenticated }) {
  const navigate = useNavigate()
  const [deliveryType, setDeliveryType]         = useState('pickup')
  const [address, setAddress]                   = useState('')
  const [distanceKm, setDistanceKm]             = useState(null)
  const [deliveryFee, setDeliveryFee]           = useState(0)
  const [paymentMethod, setPaymentMethod]       = useState('cash')
  const [proofFile, setProofFile]               = useState(null)   // File seleccionado
  const [proofUrl, setProofUrl]                 = useState(null)   // URL tras upload
  const [uploadingProof, setUploadingProof]     = useState(false)
  const [proofError, setProofError]             = useState(null)
  const [notes, setNotes]                       = useState('')
  // ── Datos de invitado (si no está autenticado) ───────────────────────────
  const [guestName, setGuestName]               = useState('')
  const [guestEmail, setGuestEmail]             = useState('')
  const [guestPhone, setGuestPhone]             = useState('')
  const proofInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  // ── Profesional + horario ────────────────────────────────────────────────
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [barberSchedules, setBarberSchedules]   = useState([])   // slots del barbero elegido
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [selectedDay, setSelectedDay]           = useState('')    // "MONDAY"
  const [selectedHour, setSelectedHour]         = useState('')    // "09:00"

  const canDeliver = shop?.homeServiceEnabled
  const pricePerKm = shop?.pricePerKm || 0

  // Grupos de días disponibles en los horarios del barbero
  const schedulesByDay = groupByDay(barberSchedules)
  const availableDays = Object.keys(schedulesByDay).sort(
    (a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)
  )

  // Horas disponibles para el día seleccionado (grilla cada 1h)
  const availableHours = selectedDay && schedulesByDay[selectedDay]
    ? generateHourlySlots(schedulesByDay[selectedDay])
    : []

  // Al cambiar tipo de entrega → resetear delivery
  const handleDeliveryTypeChange = (val) => {
    setDeliveryType(val)
    if (val === 'pickup') {
      setDistanceKm(null); setDeliveryFee(0); setAddress('')
      setSelectedBarberId(''); setBarberSchedules([])
      setSelectedDay(''); setSelectedHour('')
    }
  }

  // Al cambiar barbero → cargar sus horarios
  useEffect(() => {
    if (!selectedBarberId || deliveryType !== 'delivery') {
      setBarberSchedules([]); setSelectedDay(''); setSelectedHour(''); return
    }
    setLoadingSchedules(true)
    api.getBarberSchedules({ barberId: selectedBarberId, shopId: shop.id })
      .then(data => {
        setBarberSchedules(data || [])
        // Pre-seleccionar el primer día disponible
        const groups = groupByDay(data || [])
        const days = Object.keys(groups).sort((a,b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
        if (days.length > 0) {
          const firstDay = days[0]
          setSelectedDay(firstDay)
          const hours = generateHourlySlots(groups[firstDay] || [])
          setSelectedHour(hours[0] || '')
        }
      })
      .catch(() => setBarberSchedules([]))
      .finally(() => setLoadingSchedules(false))
  }, [selectedBarberId, deliveryType, shop.id])

  // Al cambiar día → pre-seleccionar primera hora
  const handleDayChange = (day) => {
    setSelectedDay(day)
    const hours = generateHourlySlots(schedulesByDay[day] || [])
    setSelectedHour(hours[0] || '')
  }

  // ── Haversine ───────────────────────────────────────────────────────────────
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return
    const formatted = place.formatted_address || place.name || ''
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setAddress(formatted)
    if (shop?.latitude && shop?.longitude) {
      const dist = haversineKm(shop.latitude, shop.longitude, lat, lng)
      setDistanceKm(dist)
      setDeliveryFee(Math.round(dist * 2 * pricePerKm))
    }
  }, [shop, pricePerKm]) // eslint-disable-line

  const grandTotal = cartTotal + (deliveryType === 'delivery' ? deliveryFee : 0)

  // ── Validación ───────────────────────────────────────────────────────────
  const isTransferValid = paymentMethod !== 'transfer' || (!!proofUrl && !uploadingProof)
  const isGuestValid    = isAuthenticated || (guestName.trim().length >= 2 && guestEmail.trim().length >= 5)
  const isDeliveryValid = (deliveryType !== 'delivery' || (
    address.trim() &&
    selectedBarberId &&
    selectedDay &&
    selectedHour
  )) && isTransferValid && isGuestValid

  const handleProofChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setProofError(null)
    setUploadingProof(true)
    try {
      const url = await uploadTransferProof(file, shop.id)
      setProofUrl(url)
    } catch (err) {
      setProofError(err.message)
      setProofFile(null)
      setProofUrl(null)
    } finally {
      setUploadingProof(false)
    }
  }

  const hasTransferInfo = shop?.transferAccountNumber || shop?.transferAlias

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isDeliveryValid) return
    const scheduledAt = (selectedDay && selectedHour)
      ? toScheduledAt(selectedDay, selectedHour)
      : null
    onConfirm({
      deliveryType,
      clientAddress: address.trim() || null,
      paymentMethod,
      transferProofUrl: paymentMethod === 'transfer' ? (proofUrl ?? null) : null,
      notes: notes.trim() || null,
      deliveryFee: deliveryType === 'delivery' ? deliveryFee : 0,
      assignedBarberId: selectedBarberId ? Number(selectedBarberId) : null,
      scheduledAt,
      ...(!isAuthenticated && {
        guestName:  guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim() || null,
      }),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">Confirmar pedido</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* Resumen de items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tu pedido</p>
            <div className="space-y-1.5">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.quantity}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Subtotal productos</span>
                <span>{fmt(cartTotal)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Recargo delivery
                    {distanceKm != null && pricePerKm > 0 && (
                      <span className="text-xs text-gray-400">
                        ({distanceKm.toFixed(1)} km × 2 × ${pricePerKm.toLocaleString()}/km)
                      </span>
                    )}
                  </span>
                  <span className={deliveryFee > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {deliveryFee > 0 ? `+${fmt(deliveryFee)}` : distanceKm == null ? 'Ingresa dirección' : 'Sin recargo'}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-800">
                <span>Total</span>
                <span>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Tipo de entrega */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tipo de entrega</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pickup', label: 'Retiro en local', icon: <Package className="w-4 h-4" /> },
                ...(canDeliver ? [{
                  value: 'delivery',
                  label: 'Delivery',
                  icon: <Home className="w-4 h-4" />,
                  sub: pricePerKm > 0 ? `+$${pricePerKm.toLocaleString()}/km` : 'Gratis',
                }] : []),
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => handleDeliveryTypeChange(opt.value)}
                  className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 text-sm font-medium transition ${
                    deliveryType === opt.value
                      ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                  <span className="flex items-center gap-2">{opt.icon}{opt.label}</span>
                  {opt.sub && <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-6">{opt.sub}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Opciones de delivery ─────────────────────────────────────── */}
          {deliveryType === 'delivery' && (
            <>
              {/* Dirección */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                  Dirección de entrega <span className="text-red-400">*</span>
                </label>
                <Autocomplete onLoad={(ref) => (autocompleteRef.current = ref)} onPlaceChanged={onPlaceChanged}>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                    <input type="text" defaultValue={address} placeholder="Escribe tu dirección..."
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white" />
                  </div>
                </Autocomplete>
                {!address && (
                  <p className="text-xs text-red-400 mt-1">Selecciona una dirección del autocompletado</p>
                )}
                {address && distanceKm != null && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ {distanceKm.toFixed(1)} km desde el local</p>
                )}
              </div>

              {/* Profesional de delivery */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                  Repartidor <span className="text-red-400">*</span>
                </label>
                {barbers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    Este negocio aún no tiene repartidores registrados.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {barbers.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBarberId(String(b.id))}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-medium transition text-left ${
                          selectedBarberId === String(b.id)
                            ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {b.imageUrl ? (
                          <img src={b.imageUrl} alt={b.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="truncate">{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Horario del repartidor */}
              {selectedBarberId && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                    Horario de entrega <span className="text-red-400">*</span>
                  </label>

                  {loadingSchedules ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando horarios...
                    </div>
                  ) : barberSchedules.length === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded-xl p-3">
                      Este repartidor aún no tiene horarios configurados.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Selector de día */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Día
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableDays.map(day => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDayChange(day)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                selectedDay === day
                                  ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {DAY_LABEL[day]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Grilla horaria: cada 1 hora dentro de los rangos disponibles */}
                      {selectedDay && availableHours.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Hora de entrega
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {availableHours.map(hour => (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => setSelectedHour(hour)}
                                className={`py-2 rounded-lg text-xs font-semibold border transition text-center ${
                                  selectedHour === hour
                                    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {hour}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resumen de la entrega elegida */}
                      {selectedDay && selectedHour && (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 rounded-lg px-3 py-2">
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          Próximo {DAY_LABEL[selectedDay]} a las {selectedHour} hrs
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Método de pago */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'cash', label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
                { value: 'transfer', label: 'Transferencia', icon: <Landmark className="w-4 h-4" /> },
              ].map(({ value, label, icon }) => (
                <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition ${
                    paymentMethod === value
                      ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Panel de transferencia */}
            {paymentMethod === 'transfer' && (
              <TransferPanel shop={shop} proofFile={proofFile} proofUrl={proofUrl}
                uploadingProof={uploadingProof} proofError={proofError}
                proofInputRef={proofInputRef} onProofChange={handleProofChange}
                onClearProof={() => { setProofFile(null); setProofUrl(null); setProofError(null) }}
              />
            )}
          </div>

          {/* Datos del invitado (solo si no está autenticado) */}
          {!isAuthenticated && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Tus datos de contacto
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-500">
                Para que el negocio pueda contactarte.{' '}
                <button type="button" onClick={() => {
                    const cartToSave = {}
                    cartItems.forEach(item => { cartToSave[item.id] = item.quantity })
                    sessionStorage.setItem(`pendingCart_${shop.slug}`, JSON.stringify(cartToSave))
                    navigate('/login', { state: { from: `/shop/${shop.slug}` } })
                  }}
                  className="underline font-semibold">¿Tienes cuenta? Inicia sesión</button>
              </p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                    Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notas opcionales */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
              Notas (opcional)
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, aclaraciones..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
            />
          </div>

          {paymentMethod === 'transfer' && !proofUrl && !uploadingProof && (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400 -mb-2">
              Debés adjuntar el comprobante de transferencia para continuar
            </p>
          )}
          <button type="submit" disabled={submitting || !isDeliveryValid}
            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? 'Realizando pedido...' : `Confirmar pedido · ${fmt(grandTotal)}`}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PublicShopCatalog() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [shop, setShop]         = useState(null)
  const [products, setProducts] = useState([])
  const [barbers, setBarbers]   = useState([])  // profesionales del negocio
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const [cart, setCart]               = useState({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const [activeCategory, setActiveCategory] = useState('Todos')
  const [searchQuery, setSearchQuery]     = useState('')
  const [priceRange, setPriceRange]       = useState('all') // 'all' | '0-5000' | '5000-15000' | '15000-50000' | '50000+'
  const [sortBy, setSortBy]               = useState('default') // 'default' | 'price-asc' | 'price-desc' | 'name'
  const [showFilters, setShowFilters]     = useState(false)

  // ── Galería del negocio ────────────────────────────────────────────────────
  const [shopGallery, setShopGallery]       = useState([])
  const [lightboxIndex, setLightboxIndex]   = useState(null)  // null = cerrado
  const [detailProduct, setDetailProduct]   = useState(null)  // producto en el modal de detalle

  useEffect(() => {
    setLoading(true)
    api.getShopBySlug(slug)
      .then(async (shopData) => {
        const [prods, shopBarbers, gallery] = await Promise.all([
          api.getShopProducts(shopData.id).catch(() => []),
          api.getShopBarbers(shopData.slug).catch(() => []),
          api.getShopGallery(shopData.id).catch(() => []),
        ])
        setShop(shopData)
        setProducts(prods.filter(p => p.active !== false))
        setBarbers(shopBarbers || [])
        setShopGallery(gallery || [])
      })
      .catch(() => setError('Negocio no encontrado'))
      .finally(() => setLoading(false))
  }, [slug])

  // Restaurar carrito guardado al volver del login
  useEffect(() => {
    if (products.length === 0) return
    const saved = sessionStorage.getItem(`pendingCart_${slug}`)
    if (!saved) return
    try {
      setCart(JSON.parse(saved))
      setCheckoutOpen(true)
    } catch {}
    sessionStorage.removeItem(`pendingCart_${slug}`)
  }, [products, slug])

  const addToCart = useCallback((productId) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }))
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart(prev => {
      const next = { ...prev }
      if ((next[productId] ?? 0) > 1) next[productId]--
      else delete next[productId]
      return next
    })
  }, [])

  const cartItems = products
    .filter(p => (cart[p.id] ?? 0) > 0)
    .map(p => ({ ...p, quantity: cart[p.id], subtotal: p.salePrice * cart[p.id] }))

  const cartTotal = cartItems.reduce((sum, i) => sum + i.subtotal, 0)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))]

  const PRICE_RANGES = {
    'all':         { label: 'Todos los precios', min: 0, max: Infinity },
    '0-5000':      { label: 'Hasta $5.000',      min: 0, max: 5000 },
    '5000-15000':  { label: '$5.000 – $15.000',   min: 5000, max: 15000 },
    '15000-50000': { label: '$15.000 – $50.000',   min: 15000, max: 50000 },
    '50000+':      { label: 'Más de $50.000',      min: 50000, max: Infinity },
  }

  const activeFiltersCount = (searchQuery ? 1 : 0) + (priceRange !== 'all' ? 1 : 0) + (sortBy !== 'default' ? 1 : 0)

  const visibleProducts = (() => {
    let filtered = activeCategory === 'Todos' ? products : products.filter(p => p.category === activeCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      )
    }
    if (priceRange !== 'all') {
      const { min, max } = PRICE_RANGES[priceRange]
      filtered = filtered.filter(p => (p.salePrice ?? 0) >= min && (p.salePrice ?? 0) < max)
    }
    if (sortBy === 'price-asc') filtered = [...filtered].sort((a, b) => (a.salePrice ?? 0) - (b.salePrice ?? 0))
    else if (sortBy === 'price-desc') filtered = [...filtered].sort((a, b) => (b.salePrice ?? 0) - (a.salePrice ?? 0))
    else if (sortBy === 'name') filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return filtered
  })()

  const handleConfirmOrder = async ({ deliveryType, clientAddress, paymentMethod, transferProofUrl, notes, deliveryFee, assignedBarberId, scheduledAt, guestName, guestEmail, guestPhone }) => {
    if (cartItems.length === 0) return

    setSubmitting(true)
    try {
      await api.createOrder({
        shopId: shop.id,
        deliveryType,
        paymentMethod,
        transferProofUrl: transferProofUrl ?? null,
        clientAddress,
        notes,
        deliveryFee: deliveryFee ?? 0,
        assignedBarberId: assignedBarberId ?? null,
        scheduledAt: scheduledAt ?? null,
        guestName:  guestName  ?? null,
        guestEmail: guestEmail ?? null,
        guestPhone: guestPhone ?? null,
        items: cartItems.map(i => ({ productId: i.id, quantity: i.quantity })),
      })
      setOrderPlaced(true)
      setCart({})
      setCheckoutOpen(false)
    } catch (err) {
      alert(err?.message || 'Error al realizar el pedido. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{error || 'Negocio no encontrado'}</p>
          <button onClick={() => navigate('/booking')} className="mt-4 text-sm text-blue-600 hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Pedido realizado!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {shop.name} recibirá tu pedido y se comunicará para coordinar la entrega.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/appointments')}
              className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm">
              Ver mis pedidos
            </button>
            <button onClick={() => setOrderPlaced(false)}
              className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm">
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header — ancho completo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/booking')}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{shop.name}</h1>
            {shop.address && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{shop.address}
              </p>
            )}
          </div>
          {shop.homeServiceEnabled && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium whitespace-nowrap hidden sm:inline">
              Delivery disponible
            </span>
          )}
          <PublicUserMenu loginRedirect={`/shop/${slug}`} dark={false} />
        </div>
      </div>

      {/* ── Galería del negocio (ancho completo, encima del layout) ── */}
      {shopGallery.length > 0 && (
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {shopGallery.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(idx)}
                className="flex-shrink-0 w-28 h-24 sm:w-40 sm:h-32 lg:w-48 lg:h-36 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-90 transition"
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || 'Foto del negocio'}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Layout principal: sidebar + contenido ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex gap-6 items-start">

        {/* ── SIDEBAR (solo desktop) ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-56 xl:w-64 flex-shrink-0 sticky top-[73px]">

          {/* Categorías */}
          {categories.length > 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Categorías</p>
              </div>
              <nav className="py-1">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-4 py-2 text-sm transition flex items-center justify-between gap-2 ${
                      activeCategory === cat
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
                    <span className="truncate">{cat}</span>
                    {activeCategory === cat && <span className="text-xs opacity-60">✓</span>}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Precio</p>
            </div>
            <nav className="py-1">
              {Object.entries(PRICE_RANGES).map(([key, { label }]) => (
                <button key={key} onClick={() => setPriceRange(key)}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    priceRange === key
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Ordenar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ordenar</p>
            </div>
            <nav className="py-1">
              {[
                { key: 'default',    label: 'Predeterminado' },
                { key: 'price-asc',  label: 'Menor precio' },
                { key: 'price-desc', label: 'Mayor precio' },
                { key: 'name',       label: 'Nombre A-Z' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setSortBy(key)}
                  className={`w-full text-left px-4 py-2 text-sm transition ${
                    sortBy === key
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setSearchQuery(''); setPriceRange('all'); setSortBy('default'); setActiveCategory('Todos') }}
              className="text-xs text-red-500 hover:text-red-600 font-medium transition text-left px-1">
              Limpiar filtros ({activeFiltersCount})
            </button>
          )}
        </aside>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <div className="flex-1 min-w-0">

        {/* Lightbox */}
        {lightboxIndex !== null && shopGallery[lightboxIndex] && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(null) }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            ><X className="w-5 h-5" /></button>

            {shopGallery.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + shopGallery.length) % shopGallery.length) }}
                  className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                ><ChevronLeft className="w-6 h-6" /></button>
                <button
                  onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % shopGallery.length) }}
                  className="absolute right-16 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                ><ChevronRight className="w-6 h-6" /></button>
              </>
            )}

            <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
              <img
                src={shopGallery[lightboxIndex].imageUrl}
                alt={shopGallery[lightboxIndex].caption || ''}
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
              {shopGallery[lightboxIndex].caption && (
                <p className="text-center text-white/70 text-sm mt-3">
                  {shopGallery[lightboxIndex].caption}
                </p>
              )}
              <p className="text-center text-white/40 text-xs mt-1">
                {lightboxIndex + 1} / {shopGallery.length}
              </p>
            </div>
          </div>
        )}

        {/* ── Barra de búsqueda + filtros ── */}
        <div className="mb-4 space-y-3">
          {/* Búsqueda + botón filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition ${
                showFilters || activeFiltersCount > 0
                  ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Panel filtros móvil expandible */}
          {showFilters && (
            <div className="lg:hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Precio</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PRICE_RANGES).map(([key, { label }]) => (
                    <button key={key} onClick={() => setPriceRange(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        priceRange === key
                          ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Ordenar por</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'default', label: 'Predeterminado' },
                    { key: 'price-asc', label: 'Menor precio' },
                    { key: 'price-desc', label: 'Mayor precio' },
                    { key: 'name', label: 'Nombre A-Z' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setSortBy(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        sortBy === key
                          ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <button onClick={() => { setSearchQuery(''); setPriceRange('all'); setSortBy('default') }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium transition">
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Category pills móvil */}
          {categories.length > 2 && (
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    activeCategory === cat
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {visibleProducts.length} producto{visibleProducts.length !== 1 ? 's' : ''}
          {activeCategory !== 'Todos' && ` en "${activeCategory}"`}
          {searchQuery && ` · "${searchQuery}"`}
        </p>

        {/* Products grid — 2 cols móvil, 3 tablet, 3-4 desktop (con sidebar) */}
        {visibleProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || priceRange !== 'all' ? 'No hay productos que coincidan con los filtros' : 'No hay productos disponibles'}
            </p>
            {(searchQuery || priceRange !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setPriceRange('all'); setSortBy('default'); setActiveCategory('Todos') }}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 ${cartCount > 0 ? 'pb-28' : ''}`}>
            {visibleProducts.map(product => (
              <ProductCard key={product.id} product={product}
                qty={cart[product.id] ?? 0}
                onAdd={() => addToCart(product.id)}
                onRemove={() => removeFromCart(product.id)}
                onDetail={() => setDetailProduct(product)}
              />
            ))}
          </div>
        )}

        </div>{/* fin contenido principal */}
      </div>{/* fin layout sidebar+contenido */}

      {/* Floating cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-30">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-2xl shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition font-semibold"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span>Ver carrito · {fmt(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <CheckoutModal
          cartItems={cartItems}
          cartTotal={cartTotal}
          shop={shop}
          barbers={barbers}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handleConfirmOrder}
          submitting={submitting}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Product detail modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          qty={cart[detailProduct.id] ?? 0}
          onAdd={() => addToCart(detailProduct.id)}
          onRemove={() => removeFromCart(detailProduct.id)}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  )
}
