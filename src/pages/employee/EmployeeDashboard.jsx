import { useEffect, useState, useCallback } from 'react'
import {
  Scissors,
  Building2,
  Calendar,
  Star,
  MapPin,
  Loader2,
  AlertCircle,
  User,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { api } from '../../lib/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  pending:   { label: 'Pendiente',  color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-950'  },
  confirmed: { label: 'Confirmada', color: 'text-blue-600   dark:text-blue-400',   bg: 'bg-blue-50   dark:bg-blue-950'   },
  completed: { label: 'Completada', color: 'text-green-600  dark:text-green-400',  bg: 'bg-green-50  dark:bg-green-950'  },
  cancelled: { label: 'Cancelada',  color: 'text-red-500    dark:text-red-400',    bg: 'bg-red-50    dark:bg-red-950'    },
  no_show:   { label: 'No asistió', color: 'text-gray-500   dark:text-gray-400',   bg: 'bg-gray-100  dark:bg-gray-800'   },
}

const STATUS_ICON = {
  pending:   <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
  no_show:   <XCircle className="w-3.5 h-3.5" />,
}

function StatusBadge({ status }) {
  const s = status?.toLowerCase() ?? 'pending'
  const meta = STATUS_META[s] ?? STATUS_META.pending
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
      {STATUS_ICON[s]} {meta.label}
    </span>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(timeStr) {
  if (!timeStr) return '—'
  // timeStr es "HH:mm:ss" o "HH:mm"
  const parts = timeStr.toString().split(':')
  return `${parts[0]}:${parts[1]}`
}

// ─── Componente principal ──────────────────────────────────────────────────────

function EmployeeDashboard() {
  const [barber, setBarber]           = useState(null)
  const [shops, setShops]             = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Cargar perfil de barbero, negocios y citas en paralelo
      const [barberData, shopsData, apptData] = await Promise.all([
        api.getMyBarberProfile(),
        api.getMyBarberShops().catch(() => []),
        api.getMyBarberAppointments().catch(() => []),
      ])
      setBarber(barberData)
      setShops(shopsData || [])
      setAppointments(apptData || [])
    } catch (e) {
      setError(e.message || 'No se pudo cargar el panel')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">No se pudo cargar el panel</p>
        <p className="text-xs text-red-500 dark:text-red-500 mb-4">{error}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Si aún no tienes un perfil de profesional, pide al dueño del negocio que lo cree o te vincule.
        </p>
        <button onClick={load} className="mt-4 text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
          Reintentar
        </button>
      </div>
    )
  }

  if (!barber) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
        <Scissors className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">Sin perfil de profesional</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tu cuenta no tiene un perfil de profesional vinculado todavía.
          Pídele al dueño del negocio que lo cree desde el panel de administración.
        </p>
      </div>
    )
  }

  const today = new Date()

  // Citas de hoy (comparando por fecha)
  const todayAppts = appointments.filter(a => {
    // El backend devuelve date (LocalDate) y time (LocalTime) como campos separados
    const apptDate = a.date ? new Date(a.date + 'T00:00:00') : null
    return apptDate && apptDate.toDateString() === today.toDateString()
  })

  // Citas futuras (sin incluir hoy)
  const upcomingAppts = appointments.filter(a => {
    const apptDate = a.date ? new Date(a.date + 'T00:00:00') : null
    if (!apptDate) return false
    const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0)
    const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1)
    return apptDate >= tomorrow
  })

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4">
          {barber.imageUrl
            ? <img src={barber.imageUrl} alt={barber.name} className="w-16 h-16 rounded-full object-cover" />
            : <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <User className="w-7 h-7 text-gray-400 dark:text-gray-500" />
              </div>}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{barber.name}</h1>
              <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                Profesional
              </span>
            </div>
            {barber.bio && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{barber.bio}</p>}
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{barber.rating?.toFixed(1) ?? '5.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Negocios</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{shops.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hoy</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{todayAppts.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Esta semana</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{appointments.length}</p>
        </div>
      </div>

      {/* ── Negocios donde trabajo ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">Mis negocios</h2>
        </div>
        {shops.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No estás asignado a ningún negocio todavía.
          </p>
        ) : (
          <div className="space-y-3">
            {shops.map(shop => (
              <div key={shop.id}
                className="flex items-start justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{shop.name}</p>
                  {shop.address && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />{shop.address}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                  shop.active
                    ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {shop.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Citas de hoy ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Citas de hoy
            <span className="ml-2 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
              {todayAppts.length}
            </span>
          </h2>
        </div>
        {todayAppts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No tienes citas para hoy.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {todayAppts
              .sort((a, b) => {
                const da = new Date(a.date + 'T' + (a.time || '00:00'))
                const db = new Date(b.date + 'T' + (b.time || '00:00'))
                return da - db
              })
              .map(appt => (
                <div key={appt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {appt.clientName || appt.user?.fullName || '—'}
                      </p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {appt.service?.name || '—'} · {formatTime(appt.time)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Próximas citas (esta semana) ── */}
      {upcomingAppts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Próximas citas
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {upcomingAppts.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {upcomingAppts
              .sort((a, b) => {
                const da = new Date(a.date + 'T' + (a.time || '00:00'))
                const db = new Date(b.date + 'T' + (b.time || '00:00'))
                return da - db
              })
              .map(appt => (
                <div key={appt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {appt.clientName || appt.user?.fullName || '—'}
                      </p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {appt.service?.name || '—'} · {formatDate(appt.date)} {formatTime(appt.time)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeDashboard
