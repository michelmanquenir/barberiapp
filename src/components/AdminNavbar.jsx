import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Store, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
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
          <Store className="w-6 h-6" />
          <span className="text-xl font-bold">WeServ</span>
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
