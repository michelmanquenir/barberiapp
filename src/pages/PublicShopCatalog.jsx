import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Plus, Minus, X, MapPin, Home, Package,
  CreditCard, Banknote, CheckCircle, ChevronDown, ChevronUp,
  Store, ArrowLeft, Loader2,
} from 'lucide-react'
import { Autocomplete } from '@react-google-maps/api'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + Number(n ?? 0).toLocaleString('es-AR')

const DELIVERY_LABELS = {
  pickup: { label: 'Retiro en local', icon: <Package className="w-4 h-4" /> },
  delivery: { label: 'Delivery', icon: <Home className="w-4 h-4" /> },
}

const PAYMENT_LABELS = {
  cash: { label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
  transfer: { label: 'Transferencia', icon: <CreditCard className="w-4 h-4" /> },
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, qty, onAdd, onRemove }) {
  const outOfStock = product.stock <= 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Package className="w-10 h-10 text-gray-300 dark:text-gray-500" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        {product.category && (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
            {product.category}
          </span>
        )}
        <p className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{product.name}</p>
        {product.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(product.salePrice)}</span>
          {outOfStock ? (
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-medium">
              Agotado
            </span>
          ) : lowStock ? (
            <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full font-medium">
              Últimas {product.stock} unidades
            </span>
          ) : (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full font-medium">
              En stock
            </span>
          )}
        </div>

        {/* Qty controls */}
        <div className="mt-3">
          {qty === 0 ? (
            <button
              onClick={onAdd}
              disabled={outOfStock}
              className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onRemove}
                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{qty}</span>
              <button
                onClick={onAdd}
                disabled={qty >= product.stock}
                className="w-9 h-9 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CheckoutModal ─────────────────────────────────────────────────────────────
function CheckoutModal({ cartItems, cartTotal, shop, onClose, onConfirm, submitting }) {
  const [deliveryType, setDeliveryType] = useState('pickup')
  const [address, setAddress] = useState('')
  const [distanceKm, setDistanceKm] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const autocompleteRef = useRef(null)

  const canDeliver = shop?.homeServiceEnabled

  // ── Haversine ───────────────────────────────────────────────────────────────
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  // ── Cuando Google selecciona un lugar ──────────────────────────────────────
  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry) return
    const formatted = place.formatted_address || place.name || ''
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setAddress(formatted)
    if (shop?.latitude && shop?.longitude) {
      const dist = haversineKm(shop.latitude, shop.longitude, lat, lng)
      setDistanceKm(dist)
    }
  }, [shop])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (deliveryType === 'delivery' && !address.trim()) return
    onConfirm({ deliveryType, clientAddress: address.trim() || null, paymentMethod, notes: notes.trim() || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-white">Confirmar pedido</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Resumen de items */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Tu pedido</p>
            <div className="space-y-1.5">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.quantity}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-gray-900 dark:text-white mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span>Total</span>
              <span>{fmt(cartTotal)}</span>
            </div>
          </div>

          {/* Tipo de entrega */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Tipo de entrega</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'pickup', label: 'Retiro en local', icon: <Package className="w-4 h-4" /> },
                ...(canDeliver ? [{ value: 'delivery', label: 'Delivery', icon: <Home className="w-4 h-4" /> }] : []),
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeliveryType(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition ${
                    deliveryType === opt.value
                      ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dirección si es delivery */}
          {deliveryType === 'delivery' && (
            <div>
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1">
                Dirección de entrega <span className="text-red-400">*</span>
              </label>
              <Autocomplete
                onLoad={(ref) => (autocompleteRef.current = ref)}
                onPlaceChanged={onPlaceChanged}
              >
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                  <input
                    type="text"
                    defaultValue={address}
                    placeholder="Escribe tu dirección..."
                    required
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  />
                </div>
              </Autocomplete>
              {distanceKm != null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  📍 Distancia estimada al local: <strong>{distanceKm.toFixed(1)} km</strong>
                </p>
              )}
              {!address && (
                <p className="text-xs text-red-400 mt-1">Debes seleccionar una dirección</p>
              )}
            </div>
          )}

          {/* Método de pago */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYMENT_LABELS).map(([value, { label, icon }]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition ${
                    paymentMethod === value
                      ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas opcionales */}
          <div>
            <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide block mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, aclaraciones..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? 'Realizando pedido...' : `Confirmar pedido · ${fmt(cartTotal)}`}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PublicShopCatalog() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carrito: { [productId]: quantity }
  const [cart, setCart] = useState({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  // Filtro de categoría
  const [activeCategory, setActiveCategory] = useState('Todos')

  useEffect(() => {
    setLoading(true)
    api.getShopBySlug(slug)
      .then(async (shopData) => {
        const prods = await api.getShopProducts(shopData.id).catch(() => [])
        setShop(shopData)
        setProducts(prods.filter(p => p.active !== false))
      })
      .catch(() => setError('Negocio no encontrado'))
      .finally(() => setLoading(false))
  }, [slug])

  // Cart helpers
  const addToCart = useCallback((productId) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }))
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart(prev => {
      const next = { ...prev }
      if ((next[productId] ?? 0) > 1) next[productId]--
      else delete next[productId]
      return next
    })
  }, [])

  // Derived cart data
  const cartItems = products
    .filter(p => (cart[p.id] ?? 0) > 0)
    .map(p => ({ ...p, quantity: cart[p.id], subtotal: p.salePrice * cart[p.id] }))

  const cartTotal = cartItems.reduce((sum, i) => sum + i.subtotal, 0)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  // Category filter
  const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))]
  const visibleProducts = activeCategory === 'Todos'
    ? products
    : products.filter(p => p.category === activeCategory)

  // Submit order
  const handleConfirmOrder = async ({ deliveryType, clientAddress, paymentMethod, notes }) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/shop/${slug}` } })
      return
    }
    if (cartItems.length === 0) return

    setSubmitting(true)
    try {
      await api.createOrder({
        shopId: shop.id,
        deliveryType,
        paymentMethod,
        clientAddress,
        notes,
        items: cartItems.map(i => ({ productId: i.id, quantity: i.quantity })),
      })
      setOrderPlaced(true)
      setCart({})
      setCheckoutOpen(false)
    } catch (err) {
      alert(err?.message || 'Error al realizar el pedido. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{error || 'Negocio no encontrado'}</p>
          <button onClick={() => navigate('/booking')} className="mt-4 text-sm text-blue-600 hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── Pedido exitoso ────────────────────────────────────────────────────────
  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Pedido realizado!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {shop.name} recibirá tu pedido y se comunicará para coordinar la entrega.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/appointments')}
              className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm"
            >
              Ver mis pedidos
            </button>
            <button
              onClick={() => setOrderPlaced(false)}
              className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm"
            >
              Seguir comprando
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/booking')}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{shop.name}</h1>
            {shop.address && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{shop.address}
              </p>
            )}
          </div>
          {shop.homeServiceEnabled && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium whitespace-nowrap">
              Delivery disponible
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeCategory === cat
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products grid */}
        {visibleProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                qty={cart[product.id] ?? 0}
                onAdd={() => addToCart(product.id)}
                onRemove={() => removeFromCart(product.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-30">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/login', { state: { from: `/shop/${slug}` } })
                return
              }
              setCheckoutOpen(true)
            }}
            className="flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-2xl shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition font-semibold"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span>Ver carrito · {fmt(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <CheckoutModal
          cartItems={cartItems}
          cartTotal={cartTotal}
          shop={shop}
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handleConfirmOrder}
          submitting={submitting}
        />
      )}
    </div>
  )
}
