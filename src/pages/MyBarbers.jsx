import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Scissors,
  Users,
  Star,
  Calendar,
  Clock,
  TrendingUp,
  Search,
  Compass,
  CreditCard,
  Images,
  ChevronLeft,
  ChevronRight,
  X,
  Globe,
  Store,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d        = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.floor((new Date() - d) / 86400000)
  if (diffDays === 0)  return 'Hoy'
  if (diffDays === 1)  return 'Ayer'
  if (diffDays < 7)   return `Hace ${diffDays} días`
  if (diffDays < 30)  return `Hace ${Math.floor(diffDays / 7)} sem.`
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes.`
  return `Hace ${Math.floor(diffDays / 365)} año(s)`
}

// ─── Componente principal ─────────────────────────────────────────────────────

function MyBarbers() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [appointments,    setAppointments]    = useState([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [sortBy,          setSortBy]          = useState('recent')
  const [portfolioBarber, setPortfolioBarber] = useState(null)

  useEffect(() => {
    api.getAppointments(user.userId)
      .then(data => setAppointments(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.userId])

  const barberMap = useMemo(() => {
    const map = {}
    appointments
      .filter(apt => apt.status === 'completed' && apt.barber?.id)
      .forEach(apt => {
        const bid = apt.barber.id
        if (!map[bid]) map[bid] = { barber: apt.barber, visits: 0, totalSpent: 0, lastDate: null, services: new Set() }
        map[bid].visits++
        map[bid].totalSpent += apt.totalPrice ?? 0
        if (!map[bid].lastDate || apt.date > map[bid].lastDate) map[bid].lastDate = apt.date
        if (apt.service?.name) map[bid].services.add(apt.service.name)
      })
    return map
  }, [appointments])

  const barberList = useMemo(() => {
    let list = Object.values(barberMap).map(e => ({ ...e, services: [...e.services] }))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.barber.name?.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      if (sortBy === 'visits') return b.visits - a.visits
      if (sortBy === 'alpha')  return a.barber.name.localeCompare(b.barber.name)
      return (b.lastDate ?? '').localeCompare(a.lastDate ?? '')
    })
    return list
  }, [barberMap, search, sortBy])

  const totalVisits  = Object.values(barberMap).reduce((s, e) => s + e.visits, 0)
  const totalSpent   = Object.values(barberMap).reduce((s, e) => s + e.totalSpent, 0)
  const totalBarbers = Object.keys(barberMap).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando historial...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Scissors className="w-5 h-5 text-white dark:text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Barberos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Historial de barberos con los que te has cortado</p>
          </div>
        </div>

        {totalBarbers > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard icon={<Users className="w-4 h-4" />}       label="Barberos"       value={totalBarbers}                    color="gray" />
            <StatCard icon={<Scissors className="w-4 h-4" />}    label="Visitas"        value={totalVisits}                     color="blue" />
            <StatCard icon={<CreditCard className="w-4 h-4" />}  label="Total gastado"  value={`$${totalSpent.toLocaleString()}`} color="black" />
          </div>
        )}

        {totalBarbers > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text" placeholder="Buscar barbero..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
            </div>
            <div className="flex gap-1.5">
              {[{ key: 'recent', label: 'Reciente' }, { key: 'visits', label: 'Más visitas' }, { key: 'alpha', label: 'A–Z' }].map(s => (
                <button key={s.key} onClick={() => setSortBy(s.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    sortBy === s.key
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        {barberList.length === 0
          ? <EmptyState navigate={navigate} hasHistory={totalBarbers > 0} search={search} />
          : (
            <div className="grid sm:grid-cols-2 gap-4">
              {barberList.map(({ barber, visits, totalSpent: spent, lastDate, services }) => (
                <BarberCard
                  key={barber.id}
                  barber={barber}
                  visits={visits}
                  totalSpent={spent}
                  lastDate={lastDate}
                  services={services}
                  navigate={navigate}
                  onViewPortfolio={() => setPortfolioBarber(barber)}
                />
              ))}
            </div>
          )
        }
      </div>

      {portfolioBarber && (
        <PortfolioModal barber={portfolioBarber} onClose={() => setPortfolioBarber(null)} />
      )}
    </div>
  )
}

// ─── Tarjeta de barbero ───────────────────────────────────────────────────────

function BarberCard({ barber, visits, totalSpent, lastDate, services, navigate, onViewPortfolio }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          {barber.imageUrl
            ? <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
            : <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{barber.name}</h3>
          {barber.rating != null && barber.rating > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">{Number(barber.rating).toFixed(1)}</span>
            </div>
          )}
          {barber.bio && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{barber.bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: <Scissors className="w-3 h-3" />, label: 'Cortes',   val: visits },
          { icon: <Calendar  className="w-3 h-3" />, label: 'Último',  val: timeAgo(lastDate) },
          { icon: <CreditCard className="w-3 h-3" />,label: 'Gastado', val: `$${totalSpent.toLocaleString()}` },
        ].map(({ icon, label, val }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 flex items-center justify-center gap-1">{icon}{label}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-50 leading-tight mt-0.5">{val}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <Clock className="w-3.5 h-3.5" />
        Último corte el <strong className="text-gray-600 dark:text-gray-300">{formatDate(lastDate)}</strong>
      </div>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.map((svc, i) => (
            <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{svc}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button onClick={onViewPortfolio}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <Images className="w-4 h-4" /> Portafolio
        </button>
        <button onClick={() => navigate('/booking')}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-gray-700 transition">
          <TrendingUp className="w-4 h-4" /> Reservar
        </button>
      </div>
    </div>
  )
}

// ─── Modal de Portafolio ──────────────────────────────────────────────────────

function PortfolioModal({ barber, onClose }) {
  const [galleries,     setGalleries]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [activeGallery, setActiveGallery] = useState(null)
  const [carousel,      setCarousel]      = useState(null)
  const thumbsRef                         = useRef(null)

  useEffect(() => {
    api.getBarberGalleries(barber.id)
      .then((data) => { setGalleries(data); if (data.length > 0) setActiveGallery(data[0]) })
      .catch(() => setGalleries([]))
      .finally(() => setLoading(false))
  }, [barber.id])

  const images = activeGallery?.images ?? []

  // Teclado para el carrusel
  useEffect(() => {
    if (!carousel) return
    const h = (e) => {
      if (e.key === 'ArrowLeft')  setCarousel(c => ({ index: (c.index - 1 + images.length) % images.length }))
      if (e.key === 'ArrowRight') setCarousel(c => ({ index: (c.index + 1) % images.length }))
      if (e.key === 'Escape')     setCarousel(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [carousel, images.length])

  // Scroll de miniaturas
  useEffect(() => {
    if (carousel === null || !thumbsRef.current) return
    const thumb = thumbsRef.current.children[carousel.index]
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [carousel])

  // Agrupar galerías por barbería
  const grouped = useMemo(() => {
    const map = {}
    galleries.forEach((g) => {
      const key   = g.shopId ?? 'general'
      const label = g.shopId ? (g.shopName ?? g.shopId) : 'General'
      if (!map[key]) map[key] = { label, galleries: [] }
      map[key].galleries.push(g)
    })
    return Object.values(map)
  }, [galleries])

  const currentImg = carousel !== null ? images[carousel.index] : null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
              {barber.imageUrl
                ? <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                : <Users className="w-5 h-5 text-gray-400" />
              }
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-50 text-base">{barber.name}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Portafolio de trabajos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar galerías */}
          <div className="w-44 shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto py-3 px-2 space-y-4">
            {loading && (
              <div className="flex justify-center pt-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
            {!loading && galleries.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-8 px-2">
                Este barbero aún no tiene galerías publicadas
              </p>
            )}
            {!loading && grouped.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1">
                  {group.label === 'General' ? <Globe className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                  {group.label}
                </p>
                {group.galleries.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setActiveGallery(g); setCarousel(null) }}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs font-medium transition mb-0.5 ${
                      activeGallery?.id === g.id
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${activeGallery?.id === g.id ? '' : 'text-amber-500'}`} />
                    <span className="truncate">{g.name}</span>
                    <span className={`ml-auto shrink-0 text-xs ${activeGallery?.id === g.id ? 'text-white/60 dark:text-gray-600' : 'text-gray-400'}`}>
                      {g.imageCount}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Grid de imágenes */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeGallery && images.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                  <Images className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">Esta galería está vacía</p>
              </div>
            )}

            {activeGallery && images.length > 0 && (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {images.length} foto{images.length !== 1 ? 's' : ''}
                  {activeGallery.description && ` · ${activeGallery.description}`}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {images.map((img, idx) => (
                    <div key={img.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
                      onClick={() => setCarousel({ index: idx })}
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.caption ?? 'Trabajo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="p-2 bg-white/90 rounded-full shadow">
                          <ChevronRight className="w-4 h-4 text-gray-800" />
                        </div>
                      </div>
                      {img.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{img.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Carrusel sobre el modal */}
      {carousel !== null && currentImg && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col" onClick={() => setCarousel(null)}>
          <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/70 text-sm font-medium tabular-nums">{carousel.index + 1} / {images.length}</span>
            <button onClick={() => setCarousel(null)} className="p-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center gap-3 px-4 min-h-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setCarousel(c => ({ index: (c.index - 1 + images.length) % images.length }))}
              disabled={images.length <= 1}
              className="shrink-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition disabled:opacity-30">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="relative flex items-center justify-center" style={{ maxWidth: '75vw', maxHeight: '65vh' }}>
              <img
                key={currentImg.id}
                src={currentImg.imageUrl}
                alt={currentImg.caption ?? 'Trabajo'}
                className="rounded-xl shadow-2xl object-contain"
                style={{ maxWidth: '75vw', maxHeight: '65vh', width: 'auto', height: 'auto' }}
              />
              {currentImg.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl px-4 py-3">
                  <p className="text-white text-sm text-center">{currentImg.caption}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setCarousel(c => ({ index: (c.index + 1) % images.length }))}
              disabled={images.length <= 1}
              className="shrink-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition disabled:opacity-30">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {images.length > 1 && (
            <div ref={thumbsRef}
              className="flex items-center gap-2 px-4 pb-4 pt-3 overflow-x-auto shrink-0"
              style={{ scrollbarWidth: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((im, i) => (
                <button key={im.id} onClick={() => setCarousel({ index: i })}
                  className={`shrink-0 rounded-lg overflow-hidden transition-all ${
                    i === carousel.index ? 'ring-2 ring-white opacity-100 scale-105' : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{ width: 56, height: 56 }}>
                  <img src={im.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  const colors = {
    gray:  'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200',
    blue:  'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    black: 'bg-gray-900 border-gray-900 text-white',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 text-xs opacity-70">{icon}{label}</div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function EmptyState({ navigate, hasHistory, search }) {
  if (hasHistory && search) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="font-medium text-gray-600 dark:text-gray-300">Sin resultados para "{search}"</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Intenta con otro nombre</p>
      </div>
    )
  }
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
      <Scissors className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
      <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Aún no tienes historial de barberos</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
        Aquí aparecerán todos los barberos con los que te hayas cortado
      </p>
      <button onClick={() => navigate('/booking')}
        className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-700 transition">
        <Compass className="w-4 h-4" /> Explorar barberías
      </button>
    </div>
  )
}

export default MyBarbers
