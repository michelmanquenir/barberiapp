import { useEffect, useState } from 'react'
import { Store, CheckCircle, XCircle, Clock, Search, MapPin, User } from 'lucide-react'
import SuperAdminLayout from './SuperAdminLayout'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'

const STATUS_TABS = [
  { key: 'ALL',      label: 'Todos'      },
  { key: 'PENDING',  label: 'Pendientes' },
  { key: 'ACTIVE',   label: 'Activos'    },
  { key: 'REJECTED', label: 'Rechazados' },
]

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendiente',  icon: Clock,        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  ACTIVE:   { label: 'Activo',     icon: CheckCircle,  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  REJECTED: { label: 'Rechazado',  icon: XCircle,      color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

function SuperAdminShops() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.superAdmin.listShops()
      setShops(data || [])
    } catch {
      toast.error('No se pudo cargar la lista de negocios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (shop) => {
    const ok = await confirm(
      `Aprobar "${shop.name}"`,
      'El negocio será visible públicamente en la plataforma.',
      { confirmText: 'Sí, aprobar', icon: 'question' }
    )
    if (!ok) return
    setActionId(shop.id)
    try {
      await api.superAdmin.approveShop(shop.id)
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, approvalStatus: 'ACTIVE' } : s))
      toast.success(`"${shop.name}" aprobado`)
    } catch {
      toast.error('No se pudo aprobar el negocio')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (shop) => {
    const ok = await confirmDanger(
      `Rechazar "${shop.name}"`,
      'El negocio no será visible al público.'
    )
    if (!ok) return
    setActionId(shop.id)
    try {
      await api.superAdmin.rejectShop(shop.id)
      setShops(prev => prev.map(s => s.id === shop.id ? { ...s, approvalStatus: 'REJECTED' } : s))
      toast.success(`"${shop.name}" rechazado`)
    } catch {
      toast.error('No se pudo rechazar el negocio')
    } finally {
      setActionId(null)
    }
  }

  const filtered = shops.filter(s => {
    const status = s.approvalStatus ?? 'ACTIVE'
    const matchesTab = activeTab === 'ALL' || status === activeTab
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      s.name?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q) ||
      s.ownerName?.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const counts = {
    ALL:      shops.length,
    PENDING:  shops.filter(s => (s.approvalStatus ?? 'ACTIVE') === 'PENDING').length,
    ACTIVE:   shops.filter(s => (s.approvalStatus ?? 'ACTIVE') === 'ACTIVE').length,
    REJECTED: shops.filter(s => (s.approvalStatus ?? 'ACTIVE') === 'REJECTED').length,
  }

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Negocios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Aprueba o rechaza negocios para que sean visibles en la plataforma.
        </p>
      </div>

      {/* Tabs / Contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl border p-4 text-left transition-all ${
              activeTab === tab.key
                ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <p className={`text-2xl font-bold ${activeTab === tab.key ? '' : 'text-gray-900 dark:text-gray-50'}`}>
              {counts[tab.key]}
            </p>
            <p className={`text-xs mt-0.5 ${activeTab === tab.key ? 'opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>
              {tab.label}
            </p>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, dirección o dueño..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No se encontraron negocios</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(shop => {
            const status = shop.approvalStatus ?? 'ACTIVE'
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
            const StatusIcon = cfg.icon
            const isActing = actionId === shop.id

            return (
              <div
                key={shop.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Icono */}
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                        {shop.name}
                      </p>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {shop.ownerName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        {shop.ownerName}
                        {shop.ownerEmail && <span className="text-gray-400">· {shop.ownerEmail}</span>}
                      </p>
                    )}

                    {shop.address && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {shop.address}
                      </p>
                    )}

                    {shop.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {shop.description}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleApprove(shop)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                    )}
                    {status !== 'REJECTED' && (
                      <button
                        onClick={() => handleReject(shop)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SuperAdminLayout>
  )
}

export default SuperAdminShops
