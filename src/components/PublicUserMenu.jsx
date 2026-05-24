import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut, Settings, Heart, Calendar, Compass, Wallet, Briefcase, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Avatar({ avatarUrl, fullName, size = 8 }) {
  const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || 'U'
  const cls = `w-${size} h-${size}`
  if (avatarUrl) {
    return <img src={avatarUrl} alt={fullName ?? 'Avatar'} className={`${cls} rounded-full object-cover`} />
  }
  return (
    <div className={`${cls} rounded-full bg-white/20 flex items-center justify-center`}>
      <span className="text-sm font-semibold text-white select-none">{initial}</span>
    </div>
  )
}

/**
 * Menú de usuario compacto para páginas públicas (/book, /shop, /transport).
 * Si el usuario está autenticado muestra avatar + dropdown; si no, muestra "Iniciar sesión".
 *
 * @param {Object}  props
 * @param {string}  [props.loginRedirect] - Ruta a la que volver después de login
 * @param {boolean} [props.dark=true]     - Si true, usa estilos claros (para header oscuro)
 */
export default function PublicUserMenu({ loginRedirect, dark = true }) {
  const [open, setOpen] = useState(false)
  const { user, isAuthenticated, logout, isBusinessOwner } = useAuth()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login', { state: { from: loginRedirect } })}
        className={`flex items-center gap-1.5 text-sm transition ${
          dark ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
        }`}
      >
        <LogIn className="w-4 h-4" />
        Iniciar sesión
      </button>
    )
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const menuItems = [
    { to: '/booking',      icon: Compass,   label: 'Explorar' },
    { to: '/profile',      icon: User,      label: 'Mi Perfil' },
    { to: '/appointments', icon: Calendar,  label: 'Mis Citas' },
    { to: '/favorites',    icon: Heart,     label: 'Favoritos' },
    { to: '/my-visits',    icon: Briefcase, label: 'Mis Visitas' },
    { to: '/wallet',       icon: Wallet,    label: 'Wallet' },
    { to: '/edit-profile', icon: Settings,  label: 'Configuración' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 p-1 rounded-lg transition ${
          dark ? 'hover:bg-white/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <Avatar avatarUrl={user?.avatarUrl} fullName={user?.fullName} />
        <span className={`hidden sm:block text-sm font-medium ${
          dark ? 'text-gray-200' : 'text-gray-700 dark:text-gray-200'
        }`}>
          {user?.fullName?.split(' ')[0] ?? 'Mi Cuenta'}
        </span>
      </button>

      {open && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-40">
            {/* Info del usuario */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{user?.fullName ?? 'Usuario'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>

            {/* Links */}
            {menuItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}

            {isBusinessOwner && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3"
              >
                <Compass className="h-4 w-4" />
                Panel WeServ
              </Link>
            )}

            {/* Cerrar sesión */}
            <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-3"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
