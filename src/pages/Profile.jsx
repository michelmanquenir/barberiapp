import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Phone, MapPin, Calendar, Heart,
  Star, Clock, Edit2, CreditCard, User, Users, ChevronRight,
  Crown, Repeat2,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AvatarUpload from '../components/AvatarUpload'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str + (str.includes('T') ? '' : 'T00:00:00'))
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function memberSince(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

function statusLabel(status) {
  const map = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    completed: { label: 'Completada', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  }
  return map[status] ?? { label: status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' }
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [favorites, setFavorites] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    if (!user?.userId) return
    Promise.all([
      api.getProfile(user.userId),
      api.getAppointments(user.userId),
      api.getFavorites(user.userId),
      api.getMySubscriptions().catch(() => []),
    ])
      .then(([prof, apts, favs, subs]) => {
        setProfile(prof)
        setAvatarUrl(prof?.avatarUrl || null)
        setAppointments(apts || [])
        setFavorites(favs || [])
        setSubscriptions(subs || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user?.userId])

  // Estadísticas derivadas
  const completed   = appointments.filter(a => a.status === 'completed')
  const upcoming    = appointments.filter(a => ['pending', 'confirmed'].includes(a.status))
  const totalSpent  = completed.reduce((s, a) => s + (a.totalPrice ?? 0), 0)
  const recentApts  = [...appointments]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5)

  // Guardar nueva URL de avatar en backend
  async function handleAvatarUploaded(url) {
    setAvatarUrl(url)
    try {
      await api.updateProfile(user.userId, { ...(profile || {}), avatarUrl: url })
    } catch (e) {
      console.error('Error guardando avatar:', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-50 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Portada + Avatar ─────────────────────────────────────────────── */}
      <div className="relative">
        {/* Banner */}
        <div className="h-44 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700" />

        {/* Avatar superpuesto */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
          <AvatarUpload
            currentUrl={avatarUrl}
            userId={user.userId}
            onUploaded={handleAvatarUploaded}
            size="lg"
            name={profile?.fullName || user?.fullName || ''}
          />
        </div>
      </div>

      {/* Espaciado para el avatar */}
      <div className="h-20" />

      {/* ── Info del usuario ─────────────────────────────────────────────── */}
      <div className="text-center px-4 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {profile?.fullName || user?.fullName || 'Mi Perfil'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {user?.email}
        </p>
        {profile?.createdAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Miembro desde {memberSince(profile.createdAt)}
          </p>
        )}

        {/* Botón editar */}
        <button
          onClick={() => navigate('/edit-profile')}
          className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-gray-700 transition"
        >
          <Edit2 className="w-4 h-4" />
          Editar perfil
        </button>
      </div>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Calendar className="w-4 h-4" />}
            label="Servicios"
            value={completed.length}
          />
          <StatCard
            icon={<CreditCard className="w-4 h-4" />}
            label="Gastado"
            value={`$${totalSpent.toLocaleString()}`}
            dark
          />
          <StatCard
            icon={<Heart className="w-4 h-4" />}
            label="Favoritos"
            value={favorites.length}
          />
        </div>

        {/* Info de contacto */}
        <Section title="Información">
          <InfoRow icon={<Mail />}   label="Correo"    value={user?.email} />
          <InfoRow icon={<Phone />}  label="Teléfono"  value={profile?.phone || '—'} />
          <InfoRow icon={<MapPin />} label="Dirección" value={profile?.address || '—'} />
          <InfoRow
            icon={<Calendar />}
            label="Fecha de nacimiento"
            value={formatDate(profile?.birthdate)}
          />
        </Section>

        {/* Próximas citas */}
        {upcoming.length > 0 && (
          <Section title="Próximas citas">
            {upcoming.slice(0, 3).map(apt => (
              <AppointmentRow key={apt.id} apt={apt} />
            ))}
          </Section>
        )}

        {/* Historial reciente */}
        <Section
          title="Historial reciente"
          action={
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Ver todo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {recentApts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Sin citas aún</p>
          ) : (
            recentApts.map(apt => <AppointmentRow key={apt.id} apt={apt} />)
          )}
        </Section>

        {/* Mis suscripciones */}
        {subscriptions.length > 0 && (
          <Section title="Mis suscripciones">
            {subscriptions.map(sub => (
              <SubscriptionRow key={sub.id} sub={sub} />
            ))}
          </Section>
        )}

        {/* Accesos rápidos */}
        <Section title="Accesos rápidos">
          <QuickLink icon={<Users />}     label="Mis Visitas" to="/my-visits"  navigate={navigate} />
          <QuickLink icon={<Heart />}     label="Favoritos"        to="/favorites"   navigate={navigate} />
          <QuickLink icon={<Clock />}     label="Mis Citas"        to="/appointments" navigate={navigate} />
          <QuickLink icon={<CreditCard />} label="Mis Finanzas"    to="/my-finances" navigate={navigate} />
        </Section>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, dark }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${dark ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50'}`}>
      <div className={`flex items-center justify-center gap-1 text-xs mb-1 ${dark ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
        {icon} {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
        {action}
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 w-4 h-4">{icon}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{value || '—'}</span>
    </div>
  )
}

function AppointmentRow({ apt }) {
  const { label, color } = statusLabel(apt.status)
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
          {apt.service?.name ?? apt.serviceName ?? 'Servicio'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {apt.barber?.name ?? 'Profesional'} · {formatDate(apt.date)}
          {apt.time ? ` · ${apt.time}` : ''}
        </p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${color}`}>
        {label}
      </span>
    </div>
  )
}

function SubscriptionRow({ sub }) {
  const pct = sub.cutsAllowed > 0
    ? Math.round((sub.cutsUsed / sub.cutsAllowed) * 100)
    : 0
  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    expired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  }
  const statusLabels = { active: 'Activa', expired: 'Vencida', cancelled: 'Cancelada' }
  const color = statusColors[sub.status] ?? statusColors.expired
  const label = statusLabels[sub.status] ?? sub.status
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Crown className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{sub.planName}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${color}`}>{label}</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub.shopName}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
            <Repeat2 className="w-3 h-3 inline mr-0.5" />{sub.cutsUsed}/{sub.cutsAllowed} cortes
          </p>
          {sub.status === 'active' && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{sub.daysRemaining}d restantes</p>
          )}
        </div>
      </div>
      {/* Barra de progreso cortes */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${sub.status === 'active' ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
        <span>Vence: {sub.endDate}</span>
        <span>${sub.priceCharged?.toLocaleString()}/mes</span>
      </div>
    </div>
  )
}

function QuickLink({ icon, label, to, navigate }) {
  return (
    <button
      onClick={() => navigate(to)}
      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
    >
      <span className="text-gray-400 dark:text-gray-500 w-4 h-4 flex-shrink-0">{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
    </button>
  )
}
