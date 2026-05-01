import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Store,
  Sun,
  Moon,
  Bell,
  CalendarCheck,
  ShoppingBag,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import UserDropdown from './UserDropdown'

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

const STATUS_LABEL = {
  pending:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  ready:     { label: 'Listo',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
}

function AdminNavbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]       = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const [notifData, setNotifData]     = useState({ appointments: [], orders: [] })
  const [notifLoaded, setNotifLoaded] = useState(false)
  const notifRef = useRef(null)

  // Fetch notifications on mount
  useEffect(() => {
    const load = async () => {
      try {
        const shops = await api.getMyShops()
        const today = new Date().toISOString().split('T')[0]

        const results = await Promise.all(
          shops.map(async (shop) => {
            const [appointments, orders] = await Promise.all([
              api.getShopAppointments(shop.id).catch(() => []),
              api.getShopOrders(shop.id).catch(() => []),
            ])
            return { shop, appointments, orders }
          })
        )

        const notifAppts  = []
        const notifOrders = []

        for (const { shop, appointments, orders } of results) {
          appointments
            .filter(a => a.date === today && ['pending', 'confirmed'].includes(a.status))
            .forEach(a => notifAppts.push({ ...a, shopName: shop.name, shopId: shop.id }))

          orders
            .filter(o => ['pending', 'confirmed', 'ready'].includes(o.status))
            .forEach(o => notifOrders.push({ ...o, shopName: shop.name, shopId: shop.id }))
        }

        setNotifData({ appointments: notifAppts, orders: notifOrders })
      } catch {
        // silently ignore
      } finally {
        setNotifLoaded(true)
      }
    }
    load()
  }, [])

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const close = () => setMenuOpen(false)

  const totalPending = notifData.appointments.length + notifData.orders.length

  return (
    <nav className="bg-gray-900 dark:bg-gray-800 text-white fixed w-full z-30 top-0 transition-colors">
      <div className="px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6" />
          <span className="text-xl font-bold">WeServ</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-400" />}
          </button>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {notifLoaded && totalPending > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                  {totalPending > 9 ? '9+' : totalPending}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 text-gray-900 dark:text-gray-50 overflow-hidden">

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-semibold">Notificaciones</span>
                      {totalPending > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalPending}</span>
                      )}
                    </div>
                    <button onClick={() => setNotifOpen(false)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {!notifLoaded ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-gray-700 dark:border-t-gray-200 rounded-full animate-spin" />
                      </div>
                    ) : totalPending === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Sin alertas pendientes</p>
                      </div>
                    ) : (
                      <>
                        {/* Citas de hoy */}
                        {notifData.appointments.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50">
                              <div className="flex items-center gap-1.5">
                                <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                  Citas de hoy · {notifData.appointments.length}
                                </span>
                              </div>
                            </div>
                            {notifData.appointments.map((a, i) => (
                              <button
                                key={`a-${i}`}
                                onClick={() => { setNotifOpen(false); navigate(`/admin/shops/${a.shopId}/appointments`) }}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-800 last:border-0"
                              >
                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                  <CalendarCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {a.clientName || a.user?.fullName || 'Cliente'}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{a.shopName}</p>
                                </div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_LABEL[a.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                  {STATUS_LABEL[a.status]?.label ?? a.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Pedidos pendientes */}
                        {notifData.orders.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950/40 border-b border-orange-100 dark:border-orange-900/50">
                              <div className="flex items-center gap-1.5">
                                <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
                                  Pedidos pendientes · {notifData.orders.length}
                                </span>
                              </div>
                            </div>
                            {notifData.orders.map((o, i) => (
                              <button
                                key={`o-${i}`}
                                onClick={() => { setNotifOpen(false); navigate(`/admin/shops/${o.shopId}/orders`) }}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-800 last:border-0"
                              >
                                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                  <ShoppingBag className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {o.clientName || 'Cliente'}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{o.shopName}</p>
                                </div>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_LABEL[o.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                  {STATUS_LABEL[o.status]?.label ?? o.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  {totalPending > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <button
                        onClick={() => { setNotifOpen(false); navigate('/admin/appointments') }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Ver todas las citas →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Avatar / profile menu */}
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
                <UserDropdown onClose={close} onLogout={handleLogout} />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar
