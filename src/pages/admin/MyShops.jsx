import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Plus, Store, ChevronRight, CalendarDays } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AdminNavbar from '../../components/AdminNavbar'

function MyShops() {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Negocios</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tus barberías y salones</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/appointments')}
                className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium"
              >
                <CalendarDays className="w-4 h-4" />
                Todas las citas
              </button>
              <button
                onClick={() => navigate('/admin/shops/new')}
                className="flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Crear negocio
              </button>
            </div>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {/* Lista de negocios */}
          {!loading && !error && shops.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <Store className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Aún no tienes negocios
              </h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
                Crea tu primera barbería y comienza a agendar citas
              </p>
              <button
                onClick={() => navigate('/admin/shops/new')}
                className="inline-flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition text-sm font-medium"
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
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition cursor-pointer"
                  onClick={() => navigate(`/admin/shops/${shop.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                        <Scissors className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-lg">{shop.name}</h3>
                        {shop.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {shop.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            slug: <span className="font-mono text-gray-600 dark:text-gray-300">{shop.slug}</span>
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              shop.active
                                ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {shop.active ? 'Activo' : 'Inactivo'}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {shop.barbers?.length ?? 0} barbero
                            {(shop.barbers?.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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
