import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  MapPin,
  CreditCard,
  User,
  AlertCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'
import AdminNavbar from '../../components/AdminNavbar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmado',
    badge: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  ready: {
    label: 'Listo',
    badge: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  delivered: {
    label: 'Entregado',
    badge: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
  cancelled: {
    label: 'Cancelado',
    badge: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    dot: 'bg-red-400',
  },
}

const FILTERS = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'ready',     label: 'Listos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
]

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatPrice(n) {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString('es-CL')}`
}

// ─── Componente principal ─────────────────────────────────────────────────────

function ShopOrders() {
  const { shopId } = useParams()
  const navigate   = useNavigate()

  const [orders,     setOrders]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState('all')
  const [expanded,   setExpanded]   = useState(null) // orderId | null
  const [updating,   setUpdating]   = useState(null) // orderId | null

  // ── Carga ──────────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const data = await api.getShopOrders(shopId)
      setOrders(data || [])
    } catch {
      toast.error('No se pudieron cargar los pedidos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [shopId])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Acciones ───────────────────────────────────────────────────────────────

  const handleUpdateStatus = async (orderId, newStatus, confirmMsg) => {
    if (confirmMsg) {
      const ok = await confirm('Actualizar pedido', confirmMsg, { confirmText: 'Sí, continuar', icon: 'question' })
      if (!ok) return
    }
    setUpdating(orderId)
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      toast.success('Estado actualizado')
    } catch {
      toast.error('No se pudo actualizar el estado')
    } finally {
      setUpdating(null)
    }
  }

  const handleCancel = async (orderId) => {
    const ok = await confirmDanger(
      'Cancelar pedido',
      '¿Seguro que deseas cancelar este pedido? El stock de los productos será restaurado.',
      { confirmText: 'Sí, cancelar' }
    )
    if (!ok) return
    setUpdating(orderId)
    try {
      const updated = await api.updateOrderStatus(orderId, 'cancelled')
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      toast.success('Pedido cancelado')
    } catch {
      toast.error('No se pudo cancelar el pedido')
    } finally {
      setUpdating(null)
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const pending   = orders.filter(o => o.status === 'pending').length
  const confirmed = orders.filter(o => o.status === 'confirmed').length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const revenue   = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0)

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <div className="pt-20 px-4 sm:px-6 pb-12 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/shops/${shopId}`)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" />
                Pedidos
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Gestiona los pedidos de tu negocio
              </p>
            </div>
          </div>
          <button
            onClick={() => loadOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />}
            label="Pendientes" value={pending}
            bg="bg-amber-50 dark:bg-amber-950/50" />
          <StatCard icon={<CheckCircle className="w-5 h-5 text-blue-500" />}
            label="Confirmados" value={confirmed}
            bg="bg-blue-50 dark:bg-blue-950/50" />
          <StatCard icon={<Truck className="w-5 h-5 text-green-500" />}
            label="Entregados" value={delivered}
            bg="bg-green-50 dark:bg-green-950/50" />
          <StatCard icon={<Package className="w-5 h-5 text-purple-500" />}
            label="Ingresos" value={formatPrice(revenue)}
            bg="bg-purple-50 dark:bg-purple-950/50" />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
              {f.key === 'pending' && pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando pedidos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay pedidos</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {filter === 'all' ? 'Aún no has recibido ningún pedido.' : `No hay pedidos en estado "${FILTERS.find(f => f.key === filter)?.label}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expanded === order.id}
                onToggle={() => setExpanded(prev => prev === order.id ? null : order.id)}
                onUpdateStatus={handleUpdateStatus}
                onCancel={handleCancel}
                isUpdating={updating === order.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`rounded-xl p-4 border border-transparent ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
    </div>
  )
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order, expanded, onToggle, onUpdateStatus, onCancel, isUpdating }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border transition-shadow ${
      order.status === 'pending'
        ? 'border-amber-300 dark:border-amber-700 shadow-sm'
        : 'border-gray-200 dark:border-gray-700'
    } hover:shadow-md`}>

      {/* Header del card */}
      <div className="p-4 flex items-start gap-3">

        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm">
                Pedido #{order.id}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                {cfg.label}
              </span>
              {order.deliveryType === 'delivery' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <Truck className="w-3 h-3 inline mr-1" />Delivery
                </span>
              )}
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-50">
              {formatPrice(order.totalPrice)}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {order.clientName ?? 'Cliente'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDateTime(order.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
            </span>
            {order.clientAddress && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {order.clientAddress}
              </span>
            )}
            {order.assignedBarberName && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                Repartidor: <strong>{order.assignedBarberName}</strong>
              </span>
            )}
            {order.scheduledAt && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                Entrega agendada: {new Date(order.scheduledAt).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })} {new Date(order.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {order.notes && (
            <div className="mt-2 flex items-start gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 dark:text-gray-300">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Toggle expand */}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-500" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
      </div>

      {/* Items expandibles */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-3 pt-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Productos
          </p>
          <div className="space-y-2">
            {(order.items ?? []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400 dark:text-gray-500 text-xs w-5 text-right flex-shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 truncate">{item.productName}</span>
                </div>
                <span className="text-gray-600 dark:text-gray-300 flex-shrink-0 font-medium">
                  {formatPrice(item.subtotal)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Recargo delivery</span>
                <span>+{formatPrice(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-700 dark:text-gray-200">Total</span>
              <span className="text-gray-900 dark:text-gray-50">{formatPrice(order.totalPrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Acciones */}
      {!isTerminal && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex gap-2 flex-wrap">
          {isUpdating ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Actualizando...
            </div>
          ) : (
            <>
              {order.status === 'pending' && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'confirmed', '¿Confirmar este pedido?')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Confirmar
                </button>
              )}
              {order.status === 'confirmed' && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'ready', '¿Marcar el pedido como listo para entregar?')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition"
                >
                  <Package className="w-3.5 h-3.5" />
                  Marcar como listo
                </button>
              )}
              {order.status === 'ready' && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'delivered', '¿Marcar el pedido como entregado?')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Entregado
                </button>
              )}
              {(order.status === 'pending' || order.status === 'confirmed' || order.status === 'ready') && (
                <button
                  onClick={() => onCancel(order.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm rounded-lg transition"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ShopOrders
