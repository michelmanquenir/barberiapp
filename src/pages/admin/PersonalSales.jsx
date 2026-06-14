import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  Package,
  X,
  History,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { api } from '../../lib/api'
import AdminNavbar from '../../components/AdminNavbar'
import { toast } from '../../lib/swal'

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-CL')}`

function StockBadge({ stock }) {
  if (stock <= 0)
    return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">Sin stock</span>
  if (stock <= 3)
    return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">Stock: {stock}</span>
  return <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">Stock: {stock}</span>
}

function PersonalSales() {
  const { shopId } = useParams()
  const navigate = useNavigate()

  const [products, setProducts]   = useState([])
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch]       = useState('')
  const [cart, setCart]           = useState({}) // { id: { product, qty } }
  const [submitting, setSubmitting] = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saleNote, setSaleNote]   = useState('')

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const [prods, ords] = await Promise.all([
        api.getAdminProducts(shopId),
        api.getShopOrders(shopId).catch(() => []),
      ])
      setProducts(prods)
      setOrders(ords)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [shopId])

  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p =>
      p.active &&
      (!q || p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
    )
  }, [products, search])

  // ── Cart helpers ──────────────────────────────────────────────────────────────

  const cartItems  = Object.values(cart)
  const cartTotal  = cartItems.reduce((s, i) => s + i.product.salePrice * i.qty, 0)

  const addToCart = (product) => {
    if (product.stock <= 0) return
    setCart(prev => {
      const cur = prev[product.id]?.qty ?? 0
      if (cur >= product.stock) return prev
      return { ...prev, [product.id]: { product, qty: cur + 1 } }
    })
  }

  const changeQty = (productId, delta) => {
    setCart(prev => {
      const item = prev[productId]
      if (!item) return prev
      const next = item.qty + delta
      if (next <= 0) { const r = { ...prev }; delete r[productId]; return r }
      if (next > item.product.stock) return prev
      return { ...prev, [productId]: { ...item, qty: next } }
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => { const r = { ...prev }; delete r[productId]; return r })
  }

  // ── Confirm sale ──────────────────────────────────────────────────────────────

  const openConfirm = () => {
    if (cartItems.length === 0) return
    setSaleNote('')
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await api.createOrder({
        shopId,
        source: 'pos',
        deliveryType: 'pickup',
        paymentMethod: 'cash',
        clientAddress: null,
        notes: saleNote.trim() || null,
        deliveryFee: 0,
        items: cartItems.map(i => ({ productId: i.product.id, quantity: i.qty })),
      })
      toast.success('Venta registrada correctamente')
      setCart({})
      setConfirmOpen(false)
      setSaleNote('')
      await loadData(true)
    } catch (err) {
      toast.error(err?.message || 'Error al registrar la venta')
    } finally {
      setSubmitting(false)
    }
  }

  // ── History ───────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0]
  const todayOrders = orders
    .filter(o => o.createdAt?.startsWith(today))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30)
  const displayOrders = showAll ? recentOrders : todayOrders

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/admin/shops/${shopId}`)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ventas Personales</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Registra ventas rápidas desde tu stock</p>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="ml-auto p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Product grid ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No hay productos disponibles</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Agrega productos desde el panel de tu negocio</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filtered.map(product => {
                    const inCart    = cart[product.id]?.qty ?? 0
                    const outOfStock = product.stock <= 0
                    return (
                      <div
                        key={product.id}
                        className={`bg-white dark:bg-gray-900 rounded-xl border flex flex-col overflow-hidden transition-all ${
                          outOfStock
                            ? 'border-gray-100 dark:border-gray-800 opacity-55'
                            : inCart > 0
                            ? 'border-blue-400 dark:border-blue-500 shadow-sm shadow-blue-100 dark:shadow-blue-950'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-28 object-cover" />
                        ) : (
                          <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}

                        <div className="p-3 flex flex-col gap-2 flex-1">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight line-clamp-2">{product.name}</p>
                            {product.category && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{product.category}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(product.salePrice)}</span>
                            <StockBadge stock={product.stock} />
                          </div>

                          {inCart > 0 ? (
                            <div className="mt-auto flex items-center justify-between gap-1">
                              <button
                                onClick={() => changeQty(product.id, -1)}
                                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                              >
                                <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                              </button>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 min-w-[1.5rem] text-center">{inCart}</span>
                              <button
                                onClick={() => changeQty(product.id, 1)}
                                disabled={inCart >= product.stock}
                                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-40"
                              >
                                <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              disabled={outOfStock}
                              className="mt-auto w-full py-1.5 rounded-lg text-sm font-semibold transition bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                            >
                              {outOfStock ? 'Sin stock' : '+ Agregar'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Right column: cart + history ──────────────────────────────── */}
            <div className="flex flex-col gap-4">

              {/* Cart */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">Venta actual</span>
                  {cartItems.length > 0 && (
                    <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">
                      {cartItems.length}
                    </span>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <ShoppingCart className="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Agrega productos para registrar una venta</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {cartItems.map(({ product, qty }) => (
                        <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{fmt(product.salePrice)} × {qty}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{fmt(product.salePrice * qty)}</span>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{fmt(cartTotal)}</span>
                      </div>
                      <button
                        onClick={openConfirm}
                        className="w-full py-2.5 rounded-lg bg-green-600 text-white font-semibold text-sm hover:bg-green-700 active:bg-green-800 transition flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Confirmar venta
                      </button>
                      <button
                        onClick={() => setCart({})}
                        className="w-full py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Vaciar
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* History */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">Historial</span>
                  <div className="ml-auto flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
                    <button
                      onClick={() => setShowAll(false)}
                      className={`px-3 py-1 transition font-medium ${!showAll ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setShowAll(true)}
                      className={`px-3 py-1 transition font-medium ${showAll ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      Recientes
                    </button>
                  </div>
                </div>

                {displayOrders.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <History className="w-8 h-8 mx-auto text-gray-200 dark:text-gray-700 mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      {showAll ? 'Sin ventas registradas' : 'Sin ventas hoy'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-96 overflow-y-auto">
                    {displayOrders.map(order => {
                      const dt = order.createdAt ? new Date(order.createdAt) : null
                      const time = dt ? dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'
                      const date = dt ? dt.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '—'
                      const items = order.items ?? []
                      const totalItems = items.reduce((s, i) => s + (i.quantity ?? 1), 0)
                      return (
                        <div key={order.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {showAll ? `${date} ` : ''}{time}
                              </span>
                              <span>·</span>
                              <span>{totalItems} {totalItems === 1 ? 'unidad' : 'unidades'}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{fmt(order.totalPrice)}</span>
                          </div>
                          {items.map((item, idx) => (
                            <p key={idx} className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {item.productName ?? 'Producto'} × {item.quantity}
                            </p>
                          ))}
                          {order.notes && (
                            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 italic leading-snug">
                              {order.notes}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm sale modal ──────────────────────────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Confirmar venta</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'} · {fmt(cartTotal)}</p>
              </div>
              <button
                onClick={() => !submitting && setConfirmOpen(false)}
                className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Items summary */}
            <div className="px-5 py-3 border-b border-gray-50 dark:border-gray-800 space-y-1.5">
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{product.name} <span className="text-gray-400">×{qty}</span></span>
                  <span className="font-medium text-gray-900 dark:text-white shrink-0 ml-2">{fmt(product.salePrice * qty)}</span>
                </div>
              ))}
            </div>

            {/* Note field */}
            <div className="px-5 py-4 space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Nota (opcional)
              </label>
              <textarea
                value={saleNote}
                onChange={e => setSaleNote(e.target.value)}
                placeholder="Ej: Pedido de María, para el viernes 20..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition"
              />
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                  : <><Check className="w-4 h-4" /> Registrar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PersonalSales
