import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Store, MapPin, Home, Tag, Landmark } from 'lucide-react'
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AdminNavbar from '../../components/AdminNavbar'

const DEFAULT_CENTER = { lat: -33.4489, lng: -70.6693 } // Santiago
const MAP_STYLES = { height: '100%', width: '100%' }
const MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function CreateShop() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { shopId } = useParams()
  const isEdit = Boolean(shopId)

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    address: '',
    latitude: null,
    longitude: null,
    homeServiceEnabled: false,
    pricePerKm: '',
    categoryId: '',
    transferBankName: '',
    transferAccountHolder: '',
    transferAccountNumber: '',
    transferAlias: '',
    transferInstructions: '',
  })
  const [categories, setCategories] = useState([])
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingShop, setLoadingShop] = useState(isEdit)
  const [error, setError] = useState(null)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [markerPos, setMarkerPos] = useState(null)

  const mapRef = useRef(null)
  const autocompleteRef = useRef(null)
  const addressInputRef = useRef(null)

  // Cargar categorías activas
  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  // Cargar datos del shop en modo edición
  useEffect(() => {
    if (!isEdit) return
    setLoadingShop(true)
    api
      .getShopById(shopId)
      .then((shop) => {
        setForm({
          name: shop.name || '',
          description: shop.description || '',
          slug: shop.slug || '',
          address: shop.address || '',
          latitude: shop.latitude ?? null,
          longitude: shop.longitude ?? null,
          homeServiceEnabled: shop.homeServiceEnabled ?? false,
          pricePerKm: shop.pricePerKm != null ? String(shop.pricePerKm) : '',
          categoryId: shop.categoryId || '',
          transferBankName: shop.transferBankName || '',
          transferAccountHolder: shop.transferAccountHolder || '',
          transferAccountNumber: shop.transferAccountNumber || '',
          transferAlias: shop.transferAlias || '',
          transferInstructions: shop.transferInstructions || '',
        })
        setSlugEdited(true)
        if (shop.latitude && shop.longitude) {
          const pos = { lat: shop.latitude, lng: shop.longitude }
          setMapCenter(pos)
          setMarkerPos(pos)
        }
        // Sincronizar el valor del input de dirección (es uncontrolled por Autocomplete)
        if (addressInputRef.current && shop.address) {
          addressInputRef.current.value = shop.address
        }
      })
      .catch(() => setError('No se pudo cargar la información del negocio'))
      .finally(() => setLoadingShop(false))
  }, [isEdit, shopId])

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  // Click en el mapa → poner pin
  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarkerPos({ lat, lng })
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
  }, [])

  // Arrastrar el marker
  const onMarkerDragEnd = useCallback((e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarkerPos({ lat, lng })
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
  }, [])

  // Seleccionar dirección del autocomplete
  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return

    const address = place.formatted_address || place.name || ''
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()

    // Actualizar estado
    setForm((f) => ({ ...f, address, latitude: lat, longitude: lng }))
    setMarkerPos({ lat, lng })
    setMapCenter({ lat, lng })

    // Mover el mapa al lugar seleccionado
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng })
      mapRef.current.setZoom(17)
    }
  }, [])

  const handleNameChange = (e) => {
    const name = e.target.value
    setForm((f) => ({
      ...f,
      name,
      slug: slugEdited ? f.slug : slugify(name),
    }))
  }

  const handleSlugChange = (e) => {
    setSlugEdited(true)
    setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.slug.trim()) {
      setError('El nombre y el slug son requeridos')
      return
    }
    // Capturar la dirección del input (puede haber sido editada manualmente)
    if (addressInputRef.current) {
      setForm((f) => ({ ...f, address: addressInputRef.current.value }))
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        address: addressInputRef.current?.value ?? form.address,
        pricePerKm: form.homeServiceEnabled ? (parseInt(form.pricePerKm, 10) || 0) : 0,
      }
      if (isEdit) {
        await api.updateShop(shopId, payload)
      } else {
        await api.createShop(payload)
      }
      navigate('/admin/shops')
    } catch (err) {
      // Mostrar el mensaje exacto del backend (incluye errores de validación de negocio/cuenta)
      setError(err.message || (isEdit ? 'Error al actualizar el negocio.' : 'Error al crear el negocio.'))
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-xl mx-auto px-6 py-8">
          {/* Back */}
          <button
            onClick={() => navigate(isEdit ? `/admin/shops/${shopId}` : '/admin/shops')}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEdit ? 'Volver al negocio' : 'Mis negocios'}
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-gray-900 dark:bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-white dark:text-gray-900" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {isEdit ? 'Editar negocio' : 'Crear negocio'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {isEdit
                ? 'Modifica la información de tu negocio'
                : 'Configura tu negocio y obtén un enlace público para recibir reservas'}
            </p>
          </div>

          {loadingShop && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
            </div>
          )}

          {!loadingShop && (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Nombre del negocio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="Mi Negocio"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Descripción
                  <span className="text-gray-400 dark:text-gray-500 font-normal"> (opcional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descripción de tu negocio..."
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none"
                />
              </div>

              {/* Categoría */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      Tipo de negocio
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, categoryId: f.categoryId === cat.id ? '' : cat.id }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                          form.categoryId === cat.id
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dirección con Google Places Autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Dirección
                  <span className="text-gray-400 dark:text-gray-500 font-normal"> — escribe para buscar</span>
                </label>
                <Autocomplete
                  onLoad={(ref) => (autocompleteRef.current = ref)}
                  onPlaceChanged={onPlaceChanged}
                >
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                    <input
                      ref={addressInputRef}
                      type="text"
                      defaultValue={form.address}
                      placeholder="Escribe la dirección de tu negocio..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                    />
                  </div>
                </Autocomplete>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Al seleccionar una sugerencia, el mapa se moverá automáticamente
                </p>
              </div>

              {/* Google Map */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Ubicación en el mapa
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    {' '}(click para marcar · arrastra el pin para ajustar)
                  </span>
                </label>
                <div className="h-64 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  <GoogleMap
                    mapContainerStyle={MAP_STYLES}
                    center={mapCenter}
                    zoom={markerPos ? 16 : 13}
                    options={MAP_OPTIONS}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                  >
                    {markerPos && (
                      <Marker
                        position={markerPos}
                        draggable
                        onDragEnd={onMarkerDragEnd}
                      />
                    )}
                  </GoogleMap>
                </div>
                {form.latitude && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    📍 {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Servicio a domicilio */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Servicio a domicilio</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, homeServiceEnabled: !f.homeServiceEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.homeServiceEnabled ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                        form.homeServiceEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Permite que los clientes soliciten un profesional en su domicilio. El tiempo de bloqueo será de 3 horas por cita.
                </p>
                {form.homeServiceEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Precio por km (CLP) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={form.pricePerKm}
                        onChange={(e) => setForm((f) => ({ ...f, pricePerKm: e.target.value }))}
                        placeholder="ej: 500"
                        className="w-40 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">× distancia (ida y vuelta) = recargo total</span>
                    </div>
                    {form.pricePerKm > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Ej: 10 km → recargo $ {(Number(form.pricePerKm) * 10 * 2).toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Slug / URL pública */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  URL pública <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 dark:focus-within:ring-gray-100 focus-within:border-transparent">
                  <span className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 select-none whitespace-nowrap">
                    /book/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={handleSlugChange}
                    placeholder="mi-barberia"
                    className="flex-1 px-3 py-2.5 text-sm font-mono bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none"
                    required
                  />
                </div>
                {form.slug && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                    Enlace público:{' '}
                    <span className="text-gray-600 dark:text-gray-300 font-medium">tudominio.com/book/{form.slug}</span>
                  </p>
                )}
              </div>

              {/* Datos de transferencia bancaria */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Datos bancarios para transferencias</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Si aceptás pagos por transferencia, completá estos datos. Se mostrarán al cliente cuando seleccione esa opción.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Banco</label>
                  <input
                    type="text"
                    value={form.transferBankName}
                    onChange={(e) => setForm((f) => ({ ...f, transferBankName: e.target.value }))}
                    placeholder="ej: Banco Nación, BBVA, Santander..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Titular de la cuenta</label>
                  <input
                    type="text"
                    value={form.transferAccountHolder}
                    onChange={(e) => setForm((f) => ({ ...f, transferAccountHolder: e.target.value }))}
                    placeholder="Nombre completo o razón social"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">CBU / CVU / CLABE</label>
                    <input
                      type="text"
                      value={form.transferAccountNumber}
                      onChange={(e) => setForm((f) => ({ ...f, transferAccountNumber: e.target.value }))}
                      placeholder="Número de cuenta"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Alias <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input
                      type="text"
                      value={form.transferAlias}
                      onChange={(e) => setForm((f) => ({ ...f, transferAlias: e.target.value }))}
                      placeholder="mi.alias.mp"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Instrucciones adicionales <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <textarea
                    value={form.transferInstructions}
                    onChange={(e) => setForm((f) => ({ ...f, transferInstructions: e.target.value }))}
                    placeholder="ej: Indicar nombre completo en el concepto"
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(isEdit ? `/admin/shops/${shopId}` : '/admin/shops')}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (isEdit ? 'Guardando...' : 'Creando...')
                    : (isEdit ? 'Guardar cambios' : 'Crear negocio')}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

export default CreateShop
