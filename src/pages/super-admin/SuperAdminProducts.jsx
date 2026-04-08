import { useEffect, useState } from 'react'
import {
  ShoppingBag, CheckCircle, XCircle, Clock, Search,
  Store, Tag, Barcode, Package, DollarSign, TrendingUp,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Hash,
  Calendar, ExternalLink,
} from 'lucide-react'
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

const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CL')}` : '—'

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProductCard({ product, onApprove, onReject, isActing }) {
  const [expanded, setExpanded] = useState(false)
  const status = product.approvalStatus ?? 'ACTIVE'
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = cfg.icon
  const margin = product.salePrice && product.purchasePrice
    ? product.salePrice - product.purchasePrice
    : null
  const marginPct = margin != null && product.purchasePrice > 0
    ? Math.round((margin / product.purchasePrice) * 100)
    : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ── Fila principal ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Imagen */}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* Columna central */}
        <div className="flex-1 min-w-0">
          {/* Nombre + estado */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900 dark:text-gray-50 leading-tight">
              {product.name || <span className="italic text-gray-400">Sin nombre</span>}
            </p>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
            {product.active === false && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-medium">
                Inactivo
              </span>
            )}
          </div>

          {/* Negocio + categoría */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            {product.shopName && (
              <a
                href={`/admin/shops/${product.shopId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <Store className="w-3 h-3" />
                {product.shopName}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {product.category && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {product.category}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmtDate(product.createdAt)}
            </span>
          </div>

          {/* Precios + stock */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
              <DollarSign className="w-3 h-3 text-green-500" />
              Venta: {fmt(product.salePrice)}
            </span>
            {product.purchasePrice > 0 && (
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Package className="w-3 h-3" />
                Costo: {fmt(product.purchasePrice)}
              </span>
            )}
            {margin != null && margin > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp className="w-3 h-3" />
                Margen: {fmt(margin)}{marginPct != null ? ` (${marginPct}%)` : ''}
              </span>
            )}
            <span className={`flex items-center gap-1 font-medium ${
              product.stock === 0 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'
            }`}>
              <Hash className="w-3 h-3" />
              Stock: {product.stock ?? 0}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
          {status !== 'ACTIVE' && (
            <button
              onClick={() => onApprove(product)}
              disabled={isActing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Aprobar
            </button>
          )}
          {status !== 'REJECTED' && (
            <button
              onClick={() => onReject(product)}
              disabled={isActing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Rechazar
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition px-1"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Menos' : 'Más'}
          </button>
        </div>
      </div>

      {/* ── Detalle expandido ── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {product.barcode && (
              <div>
                <p className="text-gray-400 dark:text-gray-500 mb-0.5 flex items-center gap-1">
                  <Barcode className="w-3 h-3" /> Código de barras
                </p>
                <p className="font-mono text-gray-800 dark:text-gray-200 font-medium">{product.barcode}</p>
              </div>
            )}
            {product.sku && (
              <div>
                <p className="text-gray-400 dark:text-gray-500 mb-0.5">SKU</p>
                <p className="font-mono text-gray-800 dark:text-gray-200 font-medium">{product.sku}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 dark:text-gray-500 mb-0.5">ID producto</p>
              <p className="font-mono text-gray-600 dark:text-gray-400">{product.id}</p>
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-500 mb-0.5">ID negocio</p>
              <p className="font-mono text-gray-600 dark:text-gray-400 truncate">{product.shopId}</p>
            </div>
            <div>
              <p className="text-gray-400 dark:text-gray-500 mb-0.5 flex items-center gap-1">
                {product.active !== false
                  ? <ToggleRight className="w-3 h-3 text-green-500" />
                  : <ToggleLeft  className="w-3 h-3 text-gray-400" />}
                Estado
              </p>
              <p className={product.active !== false ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400'}>
                {product.active !== false ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>

          {product.description && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Descripción</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{product.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SuperAdminProducts() {
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('ALL')
  const [search, setSearch]         = useState('')
  const [actionId, setActionId]     = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [shopFilter, setShopFilter] = useState('')

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

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort()
  const shops      = [...new Set(products.map(p => p.shopName).filter(Boolean))].sort()

  const filtered = products.filter(p => {
    const status = p.approvalStatus ?? 'ACTIVE'
    if (activeTab !== 'ALL' && status !== activeTab) return false
    if (categoryFilter && p.category !== categoryFilter) return false
    if (shopFilter && p.shopName !== shopFilter) return false
    const q = search.toLowerCase()
    if (q && !(
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.shopName?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )) return false
    return true
  })

  const counts = {
    ALL:      products.length,
    PENDING:  products.filter(p => (p.approvalStatus ?? 'ACTIVE') === 'PENDING').length,
    ACTIVE:   products.filter(p => (p.approvalStatus ?? 'ACTIVE') === 'ACTIVE').length,
    REJECTED: products.filter(p => (p.approvalStatus ?? 'ACTIVE') === 'REJECTED').length,
  }

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Productos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Revisa, filtra y aprueba los productos de todos los negocios.
        </p>
      </div>

      {/* Contadores / tabs */}
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

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Nombre, barcode, SKU, descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-100 appearance-none"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={shopFilter}
          onChange={e => setShopFilter(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-100 appearance-none"
        >
          <option value="">Todos los negocios</option>
          {shops.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Resultados */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Mostrando {filtered.length} de {products.length} productos
      </p>

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
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onApprove={handleApprove}
              onReject={handleReject}
              isActing={actionId === product.id}
            />
          ))}
        </div>
      )}
    </SuperAdminLayout>
  )
}

export default SuperAdminProducts
