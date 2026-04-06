import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, ScanLine, Plus, Minus, Trash2, X,
  Banknote, CreditCard, CheckCircle, ArrowLeft,
  Package, Search, Loader2, Camera, AlertCircle,
  ReceiptText,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AdminNavbar from '../../components/AdminNavbar'
import { toast } from '../../lib/swal'
import BarcodeScanner, { primeBeepAudio } from '../../components/BarcodeScanner'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + Number(n ?? 0).toLocaleString('es-CL')


// ── CartItem ──────────────────────────────────────────────────────────────────
function CartItem({ item, onAdd, onRemove, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Package className="w-5 h-5 text-gray-400" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
        {item.barcode && (
          <p className="text-xs text-gray-400 font-mono">{item.barcode}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(item.salePrice)} c/u</p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onRemove}
          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-7 text-center text-sm font-bold text-gray-900 dark:text-white">{item.qty}</span>
        <button onClick={onAdd} disabled={item.qty >= item.stock}
          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 transition ml-1">
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      <span className="w-20 text-right text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
        {fmt(item.salePrice * item.qty)}
      </span>
    </div>
  )
}

// ── SuccessScreen ─────────────────────────────────────────────────────────────
function SuccessScreen({ total, paymentMethod, itemCount, onNewSale }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">¡Venta registrada!</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-1">{itemCount} producto{itemCount !== 1 ? 's' : ''}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{fmt(total)}</p>
      <p className="text-sm text-gray-400 mb-8">
        {paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
      </p>
      <button onClick={onNewSale}
        className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition">
        Nueva venta
      </button>
    </div>
  )
}

