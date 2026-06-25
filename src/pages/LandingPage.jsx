import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Store,
  CalendarCheck,
  Star,
  ShieldCheck,
  TrendingUp,
  Package,
  Users,
  BarChart2,
  Scissors,
  Dumbbell,
  Sparkles,
  ShoppingBag,
  Car,
  MapPin,
  Menu,
  X,
  ArrowRight,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'
import { api } from '../lib/api'

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="fixed top-0 inset-x-0 z-30 bg-gray-900/95 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">WeServ</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#consumidores" className="text-sm text-gray-400 hover:text-white transition">Para clientes</a>
          <a href="#negocios" className="text-sm text-gray-400 hover:text-white transition">Para negocios</a>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-300 hover:text-white font-medium transition px-3 py-1.5">
            Iniciar sesión
          </Link>
          <Link to="/register" className="text-sm bg-white text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            Registrarse gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden p-2 text-gray-400 hover:text-white transition">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-gray-900 border-t border-white/10 px-5 py-4 flex flex-col gap-3">
          <a href="#consumidores" onClick={() => setOpen(false)} className="text-sm text-gray-300 hover:text-white py-1">Para clientes</a>
          <a href="#negocios"     onClick={() => setOpen(false)} className="text-sm text-gray-300 hover:text-white py-1">Para negocios</a>
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <Link to="/login"    className="text-sm text-center text-gray-300 hover:text-white font-medium py-2 border border-white/20 rounded-lg transition">
              Iniciar sesión
            </Link>
            <Link to="/register" className="text-sm text-center bg-white text-gray-900 font-semibold py-2 rounded-lg hover:bg-gray-100 transition">
              Registrarse gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Secciones ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: Scissors,    label: 'Barberías'  },
  { icon: Sparkles,    label: 'Estilistas' },
  { icon: Dumbbell,    label: 'Gimnasios'  },
  { icon: ShoppingBag, label: 'Bazares'    },
]

const CONSUMER_FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Reserva en segundos',
    desc:  'Agenda citas en tu negocio favorito sin llamadas ni esperas. Disponible 24/7.',
  },
  {
    icon: Star,
    title: 'Reseñas verificadas',
    desc:  'Lee opiniones reales de otros clientes y elige el profesional perfecto para ti.',
  },
  {
    icon: ShieldCheck,
    title: 'Sin complicaciones',
    desc:  'Recibe recordatorios automáticos y cancela cuando lo necesites sin penalizaciones.',
  },
]

const BUSINESS_FEATURES = [
  { icon: CalendarCheck, text: 'Gestión de citas online y presenciales' },
  { icon: TrendingUp,    text: 'Punto de venta (POS) integrado' },
  { icon: Package,       text: 'Control de inventario y stock' },
  { icon: Users,         text: 'Gestión de clientes y suscripciones' },
  { icon: BarChart2,     text: 'Estadísticas y reportes en tiempo real' },
]

// ─── Shops section ───────────────────────────────────────────────────────────

