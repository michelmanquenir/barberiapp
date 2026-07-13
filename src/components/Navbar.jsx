import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu, X, Sun, Moon,
  Bell, CalendarCheck, ShoppingBag, Dumbbell,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import UserDropdown from './UserDropdown'

function NavAvatar({ avatarUrl, fullName, size = 8 }) {
  const initials = fullName?.trim()
    ? fullName.trim().charAt(0).toUpperCase()
    : 'U'
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
    <div className={`${sizeClass} rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center`}>
      <span className="text-sm font-semibold text-white dark:text-gray-900 select-none">{initials}</span>
    </div>
  )
}

const APPT_STATUS = {
  pending:   { label: 'Pendiente de confirmar', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  confirmed: { label: 'Cita confirmada',        color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
}

const ORDER_STATUS_COLOR = {
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ready:     'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

function getOrderLabel(order) {
  if (order.status === 'confirmed') return 'Pedido confirmado'
  if (order.status === 'ready') {
    if (order.deliveryType === 'delivery') return 'Listo para despacho'
    return 'Listo para retiro'
  }
  return order.status
}

function Navbar({ toggleSidebar, isSidebarOpen }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Notifications
  const [notifOpen, setNotifOpen]     = useState(false)
  const [notifData, setNotifData]     = useState({ appointments: [], orders: [], memberships: [] })
  const [notifLoaded, setNotifLoaded] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) return
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [appts, orders, gymData] = await Promise.all([
          api.getAppointments(user.userId).catch(() => []),
          api.getMyOrders().catch(() => []),
          api.getMyGymMemberships().catch(() => []),
        ])

        const upcomingAppts = (appts || []).filter(
          a => ['pending', 'confirmed'].includes(a.status) && a.date >= today
        )
        const activeOrders = (orders || []).filter(
          o => ['confirmed', 'ready'].includes(o.status)
        )
        const activeMemberships = (gymData || []).filter(
          m => m.membershipStatus === 'active'
        )

        setNotifData({ appointments: upcomingAppts, orders: activeOrders, memberships: activeMemberships })
      } catch {
        // silently ignore
      } finally {
        setNotifLoaded(true)
      }
    }
    load()
  }, [isAuthenticated, user?.userId])

  // Close on outside click
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
    setIsProfileMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const totalNotif = notifData.appointments.length + notifData.orders.length + notifData.memberships.length

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 fixed w-full z-30 top-0 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? (
                  <X className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                )}
              </button>
            )}

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
              WeServ
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Notification bell */}
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setNotifOpen(o => !o)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Notificaciones"
                  >
                    <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    {notifLoaded && totalNotif > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                        {totalNotif > 9 ? '9+' : totalNotif}
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
                            {totalNotif > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalNotif}</span>
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
                          ) : totalNotif === 0 ? (
                            <div className="py-10 text-center">
                              <Bell className="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" />
                              <p className="text-sm text-gray-400 dark:text-gray-500">Sin novedades pendientes</p>
                            </div>
                          ) : (
                            <>
                              {/* Citas próximas */}
                              {notifData.appointments.length > 0 && (
                                <div>
                                  <div className="px-4 py-2 bg-green-50 dark:bg-green-950/40 border-b border-green-100 dark:border-green-900/50">
                                    <div className="flex items-center gap-1.5">
                                      <CalendarCheck className="w-3.5 h-3.5 text-green-600" />
                                      <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                                        Citas próximas · {notifData.appointments.length}
                                      </span>
                                    </div>
                                  </div>
                                  {notifData.appointments.map((a, i) => (
                                    <button
                                      key={`a-${i}`}
                                      onClick={() => { setNotifOpen(false); navigate('/appointments') }}
                                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-800 last:border-0"
                                    >
                                      <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                        <CalendarCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                          {a.shopName ?? a.barber?.shopName ?? 'Negocio'}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                          {a.date} {a.time ? `· ${a.time}` : ''}
                                        </p>
                                      </div>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${APPT_STATUS[a.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                                        {APPT_STATUS[a.status]?.label ?? a.status}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Pedidos activos */}
                              {notifData.orders.length > 0 && (
                                <div>
                                  <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50">
                                    <div className="flex items-center gap-1.5">
                                      <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                        Pedidos activos · {notifData.orders.length}
                                      </span>
                                    </div>
                                  </div>
                                  {notifData.orders.map((o, i) => (
                                    <button
                                      key={`o-${i}`}
                                      onClick={() => { setNotifOpen(false); navigate('/appointments', { state: { tab: 'pedidos' } }) }}
                                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-800 last:border-0"
                                    >
                                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                        <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                          {o.shopName ?? 'Negocio'}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                          {o.items?.length ? `${o.items.length} producto${o.items.length !== 1 ? 's' : ''}` : 'Pedido'}
                                        </p>
                                      </div>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${ORDER_STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {getOrderLabel(o)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Membresías activas de gym */}
                              {notifData.memberships.length > 0 && (
                                <div>
                                  <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50">
                                    <div className="flex items-center gap-1.5">
                                      <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                                        Membresías activas · {notifData.memberships.length}
                                      </span>
                                    </div>
                                  </div>
                                  {notifData.memberships.map((m, i) => {
                                    const days = m.endDate
                                      ? Math.ceil((new Date(m.endDate + 'T00:00:00') - new Date()) / 86400000)
                                      : null
                                    return (
                                      <button
                                        key={`m-${i}`}
                                        onClick={() => { setNotifOpen(false); navigate('/memberships') }}
                                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-800 last:border-0"
                                      >
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                          <Dumbbell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {m.shopName}
                                          </p>
                                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                            {m.planName ?? 'Membresía activa'}
                                          </p>
                                        </div>
                                        {days !== null && (
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap
                                            ${days <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                              : days <= 15 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                                            {days > 0 ? `${days}d` : 'Vence hoy'}
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Footer */}
                        {totalNotif > 0 && (
                          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4">
                            <button
                              onClick={() => { setNotifOpen(false); navigate('/appointments') }}
                              className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
                            >
                              Ver mis citas →
                            </button>
                            {notifData.orders.length > 0 && (
                              <button
                                onClick={() => { setNotifOpen(false); navigate('/appointments', { state: { tab: 'pedidos' } }) }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                Ver mis pedidos →
                              </button>
                            )}
                            {notifData.memberships.length > 0 && (
                              <button
                                onClick={() => { setNotifOpen(false); navigate('/memberships') }}
                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                              >
                                Ver membresías →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Profile menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <NavAvatar avatarUrl={user?.avatarUrl} fullName={user?.fullName} />
                    <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user?.fullName?.split(' ')[0] ?? 'Mi Cuenta'}
                    </span>
                  </button>

                  {isProfileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <UserDropdown
                        onClose={() => setIsProfileMenuOpen(false)}
                        onLogout={handleLogout}
                      />
                    </>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                Ingresar
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
