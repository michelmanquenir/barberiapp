import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Store, CalendarDays,
  Compass, Calendar, Wallet, Heart,
  Shield, LogOut, User, Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Dropdown de usuario unificado — muestra el menú completo
 * independientemente del navbar que lo use.
 */
function UserDropdown({ onClose, onLogout }) {
  const { user, isSuperAdmin, isBusinessOwner } = useAuth()

  const item = (to, icon, label) => (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
    >
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{icon}</span>
      {label}
    </Link>
  )

  const section = (label) => (
    <div className="px-4 pt-3 pb-1 border-t border-gray-100 dark:border-gray-800 mt-1">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  )

  return (
    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20 text-gray-900 dark:text-gray-50">

      {/* Perfil */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{user?.fullName ?? 'Usuario'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
      </div>

      {/* Cuenta personal */}
      {item('/profile',      <User className="w-4 h-4" />,     'Mi perfil')}
      {item('/edit-profile', <Settings className="w-4 h-4" />, 'Configuración')}

      {/* WeServ (admin de negocio) */}
      {(isBusinessOwner || isSuperAdmin) && (
        <>
          {section('WeServ')}
          {item('/admin',              <LayoutDashboard className="w-4 h-4" />, 'Dashboard')}
          {item('/admin/shops',        <Store className="w-4 h-4" />,           'Mis Negocios')}
          {item('/admin/appointments', <CalendarDays className="w-4 h-4" />,    'Todas las citas')}
        </>
      )}

      {/* Modo cliente */}
      {section('Modo Cliente')}
      {item('/booking',     <Compass className="w-4 h-4" />,  'Explorar negocios')}
      {item('/appointments',<Calendar className="w-4 h-4" />, 'Mis citas')}
      {item('/my-barbers',  <Store className="w-4 h-4" />,    'Mis profesionales')}
      {item('/wallet',      <Wallet className="w-4 h-4" />,   'Wallet')}
      {item('/favorites',   <Heart className="w-4 h-4" />,    'Favoritos')}

      {/* Super Admin */}
      {isSuperAdmin && (
        <>
          {section('Super Admin')}
          {item('/super-admin', <Shield className="w-4 h-4" />, 'Panel Super Admin')}
        </>
      )}

      {/* Logout */}
      <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-3 transition"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default UserDropdown
