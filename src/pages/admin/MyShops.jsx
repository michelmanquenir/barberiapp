import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Plus, Store, ArrowRight, LogOut, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function MyShops() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .getMyShops()
      .then((data) => setShops(data))
      .catch(() => setError('No se pudieron cargar los negocios'))
      .finally(() => setLoading(false))
  }, [])

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
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-gray-300 hover:text-white transition"
            >
              Dashboard
            </button>
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
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mis Negocios</h2>
              <p className="text-gray-500 mt-1">Gestiona tus barberías y salones</p>
            </div>
            <button
              onClick={() => navigate('/admin/shops/new')}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear negocio
            </button>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {/* Lista de negocios */}
          {!loading && !error && shops.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Aún no tienes negocios
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Crea tu primera barbería y comienza a agendar citas
              </p>
              <button
                onClick={() => navigate('/admin/shops/new')}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Crear mi primer negocio
              </button>
            </div>
          )}

          {!loading && !error && shops.length > 0 && (
            <div className="grid gap-4">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition cursor-pointer"
                  onClick={() => navigate(`/admin/shops/${shop.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Scissors className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{shop.name}</h3>
                        {shop.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {shop.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400">
                            slug: <span className="font-mono text-gray-600">{shop.slug}</span>
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              shop.active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {shop.active ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {shop.barbers?.length ?? 0} barbero
                            {(shop.barbers?.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MyShops