const CAT_CFG = {
  barberia:         { label: 'Barbería',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  estilista:        { label: 'Estilista',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  lashes:           { label: 'Lashes',      color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  bazar:            { label: 'Bazar',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  'gimnasio-boxeo': { label: 'Gym & Boxeo', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  transporte:       { label: 'Transporte',  color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
}

function getCatLabel(slug) { return CAT_CFG[slug]?.label ?? slug ?? '' }
function getCatColor(slug) { return CAT_CFG[slug]?.color ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' }

function getShopRating(barbers) {
  if (!barbers?.length) return null
  const sum = barbers.reduce((s, b) => s + (b.rating || 0), 0)
  return (sum / barbers.length).toFixed(1)
}

// Color de fondo para el avatar del negocio basado en el nombre
const AVATAR_COLORS = [
  'bg-blue-600','bg-violet-600','bg-rose-600','bg-amber-600',
  'bg-emerald-600','bg-cyan-600','bg-fuchsia-600','bg-orange-600',
]
function avatarColor(name = '') {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function ShopCard({ shop, catSlug, onClick }) {
  const rating   = getShopRating(shop.barbers)
  const initial  = (shop.name ?? '?')[0].toUpperCase()
  const catLabel = getCatLabel(catSlug)
  const catColor = getCatColor(catSlug)

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all w-full"
    >
      {/* Avatar strip */}
      <div className={`${avatarColor(shop.name)} h-24 flex items-center justify-center`}>
        <span className="text-4xl font-extrabold text-white/80">{initial}</span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {shop.name}
          </h3>
          {rating && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500 shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{rating}
            </span>
          )}
        </div>

        {catLabel && (
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${catColor}`}>
            {catLabel}
          </span>
        )}

        {shop.address && (
          <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 truncate">
            <MapPin className="w-3 h-3 shrink-0" />{shop.address}
          </p>
        )}

        {shop.barbers?.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
            <Users className="w-3 h-3 shrink-0" />{shop.barbers.length} profesional{shop.barbers.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>
    </button>
  )
}

// Skeleton placeholder mientras carga
function ShopSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="h-24 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-100 dark:bg-gray-750 rounded w-1/2" />
        <div className="h-3 bg-gray-100 dark:bg-gray-750 rounded w-2/3" />
      </div>
    </div>
  )
}

function ShopsSection({ onShopClick }) {
  const [shops,      setShops]      = useState([])
  const [catMap,     setCatMap]     = useState({})
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('rating') // 'rating' | 'recent'
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.getAllShops().catch(() => []),
      api.getCategories().catch(() => []),
    ]).then(([shopList, cats]) => {
      setShops(shopList || [])
      const map = {}
      ;(cats || []).forEach(c => { map[c.id] = c.slug })
      setCatMap(map)
    }).finally(() => setLoading(false))
  }, [])

  // No mostrar sección si no hay negocios y ya terminó de cargar
  if (!loading && shops.length === 0) return null

  const byRating = [...shops]
    .filter(s => getShopRating(s.barbers) != null)
    .sort((a, b) => getShopRating(b.barbers) - getShopRating(a.barbers))
    .slice(0, 6)

  const byRecent = [...shops]
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, 6)

  // Si "mejor valorados" está vacío porque nadie tiene rating, usar recientes
  const displayed = tab === 'rating' && byRating.length > 0 ? byRating : byRecent

  return (
    <section className="bg-gray-50 dark:bg-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Negocios</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mt-1">
              Descubre lo que hay cerca
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setTab('rating')}
              className={`px-4 py-2 text-sm font-medium transition ${tab === 'rating'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              ⭐ Mejor valorados
            </button>
            <button
              onClick={() => setTab('recent')}
              className={`px-4 py-2 text-sm font-medium transition ${tab === 'recent'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              🆕 Más recientes
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <ShopSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {displayed.map(shop => (
              <ShopCard
                key={shop.id}
                shop={shop}
                catSlug={catMap[shop.categoryId] ?? ''}
                onClick={() => onShopClick(shop)}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-10">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold px-7 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition"
          >
            Ver todos los negocios <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── LandingPage ──────────────────────────────────────────────────────────────

function LandingPage() {
  const navigate = useNavigate()

  // Al hacer click en un negocio sin estar logueado → login
  const handleShopClick = () => navigate('/login')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gray-900 pt-16 overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 py-24 md:py-36 text-center">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-medium px-3 py-1 rounded-full mb-6 border border-white/15">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Negocios activos en tu ciudad
          </span>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Encuentra y reserva<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400"> los mejores servicios</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Barberías, estilistas, gimnasios y más. Agenda tu próxima cita en segundos,
            sin llamadas, sin esperas.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-bold text-base px-8 py-3.5 rounded-xl hover:bg-gray-100 transition shadow-lg"
            >
              Comenzar gratis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-white/20 border border-white/20 transition"
            >
              Ya tengo cuenta
            </button>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {CATEGORIES.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 bg-white/8 text-gray-300 text-sm px-4 py-1.5 rounded-full border border-white/10">
                <Icon className="w-3.5 h-3.5" /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-white dark:bg-gray-950"
          style={{ clipPath: 'ellipse(100% 100% at 50% 100%)' }} />
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-950 py-14">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '500+',  label: 'Negocios registrados'  },
              { value: '24/7',  label: 'Disponible siempre'    },
              { value: '100%',  label: 'Gratis para clientes'  },
              { value: '★ 4.9', label: 'Valoración media'      },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For consumers ────────────────────────────────────────────────── */}
      <section id="consumidores" className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Para clientes</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mt-2">
              Tu agenda, siempre bajo control
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto">
              Reserva citas en los mejores negocios de tu ciudad desde cualquier dispositivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONSUMER_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white dark:bg-gray-800 rounded-2xl p-7 border border-gray-100 dark:border-gray-700">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-7 py-3 rounded-xl hover:bg-blue-700 transition"
            >
              Crear mi cuenta gratis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── For businesses ───────────────────────────────────────────────── */}
      <section id="negocios" className="bg-white dark:bg-gray-950 py-20">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

            {/* Left: text */}
            <div>
              <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Para negocios</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mt-2 mb-4">
                Todo lo que tu negocio necesita en un solo lugar
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Desde la gestión de citas hasta el control de inventario y ventas. WeServ te da
                las herramientas para hacer crecer tu negocio sin complicaciones.
              </p>

              <ul className="space-y-4 mb-10">
                {BUSINESS_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-50 dark:bg-violet-950 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{text}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold px-7 py-3 rounded-xl hover:bg-gray-700 dark:hover:bg-gray-100 transition"
              >
                Registra tu negocio <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: visual card */}
            <div className="bg-gray-900 rounded-3xl p-7 border border-gray-800 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Panel de administración</p>
                  <p className="text-gray-500 text-xs">Resumen del día</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Citas hoy',   value: '12',      color: 'text-blue-400'   },
                  { label: 'Ingresos',    value: '$84.000',  color: 'text-green-400'  },
                  { label: 'Productos',   value: '48',      color: 'text-orange-400' },
                  { label: 'Clientes',    value: '230',     color: 'text-violet-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {['Corte + barba · 10:00', 'Coloración · 11:30', 'Manicure · 12:00'].map(appt => (
                  <div key={appt} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2.5 border border-white/10">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-gray-300 text-sm">{appt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shops section ────────────────────────────────────────────────── */}
      <ShopsSection onShopClick={handleShopClick} />

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            ¿Listo para comenzar?
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Crea tu cuenta gratis en menos de un minuto y empieza a reservar o gestionar tu negocio hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition text-base shadow-lg"
            >
              Crear cuenta gratis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-400 hover:text-white font-medium px-8 py-3.5 rounded-xl border border-white/20 hover:border-white/40 transition text-base"
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-gray-900" />
            </div>
            <span className="text-white font-bold text-sm">WeServ</span>
          </div>
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} WeServ. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/login"    className="text-xs text-gray-500 hover:text-gray-300 transition">Iniciar sesión</Link>
            <Link to="/register" className="text-xs text-gray-500 hover:text-gray-300 transition">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
