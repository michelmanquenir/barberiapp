import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, Bus, MapPin, ImagePlus, X, Users, DollarSign, TrendingUp, Clock, CheckCircle, XCircle, Search, RefreshCw, ChevronRight } from 'lucide-react'
import { Autocomplete, GoogleMap, Marker } from '@react-google-maps/api'
import { api } from '../../lib/api'
import AdminNavbar from '../../components/AdminNavbar'
import { uploadTransportBanner } from '../../lib/transportBannerUpload'

const DEFAULT_MAP_CENTER = { lat: -33.4489, lng: -70.6693 } // Santiago
const MAP_STYLES = { height: '100%', width: '100%' }
const MAP_OPTIONS = { zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }

// ── Comunas de Chile ──────────────────────────────────────────────────────────
export const CHILEAN_COMMUNES = [
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL')
}

// ── Modal genérico ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Input helper ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent'

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ active }) {
  return active
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">Activo</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Inactivo</span>
}

// ── Autocompletado de dirección (Google Places) ───────────────────────────────
function AddressAutocomplete({ value, onChange, onPlaceSelect, placeholder = 'Escribe la dirección del evento...' }) {
  const autocompleteRef = useRef(null)
  const inputRef = useRef(null)

  // Sync value → input (uncontrolled por Google Autocomplete)
  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.value = value || ''
    }
  }, [value])

  const onPlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace()
    const address = place?.formatted_address || inputRef.current?.value || ''
    onChange(address)
    if (place?.geometry && onPlaceSelect) {
      onPlaceSelect({
        address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      })
    }
  }

  return (
    <Autocomplete
      onLoad={(ref) => (autocompleteRef.current = ref)}
      onPlaceChanged={onPlaceChanged}
      options={{ componentRestrictions: { country: 'cl' } }}
    >
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={value || ''}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>
    </Autocomplete>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENTOS TAB
// ══════════════════════════════════════════════════════════════════════════════

const EMPTY_EVENT = {
  eventCode: '', title: '', address: '', eventDate: '', bannerImageUrl: '', pricePerKm: '', active: true,
  latitude: null, longitude: null,
}

function EventsTab({ shopId, vehicles, drivers }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // null | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY_EVENT)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Mapa del modal
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER)
  const [markerPos, setMarkerPos] = useState(null)
  const mapRef = useRef(null)

  // Banner imagen
  const bannerInputRef = useRef(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Assignments per expanded event
  const [assignments, setAssignments] = useState({})
  const [loadingAssign, setLoadingAssign] = useState(false)
  const [assignForm, setAssignForm] = useState({ driverId: '', vehicleId: '' })
  const [savingAssign, setSavingAssign] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTransportEvents(shopId)
      const evList = data || []
      setEvents(evList)
      // Pre-cargar asignaciones de todos los eventos para detectar conflictos
      const allAssignments = {}
      await Promise.all(evList.map(async (ev) => {
        try {
          const asgn = await api.getEventAssignments(ev.id)
          allAssignments[ev.id] = asgn || []
        } catch {
          allAssignments[ev.id] = []
        }
      }))
      setAssignments(allAssignments)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm(EMPTY_EVENT)
    setEditId(null)
    setMarkerPos(null)
    setMapCenter(DEFAULT_MAP_CENTER)
    setBannerPreview(null)
    setModal('form')
  }
  const openEdit = (ev) => {
    setForm({
      eventCode: ev.eventCode ?? '',
      title: ev.title ?? '',
      address: ev.address ?? '',
      eventDate: ev.eventDate ? ev.eventDate.substring(0, 16) : '',
      bannerImageUrl: ev.bannerImageUrl ?? '',
      pricePerKm: ev.pricePerKm != null ? String(ev.pricePerKm) : '',
      active: ev.active ?? true,
      latitude: ev.latitude ?? null,
      longitude: ev.longitude ?? null,
    })
    setEditId(ev.id)
    setBannerPreview(ev.bannerImageUrl || null)
    if (ev.latitude && ev.longitude) {
      const pos = { lat: ev.latitude, lng: ev.longitude }
      setMarkerPos(pos)
      setMapCenter(pos)
    } else {
      setMarkerPos(null)
      setMapCenter(DEFAULT_MAP_CENTER)
    }
    setModal('form')
  }

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerPreview(URL.createObjectURL(file))
    setUploadingBanner(true)
    try {
      const url = await uploadTransportBanner(file, shopId)
      setForm(f => ({ ...f, bannerImageUrl: url }))
    } catch (err) {
      alert(err.message ?? 'No se pudo subir la imagen')
      setBannerPreview(form.bannerImageUrl || null)
    } finally {
      setUploadingBanner(false)
    }
  }

  const removeBanner = () => {
    setBannerPreview(null)
    setForm(f => ({ ...f, bannerImageUrl: '' }))
  }

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarkerPos({ lat, lng })
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
  }, [])

  const onMarkerDragEnd = useCallback((e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarkerPos({ lat, lng })
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
  }, [])

  const onPlaceSelect = useCallback(({ lat, lng }) => {
    const pos = { lat, lng }
    setMarkerPos(pos)
    setMapCenter(pos)
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
    if (mapRef.current) { mapRef.current.panTo(pos); mapRef.current.setZoom(17) }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
        pricePerKm: form.pricePerKm !== '' ? Number(form.pricePerKm) : null,
      }
      if (editId) {
        const updated = await api.updateTransportEvent(shopId, editId, payload)
        setEvents(prev => prev.map(ev => ev.id === editId ? updated : ev))
      } else {
        const created = await api.createTransportEvent(shopId, payload)
        setEvents(prev => [created, ...prev])
      }
      setModal(null)
    } catch (err) {
      alert(err.message || 'Error al guardar evento')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este evento?')) return
    try {
      await api.deleteTransportEvent(shopId, id)
      setEvents(prev => prev.filter(ev => ev.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      alert(err.message || 'Error al eliminar')
    }
  }

  const toggleExpand = async (eventId) => {
    if (expandedId === eventId) { setExpandedId(null); return }
    setExpandedId(eventId)
    if (!assignments[eventId]) {
      setLoadingAssign(true)
      try {
        const data = await api.getEventAssignments(eventId)
        setAssignments(prev => ({ ...prev, [eventId]: data || [] }))
      } catch {
        setAssignments(prev => ({ ...prev, [eventId]: [] }))
      } finally {
        setLoadingAssign(false)
      }
    }
    setAssignForm({ driverId: '', vehicleId: '' })
  }

  const handleAssignDriverChange = (driverId, driverVehicles) => {
    // Si el conductor tiene solo 1 vehículo, lo auto-selecciona
    const autoVehicle = driverVehicles.length === 1 ? String(driverVehicles[0].id) : ''
    setAssignForm({ driverId, vehicleId: autoVehicle })
  }

  const handleAddAssignment = async (eventId) => {
    if (!assignForm.driverId) {
      alert('Selecciona un conductor')
      return
    }
    if (!assignForm.vehicleId) {
      alert('Selecciona el vehículo que usará en este evento')
      return
    }
    setSavingAssign(true)
    try {
      const created = await api.createEventAssignment(eventId, {
        vehicleId: Number(assignForm.vehicleId),
        driverId: Number(assignForm.driverId),
      })
      setAssignments(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), created],
      }))
      setAssignForm({ driverId: '', vehicleId: '' })
    } catch (err) {
      alert(err.message || 'Error al asignar')
    } finally {
      setSavingAssign(false)
    }
  }

  const handleRemoveAssignment = async (eventId, assignmentId) => {
    if (!window.confirm('¿Quitar esta asignación?')) return
    try {
      await api.deleteEventAssignment(assignmentId)
      setAssignments(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter(a => a.id !== assignmentId),
      }))
    } catch (err) {
      alert(err.message || 'Error al quitar asignación')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Eventos</h2>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition">
          <Plus className="w-4 h-4" /> Agregar evento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando eventos...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-400 dark:text-gray-500">
          <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay eventos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm">{ev.title}</span>
                    {ev.eventCode && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{ev.eventCode}</span>
                    )}
                    <Badge active={ev.active} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.address}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(ev.eventDate)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleExpand(ev.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                    {expandedId === ev.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedId === ev.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Vehículos asignados</p>

                  {loadingAssign && !assignments[ev.id] ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando asignaciones...
                    </div>
                  ) : (assignments[ev.id] || []).length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Sin vehículos asignados</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {(assignments[ev.id] || []).map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {a.vehicle?.brand} {a.vehicle?.model} · {a.driver?.name ?? 'Sin conductor'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.bookedSeats ?? 0}/{a.vehicle?.passengerCapacity ?? '?'} asientos</p>
                          </div>
                          <button onClick={() => handleRemoveAssignment(ev.id, a.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Asignar nuevo — primero conductor, luego vehículo */}
                  {(() => {
                    const driverVehicles = vehicles.filter(v => assignForm.driverId && v.driverId === Number(assignForm.driverId))

                    // IDs de conductores y vehículos ya usados en OTROS eventos EL MISMO DÍA
                    const evDay = ev.eventDate ? new Date(ev.eventDate).toDateString() : null
                    const usedDriverIds = new Set(
                      Object.entries(assignments)
                        .filter(([eid]) => {
                          if (Number(eid) === ev.id) return false
                          const other = events.find(e => e.id === Number(eid))
                          if (!other?.eventDate || !evDay) return false
                          return new Date(other.eventDate).toDateString() === evDay
                        })
                        .flatMap(([, list]) => list.map(a => a.driver?.id).filter(Boolean))
                    )
                    const usedVehicleIds = new Set(
                      Object.entries(assignments)
                        .filter(([eid]) => {
                          if (Number(eid) === ev.id) return false
                          const other = events.find(e => e.id === Number(eid))
                          if (!other?.eventDate || !evDay) return false
                          return new Date(other.eventDate).toDateString() === evDay
                        })
                        .flatMap(([, list]) => list.map(a => a.vehicle?.id).filter(Boolean))
                    )
                    // IDs de conductores ya en ESTE evento
                    const thisEventDriverIds = new Set(
                      (assignments[ev.id] || []).map(a => a.driver?.id).filter(Boolean)
                    )

                    return (
                      <div className="space-y-2">
                        {/* 1. Seleccionar conductor */}
                        <select
                          value={assignForm.driverId}
                          onChange={e => handleAssignDriverChange(e.target.value, vehicles.filter(v => e.target.value && v.driverId === Number(e.target.value)))}
                          className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                        >
                          <option value="">Selecciona conductor...</option>
                          {drivers.map(d => {
                            const inOtherEvent = usedDriverIds.has(d.id)
                            const inThisEvent  = thisEventDriverIds.has(d.id)
                            const disabled = inOtherEvent || inThisEvent
                            const label = `${d.name}${d.phone ? ' · ' + d.phone : ''}${inOtherEvent ? ' — ya en otro evento' : inThisEvent ? ' — ya en este evento' : ''}`
                            return <option key={d.id} value={d.id} disabled={disabled}>{label}</option>
                          })}
                        </select>

                        {/* 2. Vehículo del conductor (auto o manual si tiene varios) */}
                        {assignForm.driverId && (
                          driverVehicles.length === 0 ? (
                            <p className="text-xs text-amber-500 dark:text-amber-400">
                              ⚠️ Este conductor no tiene vehículos asignados. Asígnale uno en la pestaña Vehículos.
                            </p>
                          ) : driverVehicles.length === 1 ? (
                            usedVehicleIds.has(driverVehicles[0].id) ? (
                              <p className="text-xs text-red-500 dark:text-red-400">
                                ⛔ {driverVehicles[0].brand} {driverVehicles[0].model} ya está asignado a otro evento.
                              </p>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                <span className="text-xs text-green-700 dark:text-green-400">🚌 Vehículo cargado automáticamente:</span>
                                <span className="text-xs font-semibold text-green-800 dark:text-green-300">
                                  {driverVehicles[0].brand} {driverVehicles[0].model} · {driverVehicles[0].licensePlate || 'Sin patente'} · {driverVehicles[0].passengerCapacity} pax
                                </span>
                              </div>
                            )
                          ) : (
                            <select
                              value={assignForm.vehicleId}
                              onChange={e => setAssignForm(f => ({ ...f, vehicleId: e.target.value }))}
                              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                            >
                              <option value="">Selecciona qué vehículo usará hoy...</option>
                              {driverVehicles.map(v => {
                                const inOtherEvent = usedVehicleIds.has(v.id)
                                return (
                                  <option key={v.id} value={v.id} disabled={inOtherEvent}>
                                    {v.brand} {v.model} · {v.licensePlate || 'Sin patente'} · {v.passengerCapacity} pax{inOtherEvent ? ' — ya en otro evento' : ''}
                                  </option>
                                )
                              })}
                            </select>
                          )
                        )}

                        {/* 3. Botón asignar */}
                        <button
                          onClick={() => handleAddAssignment(ev.id)}
                          disabled={savingAssign || !assignForm.driverId || !assignForm.vehicleId}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {savingAssign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Asignar conductor al evento
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'form' && (
        <Modal title={editId ? 'Editar evento' : 'Nuevo evento'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Código del evento">
              <input type="text" value={form.eventCode} onChange={e => setForm(f => ({ ...f, eventCode: e.target.value }))} className={inputCls} placeholder="Ej: EVT-2026-01" />
            </Field>
            <Field label="Título *">
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Nombre del evento" />
            </Field>
            <Field label="Dirección del evento">
              <AddressAutocomplete
                value={form.address}
                onChange={val => setForm(f => ({ ...f, address: val }))}
                onPlaceSelect={onPlaceSelect}
                placeholder="Buscar dirección en Chile..."
              />
            </Field>
            <Field label="Ubicación en el mapa">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Selecciona una dirección arriba o haz clic en el mapa · arrastra el pin para ajustar
              </p>
              <div className="h-56 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <GoogleMap
                  mapContainerStyle={MAP_STYLES}
                  center={mapCenter}
                  zoom={markerPos ? 16 : 13}
                  options={MAP_OPTIONS}
                  onLoad={(map) => { mapRef.current = map }}
                  onClick={onMapClick}
                >
                  {markerPos && (
                    <Marker position={markerPos} draggable onDragEnd={onMarkerDragEnd} />
                  )}
                </GoogleMap>
              </div>
              {form.latitude && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  📍 {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                </p>
              )}
            </Field>
            <Field label="Fecha y hora">
              <input type="datetime-local" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Tarifa por kilómetro ($)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.pricePerKm}
                  onChange={e => setForm(f => ({ ...f, pricePerKm: e.target.value }))}
                  className={`${inputCls} pl-7`}
                  placeholder="Ej: 350"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Se usará para calcular la tarifa al pasajero según su dirección de destino. Deja vacío si el precio es a convenir.</p>
            </Field>
            <Field label="Banner del evento">
              {/* Input oculto */}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerChange}
              />
              {/* Preview */}
              {bannerPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 mb-2" style={{ aspectRatio: '16/7' }}>
                  <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
                  {uploadingBanner && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  {!uploadingBanner && (
                    <button
                      type="button"
                      onClick={removeBanner}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition mb-2">
                  <ImagePlus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Haz clic para subir una imagen de banner</span>
                </div>
              )}
              {/* Botón cambiar */}
              <button
                type="button"
                disabled={uploadingBanner}
                onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
                {uploadingBanner
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Subiendo...</>
                  : <><ImagePlus className="w-3.5 h-3.5" />{bannerPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}</>}
              </button>
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ev-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="ev-active" className="text-sm text-gray-700 dark:text-gray-300">Activo (visible para clientes)</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editId ? 'Guardar cambios' : 'Crear evento'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONDUCTORES TAB
// ══════════════════════════════════════════════════════════════════════════════

const EMPTY_DRIVER = { name: '', phone: '', licenseNumber: '', licenseImageUrl: '', notes: '', active: true, email: '', rut: '' }

function DriversTab({ shopId, drivers, setDrivers }) {
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_DRIVER)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTransportDrivers(shopId)
      setDrivers(data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [shopId, setDrivers])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY_DRIVER); setEditId(null); setModal(true) }
  const openEdit = (d) => {
    setForm({ name: d.name ?? '', phone: d.phone ?? '', licenseNumber: d.licenseNumber ?? '', licenseImageUrl: d.licenseImageUrl ?? '', notes: d.notes ?? '', active: d.active ?? true, email: d.email ?? '', rut: '' })
    setEditId(d.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        const updated = await api.updateTransportDriver(shopId, editId, form)
        setDrivers(prev => prev.map(d => d.id === editId ? updated : d))
      } else {
        const created = await api.createTransportDriver(shopId, form)
        setDrivers(prev => [created, ...prev])
      }
      setModal(false)
    } catch (err) {
      alert(err.message || 'Error al guardar conductor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este conductor?')) return
    try {
      await api.deleteTransportDriver(shopId, id)
      setDrivers(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      alert(err.message || 'Error al eliminar')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Conductores</h2>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition">
          <Plus className="w-4 h-4" /> Agregar conductor
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando conductores...</span>
        </div>
      ) : drivers.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-400 dark:text-gray-500">
          <p className="text-sm">No hay conductores registrados</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Licencia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Cuenta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    <div>{d.name}</div>
                    {d.email && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{d.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{d.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs hidden md:table-cell">{d.licenseNumber || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {d.hasAccount
                      ? <span className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">✓ Vinculada</span>
                      : <span className="text-xs text-gray-400 dark:text-gray-500">Sin cuenta</span>}
                  </td>
                  <td className="px-4 py-3"><Badge active={d.active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editId ? 'Editar conductor' : 'Nuevo conductor'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nombre *">
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Nombre completo" />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+56 9 XXXX XXXX" />
            </Field>
            <Field label="Número de licencia">
              <input type="text" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} className={inputCls} placeholder="Nro. licencia" />
            </Field>
            <Field label="URL imagen licencia">
              <input type="text" value={form.licenseImageUrl} onChange={e => setForm(f => ({ ...f, licenseImageUrl: e.target.value }))} className={inputCls} placeholder="https://..." />
            </Field>
            <Field label="Notas">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={inputCls} placeholder="Observaciones opcionales..." />
            </Field>

            {/* Email + RUT / cuenta de app */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
              <Field label={editId ? 'Email' : 'Email (crea cuenta de app)'}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                  placeholder="conductor@email.com"
                  disabled={!!editId}
                />
              </Field>
              {!editId && (
                <Field label="RUT">
                  <input
                    type="text"
                    value={form.rut}
                    onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}
                    className={inputCls}
                    placeholder="12345678-9"
                  />
                </Field>
              )}
              {!editId && (
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                  <span className="mt-0.5">ℹ️</span>
                  <span>Si ingresas un email, se creará automáticamente una cuenta en la app y se enviará la contraseña provisional al conductor.</span>
                </p>
              )}
              {editId && form.email && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  El email no se puede cambiar desde aquí una vez creado el conductor.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="drv-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="drv-active" className="text-sm text-gray-700 dark:text-gray-300">Conductor activo</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editId ? 'Guardar cambios' : (form.email ? 'Crear conductor + cuenta' : 'Crear conductor')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VEHÍCULOS TAB
// ══════════════════════════════════════════════════════════════════════════════

const EMPTY_VEHICLE = {
  brand: '', model: '', year: '', licensePlate: '',
  passengerCapacity: '4', commune: '', driverId: '', imageUrl: '', active: true,
}

function VehiclesTab({ shopId, vehicles, setVehicles, drivers }) {
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_VEHICLE)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTransportVehicles(shopId)
      setVehicles(data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [shopId, setVehicles])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY_VEHICLE); setEditId(null); setModal(true) }
  const openEdit = (v) => {
    setForm({
      brand: v.brand ?? '', model: v.model ?? '', year: v.year != null ? String(v.year) : '',
      licensePlate: v.licensePlate ?? '', passengerCapacity: v.passengerCapacity != null ? String(v.passengerCapacity) : '4',
      commune: v.commune ?? '', driverId: v.driverId != null ? String(v.driverId) : '', imageUrl: v.imageUrl ?? '', active: v.active ?? true,
    })
    setEditId(v.id)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : null,
        passengerCapacity: form.passengerCapacity ? Number(form.passengerCapacity) : 4,
        driverId: form.driverId ? Number(form.driverId) : null,
      }
      if (editId) {
        const updated = await api.updateTransportVehicle(shopId, editId, payload)
        setVehicles(prev => prev.map(v => v.id === editId ? updated : v))
      } else {
        const created = await api.createTransportVehicle(shopId, payload)
        setVehicles(prev => [created, ...prev])
      }
      setModal(false)
    } catch (err) {
      alert(err.message || 'Error al guardar vehículo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return
    try {
      await api.deleteTransportVehicle(shopId, id)
      setVehicles(prev => prev.filter(v => v.id !== id))
    } catch (err) {
      alert(err.message || 'Error al eliminar')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Vehículos</h2>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition">
          <Plus className="w-4 h-4" /> Agregar vehículo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando vehículos...</span>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-400 dark:text-gray-500">
          <p className="text-sm">No hay vehículos registrados</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vehículo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Patente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Conductor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Capacidad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">Comuna</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {v.brand} {v.model} {v.year && <span className="text-gray-400">({v.year})</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs hidden sm:table-cell">{v.licensePlate || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{v.driverName || <span className="text-gray-300 dark:text-gray-600">Sin conductor</span>}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{v.passengerCapacity ?? '—'} pax</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell">{v.commune || '—'}</td>
                  <td className="px-4 py-3"><Badge active={v.active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editId ? 'Editar vehículo' : 'Nuevo vehículo'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca *">
                <input type="text" required value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} className={inputCls} placeholder="Toyota" />
              </Field>
              <Field label="Modelo *">
                <input type="text" required value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className={inputCls} placeholder="Hiace" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Año">
                <input type="number" min="1980" max="2030" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputCls} placeholder="2020" />
              </Field>
              <Field label="Patente">
                <input type="text" value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} className={inputCls} placeholder="AB-CD-12" />
              </Field>
            </div>
            <Field label="Capacidad de pasajeros">
              <input type="number" min="1" max="60" value={form.passengerCapacity} onChange={e => setForm(f => ({ ...f, passengerCapacity: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Conductor asignado">
              <select
                value={form.driverId}
                onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Sin conductor asignado</option>
                {(drivers || []).map(d => (
                  <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ''}</option>
                ))}
              </select>
            </Field>
            <Field label="Comuna de salida">
              <select
                value={form.commune}
                onChange={e => setForm(f => ({ ...f, commune: e.target.value }))}
                className={inputCls + ' appearance-none'}
              >
                <option value="">Selecciona una comuna...</option>
                {CHILEAN_COMMUNES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="URL imagen del vehículo">
              <input type="text" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className={inputCls} placeholder="https://..." />
              {form.imageUrl && (
                <div className="mt-2 relative">
                  <img
                    src={form.imageUrl}
                    alt="Vista previa"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
                    onLoad={e => { e.currentTarget.style.display = 'block'; e.currentTarget.nextSibling.style.display = 'none' }}
                  />
                  <div className="hidden w-full h-32 rounded-lg border border-dashed border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 flex-col items-center justify-center gap-1 text-center px-3">
                    <span className="text-red-500 dark:text-red-400 text-xs font-medium">No se pudo cargar la imagen</span>
                    <span className="text-red-400 dark:text-red-500 text-xs">Verifica que la URL sea una imagen directa (jpg, png, webp)</span>
                  </div>
                </div>
              )}
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="veh-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded" />
              <label htmlFor="veh-active" className="text-sm text-gray-700 dark:text-gray-300">Vehículo activo</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editId ? 'Guardar cambios' : 'Crear vehículo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// TAB RESERVAS
// ══════════════════════════════════════════════════════════════════════════════

function formatCLP(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

const STATUS_META = {
  PENDING:   { label: 'Pendiente',  color: 'bg-amber-100  text-amber-700  border-amber-200  dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100   text-blue-700   border-blue-200   dark:bg-blue-950/40  dark:text-blue-400  dark:border-blue-800' },
  COMPLETED: { label: 'Completado', color: 'bg-green-100  text-green-700  border-green-200  dark:bg-green-950/40 dark:text-green-400 dark:border-green-800' },
  CANCELLED: { label: 'Cancelado',  color: 'bg-red-100    text-red-700    border-red-200    dark:bg-red-950/40   dark:text-red-400   dark:border-red-800' },
}
const PAYMENT_ICON = { EFECTIVO: '💵', TRANSFERENCIA: '🏦', TARJETA: '💳' }

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${m.color}`}>{m.label}</span>
}

function StatCard({ icon, label, value, sub, color = 'bg-white dark:bg-gray-900' }) {
  return (
    <div className={`${color} rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-50 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function BookingsTab({ shopId }) {
  const [events, setEvents]             = useState([])
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [bookings, setBookings]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch]             = useState('')
  const [updatingId, setUpdatingId]     = useState(null)

  // Cargar eventos al montar
  useEffect(() => {
    if (!shopId) return
    setLoadingEvents(true)
    api.getTransportEvents(shopId)
      .then(d => {
        const sorted = (d || []).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
        setEvents(sorted)
        if (sorted.length > 0) setSelectedEventId(sorted[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false))
  }, [shopId])

  // Cargar reservas cuando cambia el evento seleccionado
  const loadBookings = useCallback(() => {
    if (!selectedEventId) return
    setLoading(true)
    api.getEventPassengers(selectedEventId)
      .then(d => setBookings(d || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [selectedEventId])

  useEffect(() => { loadBookings() }, [loadBookings])

  const selectedEvent = events.find(e => e.id === selectedEventId)

  // Agrupar reservas por vehículo/assignment
  const bookingsByAssignment = useMemo(() => {
    const map = {}
    bookings.forEach(b => {
      const aId = b.assignment?.id
      if (!map[aId]) map[aId] = { assignment: b.assignment, bookings: [] }
      map[aId].bookings.push(b)
    })
    return Object.values(map)
  }, [bookings])

  // Stats globales del evento
  const stats = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'CANCELLED')
    const totalSeats    = active.reduce((s, b) => s + (b.seatsBooked ?? 1), 0)
    const totalRevenue  = active.reduce((s, b) => s + (b.totalFare ?? 0), 0)
    const totalDeposits = active.reduce((s, b) => s + (b.amountPaid ?? 0), 0)
    const pending   = bookings.filter(b => b.status === 'PENDING').length
    const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length
    const completed = bookings.filter(b => b.status === 'COMPLETED').length
    const cancelled = bookings.filter(b => b.status === 'CANCELLED').length

    // Por método de pago
    const byMethod = {}
    active.forEach(b => {
      const m = b.paymentMethod || 'EFECTIVO'
      if (!byMethod[m]) byMethod[m] = { count: 0, revenue: 0 }
      byMethod[m].count   += b.seatsBooked ?? 1
      byMethod[m].revenue += b.totalFare ?? 0
    })
    return { totalSeats, totalRevenue, totalDeposits, pending, confirmed, completed, cancelled, byMethod }
  }, [bookings])

  // Filtrado
  const filteredGroups = useMemo(() => {
    return bookingsByAssignment.map(group => ({
      ...group,
      bookings: group.bookings.filter(b => {
        const matchStatus = statusFilter === 'ALL' || b.status === statusFilter
        const q = search.toLowerCase()
        const matchSearch = !q ||
          b.passengerName?.toLowerCase().includes(q) ||
          b.clientCommune?.toLowerCase().includes(q) ||
          String(b.id).includes(q)
        return matchStatus && matchSearch
      }),
    })).filter(g => g.bookings.length > 0)
  }, [bookingsByAssignment, statusFilter, search])

  const changeStatus = async (bookingId, newStatus) => {
    setUpdatingId(bookingId)
    try {
      await api.updatePassengerStatus(bookingId, newStatus)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b))
    } catch (e) {
      alert(e.message || 'Error al actualizar estado')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Selector de evento ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Evento</label>
        {loadingEvents ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Cargando eventos...</div>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-400">No hay eventos creados.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => setSelectedEventId(ev.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  selectedEventId === ev.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className={`font-semibold text-sm truncate ${selectedEventId === ev.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-50'}`}>
                  {ev.title}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(ev.eventDate)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {ev.vehicleCount ?? '?'} vehículo{ev.vehicleCount !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <>
          {/* ── Stats cards ── */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon="🎟️" label="Asientos reservados" value={stats.totalSeats}
                  sub={`${bookings.filter(b => b.status !== 'CANCELLED').length} reserva${bookings.filter(b => b.status !== 'CANCELLED').length !== 1 ? 's' : ''}`} />
                <StatCard icon="💰" label="Ingresos estimados" value={formatCLP(stats.totalRevenue)}
                  sub="Suma tarifas activas" />
                <StatCard icon="💸" label="Abonos recibidos" value={formatCLP(stats.totalDeposits)}
                  sub="50% no-efectivo" />
                <StatCard icon="⏳" label="Estados"
                  value={`${stats.confirmed}✓ ${stats.pending}⌛`}
                  sub={`${stats.completed} completados · ${stats.cancelled} cancelados`} />
              </div>

              {/* Breakdown por método de pago */}
              {Object.keys(stats.byMethod).length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Desglose por método de pago</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.byMethod).map(([method, data]) => (
                      <div key={method} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-lg">{PAYMENT_ICON[method] ?? '💳'}</span>
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{method}</p>
                          <p className="text-xs text-gray-400">{data.count} asiento{data.count !== 1 ? 's' : ''} · {formatCLP(data.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Filtros ── */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar pasajero o comuna…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 w-56"
                  />
                </div>
                <div className="flex gap-1">
                  {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        statusFilter === s
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {s === 'ALL' ? 'Todos' : STATUS_META[s]?.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={loadBookings}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* ── Lista por vehículo ── */}
              {filteredGroups.length === 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Sin reservas{statusFilter !== 'ALL' ? ' con este filtro' : ''}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGroups.map(({ assignment, bookings: grpBookings }) => {
                    const v = assignment?.vehicle
                    const d = assignment?.driver
                    const totalSeatsV = grpBookings.filter(b => b.status !== 'CANCELLED').reduce((s, b) => s + (b.seatsBooked ?? 1), 0)
                    const capacity    = v?.passengerCapacity ?? 0
                    const revenueV    = grpBookings.filter(b => b.status !== 'CANCELLED').reduce((s, b) => s + (b.totalFare ?? 0), 0)
                    const depositsV   = grpBookings.filter(b => b.status !== 'CANCELLED').reduce((s, b) => s + (b.amountPaid ?? 0), 0)

                    return (
                      <div key={assignment?.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Vehicle header */}
                        <div className="flex flex-wrap items-center gap-4 px-5 py-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {v?.imageUrl
                              ? <img src={v.imageUrl} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />
                              : <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">🚌</div>
                            }
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-gray-50 truncate">{v?.brand} {v?.model} {v?.year && `(${v.year})`}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Conductor: <span className="font-medium">{d?.name ?? 'Sin asignar'}</span>
                                {v?.licensePlate && <> · <span className="font-mono">{v.licensePlate}</span></>}
                              </p>
                            </div>
                          </div>
                          {/* Mini stats del vehículo */}
                          <div className="flex gap-4 text-center flex-shrink-0">
                            <div>
                              <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{totalSeatsV}/{capacity}</p>
                              <p className="text-xs text-gray-400">asientos</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCLP(revenueV)}</p>
                              <p className="text-xs text-gray-400">ingresos</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCLP(depositsV)}</p>
                              <p className="text-xs text-gray-400">abonado</p>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar capacidad */}
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full transition-all rounded-full ${totalSeatsV >= capacity ? 'bg-red-500' : totalSeatsV > capacity * 0.7 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${capacity > 0 ? Math.min(100, (totalSeatsV / capacity) * 100) : 0}%` }}
                          />
                        </div>

                        {/* Tabla de reservas */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-gray-800">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide w-16">#</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Pasajero</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden sm:table-cell">Destino</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Asientos</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">Pago</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide hidden md:table-cell">Total / Abono</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Estado</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                              {grpBookings.map(b => (
                                <tr key={b.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${b.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                                  {/* Código */}
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                      #{b.id}
                                    </span>
                                  </td>
                                  {/* Pasajero */}
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-gray-900 dark:text-gray-50 truncate max-w-[140px]">{b.passengerName}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px]">{b.clientCommune}</p>
                                  </td>
                                  {/* Destino (notas) */}
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[160px] line-clamp-2">{b.notes || '—'}</p>
                                  </td>
                                  {/* Asientos */}
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-sm font-bold">
                                      {b.seatsBooked ?? 1}
                                    </span>
                                  </td>
                                  {/* Método de pago */}
                                  <td className="px-4 py-3 hidden md:table-cell">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                                      <span>{PAYMENT_ICON[b.paymentMethod] ?? '💵'}</span>
                                      {b.paymentMethod ?? 'EFECTIVO'}
                                    </span>
                                  </td>
                                  {/* Tarifa */}
                                  <td className="px-4 py-3 text-right hidden md:table-cell">
                                    <p className="font-semibold text-gray-900 dark:text-gray-50">{formatCLP(b.totalFare)}</p>
                                    {b.amountPaid > 0 && (
                                      <p className="text-xs text-amber-600 dark:text-amber-400">Abono: {formatCLP(b.amountPaid)}</p>
                                    )}
                                  </td>
                                  {/* Estado */}
                                  <td className="px-4 py-3 text-center">
                                    <StatusBadge status={b.status} />
                                  </td>
                                  {/* Acciones */}
                                  <td className="px-4 py-3 text-center">
                                    {updatingId === b.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                                    ) : b.status === 'CANCELLED' ? (
                                      <span className="text-xs text-gray-400">—</span>
                                    ) : (
                                      <select
                                        value={b.status}
                                        onChange={e => changeStatus(b.id, e.target.value)}
                                        className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 cursor-pointer"
                                      >
                                        <option value="PENDING">Pendiente</option>
                                        <option value="CONFIRMED">Confirmar</option>
                                        <option value="COMPLETED">Completar</option>
                                        <option value="CANCELLED">Cancelar</option>
                                      </select>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

const TABS = [
  { key: 'events',   label: 'Eventos' },
  { key: 'drivers',  label: 'Conductores' },
  { key: 'vehicles', label: 'Vehículos' },
  { key: 'bookings', label: 'Reservas' },
]

function ShopTransport() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('events')

  // Shared state — vehicles & drivers are needed by EventsTab
  const [vehicles, setVehicles] = useState([])
  const [drivers,  setDrivers]  = useState([])

  // Cargar vehículos y conductores al montar para que EventsTab los tenga disponibles
  useEffect(() => {
    if (!shopId) return
    api.getTransportVehicles(shopId).then(d => setVehicles(d || [])).catch(() => {})
    api.getTransportDrivers(shopId).then(d => setDrivers(d || [])).catch(() => {})
  }, [shopId])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <div className="pt-20 px-4 sm:px-6 pb-12 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/admin/shops/${shopId}`)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              🚌 Transporte
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gestiona eventos, conductores y vehículos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.key
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'events' && (
          <EventsTab shopId={shopId} vehicles={vehicles} drivers={drivers} />
        )}
        {tab === 'drivers' && (
          <DriversTab shopId={shopId} drivers={drivers} setDrivers={setDrivers} />
        )}
        {tab === 'vehicles' && (
          <VehiclesTab shopId={shopId} vehicles={vehicles} setVehicles={setVehicles} drivers={drivers} />
        )}
        {tab === 'bookings' && (
          <BookingsTab shopId={shopId} />
        )}
      </div>
    </div>
  )
}

export default ShopTransport
