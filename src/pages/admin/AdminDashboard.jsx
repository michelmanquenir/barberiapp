import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Calendar, Store, ShoppingBag, TrendingUp, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [shopCount, setShopCount] = useState('—')

  useEffect(() => {
    api
      .getMyShops()
      .then((shops) => setShopCount(shops.length))
      .catch(() => setShopCount('—'))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const cards = [
    {
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-50',
      label: 'Citas del día',
      value: '—',
    },
    {
      icon: <Store className="w-6 h-6 text-green-600" />,
      bg: 'bg-green-50',
      label: 'Mis negocios',
      value: shopCount,
    },
    {
      icon: <Scissors className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-50',
      label: 'Barberos activos',
      value: '—',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-orange-600" />,
      bg: 'bg-orange-50',
      label: 'Ingresos del mes',
      value: '—',
    },
  ]

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

      {/* Contenido */}
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Bienvenida */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Bienvenido, {user?.fullName?.split(' ')[0]}
            </h2>
            <p className="text-gray-500 mt-1">Panel de administración de tu barbería</p>
          </div>

          {/* Cards de resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                  {card.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestión</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
                onClick={() => navigate('/appointments')}
              >
                <Calendar className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Citas</p>
                  <p className="text-xs text-gray-500">Ver todas las citas</p>
                </div>
              </button>

              <button
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
                onClick={() => navigate('/admin/shops')}
              >
                <Store className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Mis Negocios</p>
                  <p className="text-xs text-gray-500">Gestionar barberías</p>
                </div>
              </button>

              <button className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Productos</p>
                  <p className="text-xs text-gray-500">Gestionar inventario</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
