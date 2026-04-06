import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  TrendingUp,
  CalendarCheck,
  Users,
  Package,
  Wallet,
  Star,
  Home,
  Store,
  CreditCard,
  Banknote,
  BadgePercent,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../lib/api'

const PERIOD_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
]

function fmt(n) {
  if (n == null) return '$0'
  return '$' + Number(n).toLocaleString('es-AR')
}

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 mr-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

// ── Bar chart row ──────────────────────────────────────────────────────────────
function BarRow({ label, value, max, formatter = (v) => v, color = 'bg-blue-500' }) {
  const width = max ? pct(value, max) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 dark:text-gray-300 w-40 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right shrink-0">
        {formatter(value)}
      </span>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Weekly mini-chart ──────────────────────────────────────────────────────────
function WeeklyChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos para el período</p>
  }
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  return (
    <div className="space-y-2">
      {data.map((w) => (
        <BarRow
          key={w.week}
          label={`Sem. ${w.week}`}
          value={w.revenue}
          max={maxRevenue}
          formatter={fmt}
          color="bg-blue-500 dark:bg-blue-400"
        />
      ))}
    </div>
  )
}

export default function ShopStats() {
  const { shopId } = useParams()
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .getShopStats(shopId, days)
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [shopId, days])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={`/admin/shops/${shopId}`}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Estadísticas</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resumen de rendimiento del negocio</p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setDays(o.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  days === o.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {stats && !loading && (
          <div className="space-y-6">
            {/* ── KPI cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Ingresos totales"
                value={fmt(stats.revenue.total)}
                sub={`${stats.appointments.completed} citas completadas`}
                color="blue"
              />
              <StatCard
                icon={<CalendarCheck className="w-5 h-5" />}
                label="Citas totales"
                value={stats.appointments.total}
                sub={`${stats.appointments.cancelled} canceladas`}
                color="green"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Suscripciones activas"
                value={stats.subscriptions.active}
                sub={`+${stats.subscriptions.newThisPeriod} nuevas`}
                color="purple"
              />
              <StatCard
                icon={<Home className="w-5 h-5" />}
                label="Servicios a domicilio"
                value={stats.appointments.atHome}
                sub={`${stats.appointments.atShop} en local`}
                color="orange"
              />
            </div>

            {/* ── Revenue breakdown + Appointment status ───────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Métodos de pago" icon={<Wallet className="w-4 h-4 text-blue-500" />}>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Efectivo',
                      value: stats.revenue.byCash,
                      icon: <Banknote className="w-4 h-4 text-green-500" />,
                      color: 'bg-green-500',
                    },
                    {
                      label: 'Transferencia',
                      value: stats.revenue.byTransfer,
                      icon: <CreditCard className="w-4 h-4 text-blue-500" />,
                      color: 'bg-blue-500',
                    },
                    {
                      label: 'Suscripción',
                      value: stats.revenue.bySubscription,
                      icon: <BadgePercent className="w-4 h-4 text-purple-500" />,
                      color: 'bg-purple-500',
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`${item.color} h-1.5 rounded-full`}
                            style={{ width: `${pct(item.value, stats.revenue.total)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-20 text-right">
                          {fmt(item.value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Estado de citas" icon={<CalendarCheck className="w-4 h-4 text-green-500" />}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Completadas', value: stats.appointments.completed, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Canceladas', value: stats.appointments.cancelled, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'Pendientes', value: stats.appointments.pending, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    { label: 'No se presentó', value: stats.appointments.noShow, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/50' },
                    { label: 'Confirmadas', value: stats.appointments.confirmed, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'En local', value: stats.appointments.atShop, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                  ].map((s) => (
                    <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* ── Weekly trend ─────────────────────────────────────────────── */}
            <Section title="Tendencia de ingresos (por semana)" icon={<TrendingUp className="w-4 h-4 text-blue-500" />}>
              <WeeklyChart data={stats.weeklyRevenue} />
            </Section>

            {/* ── Top services + Top products ───────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Servicios más solicitados" icon={<Star className="w-4 h-4 text-yellow-500" />}>
                {stats.topServices.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topServices.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{s.count} citas · {fmt(s.revenue)}</p>
                        </div>
                        <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-yellow-400 h-1.5 rounded-full"
                            style={{ width: `${pct(s.count, stats.topServices[0]?.count ?? 1)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Productos más vendidos" icon={<Package className="w-4 h-4 text-orange-500" />}>
                {stats.topProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sin ventas de productos en el período</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{p.quantity} unidades · {fmt(p.revenue)}</p>
                        </div>
                        <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-orange-400 h-1.5 rounded-full"
                            style={{ width: `${pct(p.quantity, stats.topProducts[0]?.quantity ?? 1)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* ── Top clients + Barber performance ─────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section title="Clientes frecuentes" icon={<Users className="w-4 h-4 text-blue-500" />}>
                {stats.topClients.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {stats.topClients.map((c, i) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              {c.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{c.visits} visitas</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(c.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Rendimiento de profesionales" icon={<Store className="w-4 h-4 text-purple-500" />}>
                {stats.barberPerformance.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {stats.barberPerformance.map((b) => (
                      <div
                        key={b.name}
                        className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                              {String(b.name).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {b.appointments} citas · ⭐ {Number(b.rating ?? 0).toFixed(1)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(b.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* ── Subscriptions ────────────────────────────────────────────── */}
            <Section title="Suscripciones" icon={<BadgePercent className="w-4 h-4 text-purple-500" />}>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.subscriptions.active}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Activas ahora</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.subscriptions.newThisPeriod}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nuevas en el período</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(stats.subscriptions.totalRevenue)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ingresos históricos</p>
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
