import { useEffect, useState } from 'react'
import { ShoppingBag, CheckCircle, XCircle, Clock, Search, Store, Tag } from 'lucide-react'
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

function SuperAdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch]     = useState('')
  const [actionId, setActionId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.superAdmin.listProducts()
      setProducts(data || [])
    } catch {
      toast.error('No se pudo cargar la lista de productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (product) => {
    const ok = await confirm(
      `Aprobar "${product.name}"`,
      'El producto será visible para los clientes de este negocio.',
      { confirmText: 'Sí, aprobar', icon: 'question' }
    )
    if (!ok) return
    setActionId(product.id)
    try {
      await api.superAdmin.approveProduct(product.id)
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, approvalStatus: 'ACTIVE' } : p))
      toast.success(`"${product.name}" aprobado`)
    } catch {
      toast.error('No se pudo aprobar el producto')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (product) => {
    const ok = await confirmDanger(
      `Rechazar "${product.name}"`,
      'El producto no será visible para los clientes.'
    )
    if (!ok) return
    setActionId(product.id)
    try {
      await api.superAdmin.rejectProduct(product.id)
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, approvalStatus: 'REJECTED' } : p))
      toast.success(`"${product.name}" rechazado`)
    } catch {
      toast.error('No se pudo rechazar el producto')
    } finally {
      setActionId(null)
    }
  }

  const filtered = products.filter(p => {
    const status = p.approvalStatus ?? 'ACTIVE'
    const matchesTab = activeTab === 'ALL' || status === activeTab
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.shopName?.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  const counts = {
    ALL:      products.length,
    PENDING:  products.filter(p => (p.approvalStatus ?? 'ACTIVE') === 'PENDING').length,
    ACTIVE:   products.filter(p => (p.approvalStatus ?? 'ACTIVE') === 'ACTIVE').length,
    REJECTED: products.filter(p => (p.approvalStatus ?? 'ACTIVE') === 'REJECTED').length,
  }

  const formatPrice = (n) =>
    n != null ? `$${n.toLocaleString('es-CL')}` : '—'

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Productos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Revisa y aprueba los productos que ofrecen los negocios.
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
          placeholder="Buscar por nombre, categoría o negocio..."
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
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No se encontraron productos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(product => {
            const status = product.approvalStatus ?? 'ACTIVE'
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
            const StatusIcon = cfg.icon
            const isActing = actionId === product.id

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Imagen o icono */}
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                        {product.name}
                      </p>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {product.shopName && (
                        <span className="flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {product.shopName}
                        </span>
                      )}
                      {product.category && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {product.category}
                        </span>
                      )}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatPrice(product.salePrice)}
                      </span>
                      {product.stock != null && (
                        <span>Stock: {product.stock}</span>
                      )}
                    </div>

                    {product.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleApprove(product)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                    )}
                    {status !== 'REJECTED' && (
                      <button
                        onClick={() => handleReject(product)}
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

export default SuperAdminProducts
