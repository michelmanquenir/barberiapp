import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Store,
  ShoppingBag,
  TrendingUp,
  Star,
  User,
  Users,
  ChevronRight,
  CalendarDays,
  Images,
  BarChart2,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import AdminNavbar from '../../components/AdminNavbar'
import AvatarUpload from '../../components/AvatarUpload'

function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [shops, setShops] = useState([])
  const [shopCount, setShopCount] = useState('—')
  const [barberProfile, setBarberProfile] = useState(null)
  const [todayCitas, setTodayCitas] = useState('—')
  const [statsDropdownOpen, setStatsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    api.getMyShops()
      .then(async (data) => {
        setShops(data)
        setShopCount(data.length)
        const today = new Date().toISOString().split('T')[0]
        const results = await Promise.all(
          data.map((shop) => api.getShopAppointments(shop.id).catch(() => []))
        )
        const todayCount = results.flat().filter((a) => a.date === today && a.status !== 'cancelled').length
        setTodayCitas(todayCount)
      })
      .catch(() => setShopCount('—'))

    api.getMyBarberProfile()
      .then((profile) => setBarberProfile(profile))
      .catch(() => setBarberProfile(null))
  }, [])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setStatsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleStatsClick() {
    if (shops.length === 1) {
      navigate(`/admin/shops/${shops[0].id}/stats`)
    } else if (shops.length > 1) {
      setStatsDropdownOpen((v) => !v)
    } else {
      navigate('/admin/shops')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              Bienvenido, {user?.fullName?.split(' ')[0]}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Panel de administración</p>
          </div>

          {barberProfile && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white dark:text-gray-900" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-sm">Mi perfil de profesional</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tu cuenta como profesional en negocios</p>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <AvatarUpload
                    currentUrl={barberProfile.imageUrl}
                    userId={user?.userId}
                    size="sm"
                    name={barberProfile.name}
                    onUploaded={async (url) => {
                      try {
                        const updated = await api.updateBarberImage(url)
                        setBarberProfile((p) => ({ ...p, imageUrl: updated.imageUrl ?? url }))
                      } catch (e) {
                        console.error('Error actualizando imagen del barbero:', e)
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{barberProfile.name}</p>
                    {barberProfile.bio && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{barberProfile.bio}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {barberProfile.rating?.toFixed(1) ?? '5.0'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full font-medium">
                        Perfil activo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Citas pendientes" value="—" color="blue" />
                  <StatCard label="Servicios este mes" value="—" color="purple" />
                  <StatCard label="Clientes únicos" value="—" color="orange" />
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
                  Los negocios donde trabajas pueden verte en su panel. Tu agenda y servicios son visibles para los dueños de los negocios donde estás registrado.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard icon={<Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />} bg="bg-blue-50 dark:bg-blue-950" label="Citas del día" value={todayCitas} onClick={() => navigate('/admin/appointments')} clickable />
              <SummaryCard icon={<Store className="w-6 h-6 text-green-600 dark:text-green-400" />} bg="bg-green-50 dark:bg-green-950" label="Mis negocios" value={shopCount} />
              <SummaryCard icon={<Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />} bg="bg-purple-50 dark:bg-purple-950" label="Profesionales activos" value="—" />
              <SummaryCard icon={<TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />} bg="bg-orange-50 dark:bg-orange-950" label="Ingresos del mes" value="—" />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Gestión de negocios</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <QuickLink icon={<CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />} title="Todas las citas" subtitle="Resumen de todos mis negocios" onClick={() => navigate('/admin/appointments')} highlight />
                <QuickLink icon={<Store className="w-5 h-5 text-gray-600 dark:text-gray-300" />} title="Mis Negocios" subtitle="Gestionar negocios" onClick={() => navigate('/admin/shops')} />
                <QuickLink icon={<Images className="w-5 h-5 text-gray-600 dark:text-gray-300" />} title="Mi Portafolio" subtitle="Galerías de mis trabajos" onClick={() => navigate('/admin/gallery')} />
                <QuickLink icon={<ShoppingBag className="w-5 h-5 text-gray-600 dark:text-gray-300" />} title="Inventario" subtitle="Productos por negocio" onClick={() => navigate('/admin/shops')} />

                {/* Acceso directo a Estadísticas */}
                <div ref={dropdownRef} className="relative">
                  <QuickLink
                    icon={<BarChart2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    title="Estadísticas"
                    subtitle={shops.length > 1 ? 'Seleccionar negocio' : 'Ver reporte del negocio'}
                    onClick={handleStatsClick}
                    highlight={false}
                    trailingIcon={shops.length > 1 ? <ChevronDown className="w-4 h-4 text-gray-400" /> : undefined}
                  />
                  {statsDropdownOpen && shops.length > 1 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {shops.map((shop) => (
                        <button
                          key={shop.id}
                          onClick={() => { setStatsDropdownOpen(false); navigate(`/admin/shops/${shop.id}/stats`) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                            <Store className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{shop.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Ver estadísticas →</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  }
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

function SummaryCard({ icon, bg, label, value, onClick, clickable }) {
  const base = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5'
  const interactive = clickable ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition' : ''
  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {clickable && <p className="text-xs text-blue-500 dark:text-blue-400 mt-1.5 font-medium">Ver detalles →</p>}
    </div>
  )
}

function QuickLink({ icon, title, subtitle, onClick, highlight, trailingIcon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-lg border transition text-left w-full ${
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      <div className="flex-1">
        <p className={`text-sm font-medium ${highlight ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-50'}`}>{title}</p>
        <p className={`text-xs ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{subtitle}</p>
      </div>
      {trailingIcon ?? <ChevronRight className={`w-4 h-4 ${highlight ? 'text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} />}
    </button>
  )
}

export default AdminDashboard
