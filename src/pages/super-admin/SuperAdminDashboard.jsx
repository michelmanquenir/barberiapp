import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Store, ShoppingBag, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import SuperAdminLayout from './SuperAdminLayout'
import { api } from '../../lib/api'

function StatCard({ icon: Icon, title, value, sub, to, color }) {
  return (
    <Link
      to={to}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 hover:border-gray-400 dark:hover:border-gray-500 transition group"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition mt-1" />
    </Link>
  )
}

function PendingAlert({ count, label, to }) {
  if (!count) return null
  return (
    <Link
      to={to}
      className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
    >
      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
        <strong>{count}</strong> {label} esperando aprobación
      </p>
      <ArrowRight className="w-4 h-4 text-amber-500" />
    </Link>
  )
}

function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.superAdmin.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Visión general de la plataforma
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Alertas de pendientes */}
          {(stats?.pendingUsers > 0 || stats?.pendingShops > 0 || stats?.pendingProducts > 0) && (
            <section className="mb-6 space-y-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Requieren atención
              </h2>
              <PendingAlert count={stats.pendingUsers}    label="usuario(s)"  to="/super-admin/users?status=PENDING"    />
              <PendingAlert count={stats.pendingShops}    label="negocio(s)"  to="/super-admin/shops?status=PENDING"    />
              <PendingAlert count={stats.pendingProducts} label="producto(s)" to="/super-admin/products?status=PENDING" />
            </section>
          )}

          {/* Stats totales */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Totales en la plataforma
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={Users}
                title="Usuarios registrados"
                value={stats?.totalUsers ?? 0}
                sub={`${stats?.pendingUsers ?? 0} pendientes`}
                to="/super-admin/users"
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={Store}
                title="Negocios creados"
                value={stats?.totalShops ?? 0}
                sub={`${stats?.pendingShops ?? 0} pendientes`}
                to="/super-admin/shops"
                color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              />
              <StatCard
                icon={ShoppingBag}
                title="Productos cargados"
                value={stats?.totalProducts ?? 0}
                sub={`${stats?.pendingProducts ?? 0} pendientes`}
                to="/super-admin/products"
                color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              />
            </div>
          </section>
        </>
      )}
    </SuperAdminLayout>
  )
}

export default SuperAdminDashboard
