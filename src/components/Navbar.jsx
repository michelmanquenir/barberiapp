import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
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

function Navbar({ toggleSidebar, isSidebarOpen }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { user, logout, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

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

          <div className="flex items-center gap-2">
            {/* Toggle dark mode */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
            </button>

            {isAuthenticated ? (
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
