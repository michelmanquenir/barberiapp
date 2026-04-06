import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Store, ChevronRight, CalendarDays, Clock, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AdminNavbar from '../../components/AdminNavbar'

function MyShops() {
  const navigate = useNavigate()
  const { isPending, isRejected } = useAuth()
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
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Negocios</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tus negocios y locales</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/admin/appointments')}
                className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium"
              >
                <CalendarDays className="w-4 h-4" />
                Todas las citas
              </button>
              <button
                onClick={() => !isPending && !isRejected && navigate('/admin/shops/new')}
                disabled={isPending || isRejected}
                title={isPending ? 'Tu cuenta está pendiente de aprobación' : isRejected ? 'Tu cuenta fue rechazada' : undefined}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isPending || isRejected
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                Crear negocio
              </button>
            </div>
          </div>

          {/* Banner cuenta pendiente */}
          {isPending && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg p-4 text-sm mb-6">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cuenta pendiente de aprobación</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                  Un administrador debe aprobar tu cuenta antes de que puedas crear negocios. Te avisaremos cuando esté lista.
                </p>
              </div>
            </div>
          )}

          {/* Banner cuenta rechazada */}
          {isRejected && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg p-4 text-sm mb-6">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cuenta rechazada</p>
                <p className="mt-0.5 text-red-700 dark:text-red-400">
                  Tu cuenta fue rechazada. No puedes crear negocios. Contacta al administrador para más información.
                </p>
              </div>
            </div>
          )}

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
          {!loading && !error && shops.length === 0 && !isPending && !isRejected && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <Store className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Aún no tienes negocios
              </h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
                Crea tu primer negocio y comienza a agendar citas
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
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Store className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-lg truncate">{shop.name}</h3>
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
                            {shop.barbers?.length ?? 0} profesional
                            {(shop.barbers?.length ?? 0) !== 1 ? 'es' : ''}
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
