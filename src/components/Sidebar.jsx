import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  User,
  Calendar,
  Wallet,
  Heart,
  Settings,
  Compass,
  Briefcase,
  Scissors,
  PiggyBank,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function Sidebar({ isOpen }) {
  const location = useLocation()
  const { user } = useAuth()

  // Detectamos si el usuario autenticado tiene perfil de barbero
  // (lo guardamos en state para no bloquear el render principal)
  const [hasBarberProfile, setHasBarberProfile] = useState(false)

  useEffect(() => {
    if (!user) { setHasBarberProfile(false); return }
    api.getMyBarberProfile()
      .then(() => setHasBarberProfile(true))
      .catch(() => setHasBarberProfile(false))
  }, [user])

  const baseItems = [
    { path: '/booking',       icon: Compass,   label: 'Explorar'          },
    { path: '/profile',       icon: User,      label: 'Perfil'            },
    { path: '/appointments',  icon: Calendar,  label: 'Mis Citas'         },
    { path: '/my-visits',     icon: Briefcase, label: 'Mis Visitas' },
    { path: '/wallet',        icon: Wallet,    label: 'Wallet'            },
    { path: '/favorites',     icon: Heart,     label: 'Favoritos'         },
    { path: '/my-finances',   icon: PiggyBank, label: 'Mis Finanzas'      },
    { path: '/edit-profile',  icon: Settings,  label: 'Editar Perfil'     },
  ]

  const employeeItem = {
    path: '/employee/dashboard',
    icon: Scissors,
    label: 'Mi trabajo',
  }

  const menuItems = hasBarberProfile
    ? [...baseItems, employeeItem]
    : baseItems

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => { }}
        />
      )}

      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transition-transform duration-300 ease-in-out z-20
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          w-64
        `}
      >
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-5rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${item.path === '/employee/dashboard'
                    ? isActive
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : isActive
                      ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.path === '/employee/dashboard' && !isActive && (
                  <span className="ml-auto text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-1.5 py-0.5 rounded-full">
                    Pro
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-primary-50 dark:bg-primary-950 rounded-lg p-4">
            <p className="text-sm font-medium text-primary-900 dark:text-primary-200">
              &iquest;Necesitas ayuda?
            </p>
            <p className="text-xs text-primary-700 dark:text-primary-400 mt-1">
              Cont&aacute;ctanos para soporte
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
