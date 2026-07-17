import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, Calendar, CreditCard, CheckCircle2,
  Clock, AlertCircle, ChevronRight, Layers,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(price) {
  if (price == null) return '—'
  return `$${Number(price).toLocaleString('es-CL')}/mes`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function daysUntil(isoDate) {
  if (!isoDate) return null
  const diff = new Date(isoDate + 'T00:00:00') - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const MEMBER_STATUS = {
  active:   { label: 'Activo',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  inactive: { label: 'Inactivo',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  blocked:  { label: 'Bloqueado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

const MEMSHIP_STATUS = {
  active:    { label: 'Membresía activa',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2 },
  expired:   { label: 'Membresía vencida',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: AlertCircle },
  cancelled: { label: 'Membresía cancelada', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: AlertCircle },
}

const PAYMENT_STATUS = {
  paid:    { label: 'Pagado',     cls: 'text-green-600 dark:text-green-400' },
  pending: { label: 'Pendiente',  cls: 'text-amber-600 dark:text-amber-400' },
  overdue: { label: 'Atrasado',   cls: 'text-red-600 dark:text-red-400' },
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function MembershipCard({ m, onVisit }) {
  const memberSt  = MEMBER_STATUS[m.memberStatus]  ?? { label: m.memberStatus,  cls: 'bg-gray-100 text-gray-600' }
  const memshipSt = m.membershipStatus ? (MEMSHIP_STATUS[m.membershipStatus] ?? {}) : null
  const paymentSt = m.paymentStatus ? (PAYMENT_STATUS[m.paymentStatus] ?? {}) : null
  const days      = daysUntil(m.endDate)
  const MemIcon   = memshipSt?.icon ?? CheckCircle2

  const visitsLabel = m.visitsAllowed
    ? `${m.visitsUsed ?? 0} / ${m.visitsAllowed} visitas`
    : 'Visitas ilimitadas'

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header with gym color accent */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-800 dark:to-gray-700 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-base leading-tight">{m.shopName}</p>
              <p className="text-white/60 text-xs mt-0.5">{m.memberName}</p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${memberSt.cls}`}>
            {memberSt.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">

        {m.planName ? (
          <>
            {/* Plan name + status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{m.planName}</span>
              </div>
              {memshipSt && (
                <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${memshipSt.cls}`}>
                  <MemIcon className="w-3 h-3" />
                  {memshipSt.label}
                </div>
              )}
            </div>

            {/* Price + payment */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>{fmt(m.monthlyPrice)}</span>
              </div>
              {paymentSt && (
                <span className={`text-xs font-medium ${paymentSt.cls}`}>{paymentSt.label}</span>
              )}
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{fmtDate(m.startDate)} → {fmtDate(m.endDate)}</span>
            </div>

            {/* Days remaining (only active memberships) */}
            {m.membershipStatus === 'active' && days !== null && (
              <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg
                ${days <= 7
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                  : days <= 15
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                }`}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {days > 0 ? `Vence en ${days} día${days !== 1 ? 's' : ''}` : 'Vence hoy'}
              </div>
            )}

            {/* Visits progress bar (if limited) */}
            {m.visitsAllowed && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Visitas</span>
                  <span>{visitsLabel}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-800 dark:bg-gray-200 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((m.visitsUsed ?? 0) / m.visitsAllowed) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Sin membresía activa asignada
          </div>
        )}

        {/* Join date */}
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          Miembro desde {fmtDate(m.joinDate)}
        </div>
      </div>

      {/* Footer action */}
      {m.shopSlug && (
        <div className="px-5 pb-4">
          <button
            onClick={() => onVisit(m.shopSlug)}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Visitar gimnasio
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyMemberships() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    // Notify Navbar to clear the gym membership badge
    window.dispatchEvent(new CustomEvent('memberships-viewed'))

    api.getMyGymMemberships()
      .then(data => setMemberships(data ?? []))
      .catch(err => setError(err.message ?? 'Error al cargar membresías'))
      .finally(() => setLoading(false))
  }, [])

  const active   = memberships.filter(m => m.membershipStatus === 'active')
  const inactive = memberships.filter(m => m.membershipStatus !== 'active' || !m.membershipStatus)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Dumbbell className="w-6 h-6" />
          Mis Membresías
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tus inscripciones y suscripciones activas
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && memberships.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Sin membresías registradas</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
            No se encontraron inscripciones vinculadas a tu cuenta.
            Si fuiste registrado en un gym, asegúrate de que el administrador haya guardado
            tu email <strong className="text-gray-500 dark:text-gray-400">({user?.email ?? 'tu correo'})</strong> en tu perfil de miembro.
          </p>
        </div>
      )}

      {!loading && !error && memberships.length > 0 && (
        <div className="space-y-6">
          {/* Active */}
          {active.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Activas · {active.length}
              </h2>
              {active.map(m => (
                <MembershipCard
                  key={m.memberId}
                  m={m}
                  onVisit={(slug) => navigate(`/book/${slug}`)}
                />
              ))}
            </section>
          )}

          {/* Inactive / no plan */}
          {inactive.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Historial · {inactive.length}
              </h2>
              {inactive.map(m => (
                <MembershipCard
                  key={m.memberId}
                  m={m}
                  onVisit={(slug) => navigate(`/book/${slug}`)}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
