import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Menu, X, User, LogOut, Settings, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Navbar({ toggleSidebar, isSidebarOpen }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const { user, logout, isBarber } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full z-30 top-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
              )}
            </button>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              BarberShop
            </h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.fullName?.split(' ')[0] ?? 'Mi Cuenta'}
              </span>
            </button>

            {isProfileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.fullName ?? 'Usuario'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <User className="h-4 w-4" />
                    Ver Perfil
                  </Link>

                  <Link
                    to="/edit-profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Settings className="h-4 w-4" />
                    Configuración
                  </Link>

                  {isBarber && (
                    <Link
                      to="/admin"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Panel Admin
                    </Link>
                  )}

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
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

export default Navbar
