import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  Calendar,
  Store,
  ShoppingBag,
  TrendingUp,
  LogOut,
  Star,
  User,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [shopCount, setShopCount] = useState('—')
  const [barberProfile, setBarberProfile] = useState(null)
  const [barberShops, setBarberShops] = useState([]) // shops donde trabaja como barbero

  useEffect(() => {
    // Mis negocios (como dueño)
    api.getMyShops()
      .then((shops) => setShopCount(shops.length))
      .catch(() => setShopCount('—'))

    // Mi perfil de barbero (vinculado al login)
    api.getMyBarberProfile()
      .then((profile) => {
        setBarberProfile(profile)
      })
      .catch(() => {
        // 404 si aún no tiene perfil — no es error
        setBarberProfile(null)
      })
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Admin */}
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
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

          {/* Bienvenida */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Bienvenido, {user?.fullName?.split(' ')[0]}
            </h2>
            <p className="text-gray-500 mt-1">Panel de administración</p>
          </div>

          {/* ── MI PERFIL DE BARBERO ─────────────────────────────── */}
          {barberProfile && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Mi perfil de barbero</h3>
                  <p className="text-xs text-gray-500">Tu cuenta como empleado en barberías</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  {/* Avatar */}
                  {barberProfile.imageUrl ? (
                    <img
                      src={barberProfile.imageUrl}
                      alt={barberProfile.name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-7 h-7 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="text-lg font-bold text-gray-900">{barberProfile.name}</p>
                    {barberProfile.bio && (
                      <p className="text-sm text-gray-500 mt-0.5">{barberProfile.bio}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700">
                          {barberProfile.rating?.toFixed(1) ?? '5.0'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        Perfil activo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats del barbero */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Citas pendientes" value="—" color="blue" />
                  <StatCard label="Cortes este mes" value="—" color="purple" />
                  <StatCard label="Clientes únicos" value="—" color="orange" />
                </div>

                <p className="text-xs text-gray-400 mt-3 text-center">
                  Las barberías donde trabajas pueden verte en su panel. Tu agenda y cortes son visibles para los dueños de los negocios donde estás registrado.
                </p>
              </div>
            </div>
          )}

          {/* ── MIS NEGOCIOS (como dueño) ─────────────────────────── */}
          <div>
            {/* Cards de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                icon={<Calendar className="w-6 h-6 text-blue-600" />}
                bg="bg-blue-50"
                label="Citas del día"
                value="—"
              />
              <SummaryCard
                icon={<Store className="w-6 h-6 text-green-600" />}
                bg="bg-green-50"
                label="Mis negocios"
                value={shopCount}
              />
              <SummaryCard
                icon={<Scissors className="w-6 h-6 text-purple-600" />}
                bg="bg-purple-50"
                label="Barberos activos"
                value="—"
              />
              <SummaryCard
                icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
                bg="bg-orange-50"
                label="Ingresos del mes"
                value="—"
              />
            </div>

            {/* Accesos rápidos */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestión de negocios</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <QuickLink
                  icon={<Calendar className="w-5 h-5 text-gray-600" />}
                  title="Citas"
                  subtitle="Ver todas las citas"
                  onClick={() => navigate('/appointments')}
                />
                <QuickLink
                  icon={<Store className="w-5 h-5 text-gray-600" />}
                  title="Mis Negocios"
                  subtitle="Gestionar barberías"
                  onClick={() => navigate('/admin/shops')}
                />
                <QuickLink
                  icon={<ShoppingBag className="w-5 h-5 text-gray-600" />}
                  title="Productos"
                  subtitle="Gestionar inventario"
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  }
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

function SummaryCard({ icon, bg, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function QuickLink({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left w-full"
    >
      {icon}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  )
}

export default AdminDashboard
