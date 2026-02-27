import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, ArrowLeft, LogOut, Store } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

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
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', description: '', slug: '' })
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    setLoading(true)
    setError(null)
    try {
      await api.createShop(form)
      navigate('/admin/shops')
    } catch (err) {
      setError(
        err.message?.includes('400')
          ? 'El slug ya está en uso. Elige otro nombre o modifica el slug.'
          : 'Error al crear el negocio. Intenta nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gray-900 text-white fixed w-full z-30 top-0">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="w-6 h-6" />
            <span className="text-xl font-bold">BarberShop Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user?.fullName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <div className="max-w-xl mx-auto px-6 py-8">
          {/* Back */}
          <button
            onClick={() => navigate('/admin/shops')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Mis negocios
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Crear negocio</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Configura tu barbería y obtén un enlace público para recibir reservas
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre del negocio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleNameChange}
                placeholder="Mi Barbería"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descripción
                <span className="text-gray-400 font-normal"> (opcional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descripción de tu negocio..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URL pública <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent">
                <span className="bg-gray-50 border-r border-gray-300 px-3 py-2.5 text-sm text-gray-400 select-none whitespace-nowrap">
                  /book/
                </span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={handleSlugChange}
                  placeholder="mi-barberia"
                  className="flex-1 px-3 py-2.5 text-sm font-mono focus:outline-none"
                  required
                />
              </div>
              {form.slug && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Tu enlace: <span className="text-gray-600 font-medium">tudominio.com/book/{form.slug}</span>
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin/shops')}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear negocio'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default CreateShop