// ── Main POS Page ─────────────────────────────────────────────────────────────
export default function PointOfSale() {
  const { shopId } = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  // ── Estado del shop ───────────────────────────────────────────────────────
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Carrito: { [productId]: { ...product, qty } } ─────────────────────────
  const [cart, setCart] = useState({})

  // ── Scanner ───────────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen]   = useState(false)
  const [scanning, setScanning]         = useState(false)  // procesando barcode
  const [scanError, setScanError]       = useState(null)
  const [scanFeedback, setScanFeedback] = useState(null)   // { type, message } para el banner interno
  const feedbackTimerRef                = useRef(null)

  // ── Búsqueda manual ───────────────────────────────────────────────────────
  const [manualBarcode, setManualBarcode] = useState('')
  const [searching, setSearching]         = useState(false)
  const manualRef = useRef(null)

  // ── Checkout ──────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [submitting, setSubmitting]       = useState(false)
  const [success, setSuccess]             = useState(null) // { total, itemCount }

  // ── Cargar shop ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.getMyShops()
      .then(shops => {
        const found = shops.find(s => s.id === shopId)
        if (found) setShop(found)
      })
      .finally(() => setLoading(false))
  }, [shopId])

  // ── Derived ───────────────────────────────────────────────────────────────
  const cartItems  = Object.values(cart)
  const cartTotal  = cartItems.reduce((sum, i) => sum + i.salePrice * i.qty, 0)
  const cartCount  = cartItems.reduce((sum, i) => sum + i.qty, 0)

  // ── Agregar producto al carrito ───────────────────────────────────────────
  const addProduct = useCallback((product) => {
    setScanError(null)
    if (product.stock <= 0) {
      setScanError(`"${product.name}" no tiene stock disponible.`)
      return
    }
    setCart(prev => {
      const existing = prev[product.id]
      if (existing) {
        if (existing.qty >= product.stock) {
          setScanError(`Stock máximo alcanzado para "${product.name}".`)
          return prev
        }
        return { ...prev, [product.id]: { ...existing, qty: existing.qty + 1 } }
      }
      return { ...prev, [product.id]: { ...product, qty: 1 } }
    })
  }, [])

  // ── Feedback temporal dentro del scanner ──────────────────────────────────
  const showScanFeedback = useCallback((type, message) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setScanFeedback({ type, message })
    feedbackTimerRef.current = setTimeout(() => setScanFeedback(null), 2000)
  }, [])

  // ── Buscar por código de barras (scanner o manual) ────────────────────────
  const lookupBarcode = useCallback(async (barcode, fromScanner = false) => {
    if (!barcode?.trim() || !shopId) return
    const code = barcode.trim()
    setScanning(true)
    setScanError(null)
    try {
      const product = await api.getProductByBarcode(shopId, code)
      if (!product) {
        const msg = `No encontrado: "${code}"`
        if (fromScanner) showScanFeedback('error', msg)
        else setScanError(`No se encontró ningún producto con el código "${code}".`)
        return
      }
      addProduct(product)
      if (fromScanner) {
        // Quedarse en el scanner — mostrar feedback de éxito y seguir escaneando
        showScanFeedback('success', `✓ ${product.name}`)
      } else {
        setScannerOpen(false)
      }
    } catch {
      const msg = `No encontrado: "${code}"`
      if (fromScanner) showScanFeedback('error', msg)
      else setScanError(`No se encontró ningún producto con el código "${code}".`)
    } finally {
      setScanning(false)
    }
  }, [shopId, addProduct, showScanFeedback])

  // ── Handler scanner ───────────────────────────────────────────────────────
  const handleBarcodeDetected = useCallback((barcode) => {
    if (scanning) return // evitar procesamiento simultáneo
    lookupBarcode(barcode, true) // fromScanner=true → no cierra el scanner
  }, [scanning, lookupBarcode])

  // ── Búsqueda manual ───────────────────────────────────────────────────────
  const handleManualSearch = async (e) => {
    e.preventDefault()
    if (!manualBarcode.trim()) return
    setSearching(true)
    await lookupBarcode(manualBarcode)
    setSearching(false)
    setManualBarcode('')
    manualRef.current?.focus()
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const removeOne  = (id) => setCart(prev => {
    const item = prev[id]
    if (!item) return prev
    if (item.qty <= 1) {
      const next = { ...prev }; delete next[id]; return next
    }
    return { ...prev, [id]: { ...item, qty: item.qty - 1 } }
  })
  const deleteItem = (id) => setCart(prev => { const next = { ...prev }; delete next[id]; return next })
  const clearCart  = () => setCart({})

  // ── Confirmar venta ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (cartItems.length === 0) return
    setSubmitting(true)
    try {
      await api.createOrder({
        shopId,
        source: 'pos',
        deliveryType: 'pickup',
        paymentMethod,
        clientAddress: null,
        notes: null,
        deliveryFee: 0,
        items: cartItems.map(i => ({ productId: i.id, quantity: i.qty })),
      })
      setSuccess({ total: cartTotal, itemCount: cartCount })
      clearCart()
    } catch (err) {
      toast.error(err?.message || 'Error al registrar la venta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewSale = () => {
    setSuccess(null)
    setScanError(null)
    setPaymentMethod('cash')
    manualRef.current?.focus()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AdminNavbar />

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/admin/shops/${shopId}`)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-gray-500" />
              <h1 className="font-bold text-gray-900 dark:text-white">Punto de venta</h1>
              {shop && <span className="text-sm text-gray-400">— {shop.name}</span>}
            </div>
          </div>
          {cartCount > 0 && (
            <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full">
              {cartCount} ítem{cartCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Scanner modal — permanece abierto hasta que el usuario lo cierre */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => {
            setScannerOpen(false)
            setScanFeedback(null)
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
          }}
          feedback={scanFeedback}
          processing={scanning}
        />
      )}

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* ── Panel izquierdo: scanner + carrito ── */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Scanner / búsqueda */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Agregar producto
            </p>

            {/* Botón abrir cámara */}
            <button
              onClick={() => { primeBeepAudio(); setScanError(null); setScannerOpen(true) }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition mb-3"
            >
              <Camera className="w-5 h-5" />
              Escanear código de barras
            </button>

            {/* Entrada manual */}
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={manualRef}
                  type="text"
                  inputMode="numeric"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  placeholder="Código de barras manual..."
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white font-mono"
                />
              </div>
              <button type="submit" disabled={searching || !manualBarcode.trim()}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-1.5">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </form>

            {/* Error de scan */}
            {scanError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {scanError}
              </div>
            )}
          </div>

          {/* Carrito */}
          {success ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex-1 flex flex-col">
              <SuccessScreen
                total={success.total}
                paymentMethod={paymentMethod}
                itemCount={success.itemCount}
                onNewSale={handleNewSale}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex-1 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Carrito {cartItems.length > 0 && `(${cartItems.length})`}
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <button onClick={clearCart}
                    className="text-xs text-red-500 hover:text-red-600 transition font-medium">
                    Vaciar
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-300 dark:text-gray-700">
                  <ShoppingCart className="w-12 h-12 mb-3" />
                  <p className="text-sm">Escanea un producto para comenzar</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4">
                  {cartItems.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onAdd={() => addProduct(item)}
                      onRemove={() => removeOne(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Panel derecho: resumen + pago ── */}
        {!success && (
          <div className="lg:w-80 flex flex-col gap-4">
            {/* Resumen */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Resumen
              </p>

              <div className="space-y-2 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300 truncate max-w-[160px]">
                      {item.name} × {item.qty}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {fmt(item.salePrice * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              {cartItems.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">{fmt(cartTotal)}</span>
                </div>
              )}

              {cartItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">Sin productos</p>
              )}
            </div>

            {/* Método de pago */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Método de pago
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash',     label: 'Efectivo',       icon: <Banknote className="w-4 h-4" /> },
                  { value: 'transfer', label: 'Transferencia',   icon: <CreditCard className="w-4 h-4" /> },
                ].map(({ value, label, icon }) => (
                  <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition ${
                      paymentMethod === value
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón confirmar */}
            <button
              onClick={handleConfirm}
              disabled={cartItems.length === 0 || submitting}
              className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-base hover:bg-gray-700 dark:hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
                : <><CheckCircle className="w-5 h-5" /> Confirmar venta · {fmt(cartTotal)}</>
              }
            </button>
          </div>
        )}
      </div>

      {/* CSS para la línea animada del scanner */}
      <style>{`
        @keyframes scan-line {
          0%   { transform: translateY(0); opacity: 1; }
          50%  { transform: translateY(168px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-scan-line { animation: scan-line 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
