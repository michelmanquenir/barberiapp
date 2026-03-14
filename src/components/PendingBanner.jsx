import { Clock, XCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

function PendingBanner() {
  const { isPending, isRejected } = useAuth()

  if (!isPending && !isRejected) return null

  if (isRejected) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3 text-sm">
        <XCircle className="w-5 h-5 flex-shrink-0" />
        <span>
          <strong>Tu cuenta fue rechazada.</strong> Contacta al administrador para más información.
        </span>
      </div>
    )
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3 text-sm">
      <Clock className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">
        <strong>Cuenta pendiente de aprobación.</strong> Puedes explorar la app, pero no podrás agendar citas hasta que un administrador active tu cuenta.
        Sube tu DNI en{' '}
        <Link to="/edit-profile" className="underline font-semibold">
          tu perfil
        </Link>
        {' '}para agilizar la verificación.
      </span>
      <ShieldCheck className="w-5 h-5 flex-shrink-0 opacity-70" />
    </div>
  )
}

export default PendingBanner
