import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, Eye, EyeOff, User, Briefcase } from 'lucide-react'
import { api } from '../lib/api'

// ─── Helpers de RUT chileno ───────────────────────────────────────────────────

/** Formatea un RUT mientras el usuario escribe → "12.345.678-9" */
function formatRut(value) {
  // Limpiar todo excepto dígitos y K
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length === 0) return ''
  if (clean.length === 1) return clean

  const body = clean.slice(0, -1)   // dígitos del cuerpo
  const dv   = clean.slice(-1)      // dígito verificador

  // Agregar puntos al cuerpo (de derecha a izquierda cada 3 dígitos)
  const bodyFormatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${bodyFormatted}-${dv}`
}

/** Valida RUT chileno con algoritmo módulo 11 */
function validateRut(rut) {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return false

  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)

  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  const expected  = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  return dv === expected
}

// ─── Componente ───────────────────────────────────────────────────────────────

function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    rut:      '',
    email:    '',
    password: '',
    role:     'CLIENT',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  /** Maneja el input del RUT con auto-formato */
  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value)
    setForm(f => ({ ...f, rut: formatted }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (!form.rut.trim()) {
      setError('El RUT es requerido')
      return
    }
    if (!validateRut(form.rut)) {
      setError('El RUT ingresado no es válido')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.register(form)
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      // api.js ya extrae body.message del backend, así que el mensaje llega directo
      setError(err.message || 'Error al registrar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-8 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">WeServ</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Crea tu cuenta</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Selector de rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                ¿Cómo quieres registrarte?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'CLIENT' })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition cursor-pointer ${
                    form.role === 'CLIENT'
                      ? 'border-gray-900 bg-gray-50 dark:bg-gray-800 dark:border-gray-100'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <User className={`w-6 h-6 ${form.role === 'CLIENT' ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className={`text-sm font-medium ${form.role === 'CLIENT' ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'}`}>
                    Soy Cliente
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'BUSINESS_OWNER' })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition cursor-pointer ${
                    form.role === 'BUSINESS_OWNER'
                      ? 'border-gray-900 bg-gray-50 dark:bg-gray-800 dark:border-gray-100'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Briefcase className={`w-6 h-6 ${form.role === 'BUSINESS_OWNER' ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className={`text-sm font-medium ${form.role === 'BUSINESS_OWNER' ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'}`}>
                    Soy Propietario
                  </span>
                </button>
              </div>
            </div>

            {/* Nombre completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                placeholder="Juan Pérez"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition dark:bg-gray-800"
              />
            </div>

            {/* RUT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                RUT <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="rut"
                value={form.rut}
                onChange={handleRutChange}
                required
                placeholder="12.345.678-9"
                maxLength={12}
                className={`w-full px-4 py-2.5 rounded-lg border text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition dark:bg-gray-800 ${
                  form.rut && !validateRut(form.rut)
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
                    : form.rut && validateRut(form.rut)
                      ? 'border-green-500 dark:border-green-400 focus:ring-green-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-gray-900'
                }`}
              />
              {form.rut && !validateRut(form.rut) && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">RUT inválido</p>
              )}
              {form.rut && validateRut(form.rut) && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ RUT válido</p>
              )}
            </div>

            {/* Correo electrónico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition dark:bg-gray-800"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-gray-900 dark:text-gray-50 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
