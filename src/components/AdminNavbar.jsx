import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Scissors,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Store,
  CalendarDays,
  Compass,
  Calendar,
  Wallet,
  Heart,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function NavAvatar({ avatarUrl, fullName, size = 8 }) {
  const initials = fullName?.trim()
    ? fullName.trim().charAt(0).toUpperCase()
    : 'A'
  const sizeClass = `w-${size} h-${size}`
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName ?? 'Avatar'}
        className={`${sizeClass} rounded-full object-cover`}
      />
    )
  }
  return (
    <div className={`${sizeClass} rounded-full bg-white/20 flex items-center justify-center`}>
      <span className="text-sm font-semibold text-white select-none">{initials}</span>
    </div>
  )
}

function AdminNavbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const close = () => setMenuOpen(false)

  return (
    <nav className="bg-gray-900 dark:bg-gray-800 text-white fixed w-full z-30 top-0 transition-colors">
      <div className="px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <Scissors className="w-6 h-6" />
          <span className="text-xl font-bold">Mi Panel</span>
        </div>

        {/* Toggle + Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-400" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <NavAvatar avatarUrl={user?.avatarUrl} fullName={user?.fullName} />
              <span className="text-sm text-gray-200 hidden sm:block">
                {user?.fullName?.split(' ')[0] ?? 'Admin'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={close} />

                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20 text-gray-900 dark:text-gray-50">

                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{user?.fullName ?? 'Admin'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>

                  <div className="px-4 pt-2 pb-1">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Mi Panel</p>
                  </div>
                  <NavItem to="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" onClick={close} />
                  <NavItem to="/admin/shops" icon={<Store className="w-4 h-4" />} label="Mis Negocios" onClick={close} />
                  <NavItem to="/admin/appointments" icon={<CalendarDays className="w-4 h-4" />} label="Todas las citas" onClick={close} />

                  <div className="px-4 pt-3 pb-1 border-t border-gray-100 dark:border-gray-800 mt-1">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Modo Cliente</p>
                  </div>
                  <NavItem to="/booking" icon={<Compass className="w-4 h-4" />} label="Explorar negocios" onClick={close} />
                  <NavItem to="/appointments" icon={<Calendar className="w-4 h-4" />} label="Mis citas" onClick={close} />
                  <NavItem to="/my-barbers" icon={<Store className="w-4 h-4" />} label="Mis profesionales" onClick={close} />
                  <NavItem to="/wallet" icon={<Wallet className="w-4 h-4" />} label="Wallet" onClick={close} />
                  <NavItem to="/favorites" icon={<Heart className="w-4 h-4" />} label="Favoritos" onClick={close} />

                  <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-3 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesi&oacute;n
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavItem({ to, icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
    >
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      {label}
    </Link>
  )
}

export default AdminNavbar
