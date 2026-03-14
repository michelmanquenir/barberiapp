import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Users, Store, ShoppingBag,
  LayoutDashboard, LogOut, Sun, Moon,
  ChevronDown, Menu, X, Tag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { api } from '../../lib/api'

const NAV_ITEMS = [
  { to: '/super-admin',              icon: LayoutDashboard, label: 'Dashboard',   key: 'dashboard'   },
  { to: '/super-admin/users',        icon: Users,           label: 'Usuarios',    key: 'users'       },
  { to: '/super-admin/shops',        icon: Store,           label: 'Negocios',    key: 'shops'       },
  { to: '/super-admin/products',     icon: ShoppingBag,     label: 'Productos',   key: 'products'    },
  { to: '/super-admin/categories',   icon: Tag,             label: 'Categorías',  key: 'categories'  },
]

function SuperAdminLayout({ children }) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen]   = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats]         = useState({ pendingUsers: 0, pendingShops: 0, pendingProducts: 0 })

  useEffect(() => {
    api.superAdmin.getStats().then(setStats).catch(() => {})
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const pending = {
    users:    stats.pendingUsers    ?? 0,
    shops:    stats.pendingShops    ?? 0,
    products: stats.pendingProducts ?? 0,
  }

  const totalPending = pending.users + pending.shops + pending.products

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors flex flex-col">

      {/* ── Top navbar ─────────────────────────────────────────────────────────── */}
      <header className="bg-gray-900 dark:bg-gray-800 text-white fixed w-full z-40 top-0 h-16 flex items-center px-4 gap-3">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <span className="text-lg font-bold hidden sm:block">Super Admin</span>
          {totalPending > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {totalPending}
            </span>
          )}
        </div>

        {/* Right: theme + user */}
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-white/10 transition">
            {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-400" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? 'S'}
                </span>
              </div>
              <span className="text-sm text-gray-200 hidden sm:block">
                {user?.fullName?.split(' ')[0] ?? 'Super Admin'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{user?.fullName ?? 'Admin'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-3 transition mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
        <>
          {/* Overlay mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside className={`
            fixed top-16 left-0 h-[calc(100vh-4rem)] w-60 z-30
            bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
            flex flex-col transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
          `}>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(({ to, icon: Icon, label, key }) => {
                const isActive = location.pathname === to || (to !== '/super-admin' && location.pathname.startsWith(to))
                const badge = pending[key] ?? 0
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </>

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <main className="flex-1 lg:ml-60 min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default SuperAdminLayout
