import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, MapPin, Loader2, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { Autocomplete } from '@react-google-maps/api'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import AvatarUpload from '../components/AvatarUpload'
import DniUpload from '../components/DniUpload'

function EditProfile() {
  const { user, login, updateUser } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    birthdate: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [dniUrl, setDniUrl] = useState(null)

  const autocompleteRef = useRef(null)
  const addressInputRef = useRef(null)

  // Cargar datos reales del perfil al montar
  useEffect(() => {
    if (!user?.userId) return
    setLoading(true)
    api
      .getProfile(user.userId)
      .then((profile) => {
        setForm({
          fullName: profile.fullName || user.fullName || '',
          phone: profile.phone || '',
          address: profile.address || '',
          birthdate: profile.birthdate ? profile.birthdate.substring(0, 10) : '',
        })
        setAvatarUrl(profile.avatarUrl || null)
        setDniUrl(profile.dniUrl || null)
        // Sincronizar input uncontrolled con el valor cargado
        if (addressInputRef.current && profile.address) {
          addressInputRef.current.value = profile.address
        }
      })
      .catch(() => {
        // Si no hay perfil, usar datos del auth
        setForm((f) => ({ ...f, fullName: user.fullName || '' }))
      })
      .finally(() => setLoading(false))
  }, [user])

  // Cargar ref del autocomplete y sincronizar dirección si ya existe
  const onAutocompleteLoad = useCallback(
    (ref) => {
      autocompleteRef.current = ref
      if (addressInputRef.current && form.address) {
        addressInputRef.current.value = form.address
      }
    },
    [form.address]
  )

  // Cuando el usuario selecciona una sugerencia de Places
  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.formatted_address) return
    const address = place.formatted_address
    setForm((f) => ({ ...f, address }))
    if (addressInputRef.current) {
      addressInputRef.current.value = address
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    // Capturar dirección del input (puede haberse editado manualmente)
    const currentAddress = addressInputRef.current?.value ?? form.address

    try {
      const updated = await api.updateProfile(user.userId, {
        ...form,
        address: currentAddress,
      })

      // Actualizar nombre en el contexto global si cambió
      if (updated?.fullName && updated.fullName !== user.fullName) {
        updateUser({ fullName: updated.fullName })
      }

      setStatus('success')
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-8">Editar Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Feedback de guardado */}
        {status === 'success' && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Perfil actualizado correctamente
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Card de datos personales */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          {/* Avatar con upload */}
          <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <AvatarUpload
              currentUrl={avatarUrl}
              userId={user?.userId}
              size="md"
              name={form.fullName || user?.fullName || ''}
              onUploaded={async (url) => {
                setAvatarUrl(url)
                updateUser({ avatarUrl: url })
                try {
                  await api.updateProfile(user.userId, { ...form, avatarUrl: url })
                } catch (e) {
                  console.error('Error guardando avatar:', e)
                }
              }}
            />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mt-3">{user?.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Nombre completo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Tu nombre completo"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+56 9 1234 5678"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Dirección con Google Places Autocomplete */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Dirección
                <span className="text-gray-500 dark:text-gray-400 font-normal"> — escribe para buscar</span>
              </label>
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <input
                    ref={addressInputRef}
                    type="text"
                    defaultValue={form.address}
                    placeholder="Escribe tu dirección..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </Autocomplete>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Al seleccionar una sugerencia se completará automáticamente
              </p>
            </div>
          </div>
        </div>

        {/* Card de verificación de identidad (DNI) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Verificación de identidad
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Sube una foto de tu documento de identidad (DNI, RUT, pasaporte) o un PDF.
            Esta información es privada y solo será visible para los administradores.
          </p>
          <DniUpload
            currentUrl={dniUrl}
            userId={user?.userId}
            onUploaded={async (url) => {
              setDniUrl(url)
              try {
                await api.updateProfile(user.userId, { ...form, dniUrl: url })
              } catch (e) {
                console.error('Error guardando DNI:', e)
              }
            }}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditProfile
