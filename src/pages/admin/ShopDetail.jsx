import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Scissors,
  ArrowLeft,
  LogOut,
  UserMinus,
  Link2,
  Copy,
  Check,
  Search,
  UserPlus,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function ShopDetail() {
  const { shopId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Buscador de barberos registrados
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState(null)

  const loadShop = useCallback(async () => {
    const shops = await api.getMyShops()
    const found = shops.find((s) => s.id === shopId)
    if (!found) throw new Error('Negocio no encontrado')
    setShop(found)
  }, [shopId])

  useEffect(() => {
    loadShop()
      .catch(() => setError('No se pudo cargar la información del negocio'))
      .finally(() => setLoading(false))
  }, [loadShop])

  // Buscar barberos con debounce
  useEffect(() => {
    if (!showSearch) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await api.searchBarbers(query)
        // Filtrar los que ya están en el negocio
        const memberIds = new Set((shop?.barbers ?? []).map((b) => b.id))
        setSearchResults(results.filter((b) => !memberIds.has(b.id)))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, showSearch, shop])

  const handleCopyLink = () => {
    if (!shop) return
    navigator.clipboard.writeText(`${window.location.origin}/book/${shop.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddBarber = async (barberId) => {
    setAddingId(barberId)
    try {
      await api.addBarberToShop(shopId, barberId)
      await loadShop()
      // Actualizar resultados quitando el barbero recién agregado
      setSearchResults((prev) => prev.filter((b) => b.id !== barberId))
    } catch {
      alert('No se pudo agregar el barbero')
    } finally {
      setAddingId(null)
    }
  }

  const handleRemoveBarber = async (barberId) => {
    if (!window.confirm('¿Quitar este barbero del negocio?')) return
    try {
      await api.removeBarberFromShop(shopId, barberId)
      await loadShop()
    } catch {
      alert('No se pudo quitar el barbero')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gray-900 text-white fixed w-full z-30 top-0">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="w-6 h-6" />
            <span className="text-xl font-bold">BarberShop Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{user?.fullName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back */}
          <button
            onClick={() => navigate('/admin/shops')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Mis negocios
          </button>

          {loading && !shop && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          {shop && (
            <div className="space-y-6">
              {/* Info del negocio */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{shop.name}</h2>
                    {shop.description && (
                      <p className="text-gray-500 text-sm mt-1">{shop.description}</p>
                    )}
                    <span
                      className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                        shop.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {shop.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                {/* Link público */}
                <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Link público de reservas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-mono text-gray-600 bg-white border border-gray-200 rounded px-3 py-1.5 truncate">
                      {window.location.origin}/book/{shop.slug}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition whitespace-nowrap"
                    >
                      {copied ? (
                        <><Check className="w-3.5 h-3.5" />Copiado</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" />Copiar</>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/book/${shop.slug}`)}
                      className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              </div>

              {/* Barberos */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Barberos ({shop.barbers?.length ?? 0})
                  </h3>
                  <button
                    onClick={() => {
                      setShowSearch(!showSearch)
                      setQuery('')
                      setSearchResults([])
                    }}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${
                      showSearch
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                  >
                    {showSearch ? (
                      <><X className="w-3.5 h-3.5" />Cerrar</>
                    ) : (
                      <><UserPlus className="w-3.5 h-3.5" />Agregar barbero</>
                    )}
                  </button>
                </div>

                {/* Buscador de barberos */}
                {showSearch && (
                  <div className="mb-5 border border-gray-200 rounded-xl overflow-hidden">
                    {/* Input */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar barbero por nombre..."
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
                      />
                      {searching && (
                        <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin flex-shrink-0" />
                      )}
                    </div>

                    {/* Resultados */}
                    <div className="max-h-56 overflow-y-auto">
                      {!searching && searchResults.length === 0 && (
                        <div className="text-center py-6 text-sm text-gray-400">
                          {query.trim()
                            ? 'No se encontraron barberos con ese nombre'
                            : 'Escribe un nombre para buscar barberos registrados'}
                        </div>
                      )}
                      {searchResults.map((barber) => (
                        <div
                          key={barber.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            {barber.imageUrl ? (
                              <img
                                src={barber.imageUrl}
                                alt={barber.name}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                                <Scissors className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{barber.name}</p>
                              {barber.bio && (
                                <p className="text-xs text-gray-400 line-clamp-1">{barber.bio}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddBarber(barber.id)}
                            disabled={addingId === barber.id}
                            className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 whitespace-nowrap"
                          >
                            {addingId === barber.id ? 'Agregando...' : 'Agregar'}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100">
                      <p className="text-xs text-blue-600">
                        💡 Solo aparecen barberos registrados en la plataforma. Comparte el link de registro si aún no tiene cuenta.
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de miembros actuales */}
                {(shop.barbers?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Scissors className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aún no hay barberos en este negocio.
                    <br />
                    <span className="text-xs">Agrega barberos registrados usando el buscador.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {shop.barbers.map((barber) => (
                      <div
                        key={barber.id}
                        className="flex items-center justify-between py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          {barber.imageUrl ? (
                            <img
                              src={barber.imageUrl}
                              alt={barber.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Scissors className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{barber.name}</p>
                              {barber.userId && (
                                <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                  Registrado
                                </span>
                              )}
                            </div>
                            {barber.bio && (
                              <p className="text-xs text-gray-400 line-clamp-1">{barber.bio}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveBarber(barber.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ShopDetail
