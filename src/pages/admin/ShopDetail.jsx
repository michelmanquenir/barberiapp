import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Scissors,
  ArrowLeft,
  LogOut,
  UserPlus,
  UserMinus,
  Link2,
  Copy,
  Check,
  Plus,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function ShopDetail() {
  const { shopId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [allBarbers, setAllBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Panel para agregar barbero existente
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [addingBarber, setAddingBarber] = useState(false)
  const [addError, setAddError] = useState(null)

  // Panel para crear nuevo barbero
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [newBarber, setNewBarber] = useState({ name: '', bio: '', imageUrl: '' })
  const [creatingBarber, setCreatingBarber] = useState(false)
  const [createError, setCreateError] = useState(null)

  const loadShop = () => {
    return api
      .getMyShops()
      .then((shops) => {
        const found = shops.find((s) => s.id === shopId)
        if (!found) throw new Error('Negocio no encontrado')
        setShop(found)
      })
  }

  useEffect(() => {
    Promise.all([loadShop(), api.getBarbers()])
      .then(([, barbers]) => setAllBarbers(barbers))
      .catch(() => setError('No se pudo cargar la información del negocio'))
      .finally(() => setLoading(false))
  }, [shopId])

  const memberIds = new Set((shop?.barbers ?? []).map((b) => b.id))

  const availableBarbers = allBarbers.filter((b) => !memberIds.has(b.id))

  const handleCopyLink = () => {
    if (!shop) return
    navigator.clipboard.writeText(`${window.location.origin}/book/${shop.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddBarber = async () => {
    if (!selectedBarberId) return
    setAddingBarber(true)
    setAddError(null)
    try {
      await api.addBarberToShop(shopId, selectedBarberId)
      setSelectedBarberId('')
      setShowAddPanel(false)
      setLoading(true)
      await loadShop()
    } catch {
      setAddError('No se pudo agregar el barbero')
    } finally {
      setAddingBarber(false)
      setLoading(false)
    }
  }

  const handleRemoveBarber = async (barberId) => {
    if (!window.confirm('¿Quitar este barbero del negocio?')) return
    try {
      await api.removeBarberFromShop(shopId, barberId)
      setLoading(true)
      await loadShop()
    } catch {
      alert('No se pudo quitar el barbero')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBarber = async (e) => {
    e.preventDefault()
    if (!newBarber.name.trim()) return
    setCreatingBarber(true)
    setCreateError(null)
    try {
      const created = await api.createBarberProfile(newBarber)
      // Agregar el barbero recién creado al negocio
      await api.addBarberToShop(shopId, created.id)
      setNewBarber({ name: '', bio: '', imageUrl: '' })
      setShowCreatePanel(false)
      setLoading(true)
      await Promise.all([loadShop(), api.getBarbers().then(setAllBarbers)])
    } catch {
      setCreateError('No se pudo crear el barbero')
    } finally {
      setCreatingBarber(false)
      setLoading(false)
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
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowCreatePanel(!showCreatePanel)
                        setShowAddPanel(false)
                      }}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nuevo barbero
                    </button>
                    <button
                      onClick={() => {
                        setShowAddPanel(!showAddPanel)
                        setShowCreatePanel(false)
                      }}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Agregar existente
                    </button>
                  </div>
                </div>

                {/* Panel: Agregar barbero existente */}
                {showAddPanel && (
                  <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-blue-800">
                        Agregar barbero existente
                      </p>
                      <button onClick={() => setShowAddPanel(false)}>
                        <X className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    {addError && (
                      <p className="text-xs text-red-600 mb-2">{addError}</p>
                    )}
                    {availableBarbers.length === 0 ? (
                      <p className="text-sm text-blue-600">
                        No hay barberos disponibles para agregar. Crea un nuevo barbero.
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={selectedBarberId}
                          onChange={(e) => setSelectedBarberId(e.target.value)}
                          className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Seleccionar barbero...</option>
                          {availableBarbers.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddBarber}
                          disabled={!selectedBarberId || addingBarber}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {addingBarber ? 'Agregando...' : 'Agregar'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Panel: Crear nuevo barbero */}
                {showCreatePanel && (
                  <form onSubmit={handleCreateBarber} className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-green-800">Crear nuevo barbero</p>
                      <button type="button" onClick={() => setShowCreatePanel(false)}>
                        <X className="w-4 h-4 text-green-500" />
                      </button>
                    </div>
                    {createError && (
                      <p className="text-xs text-red-600">{createError}</p>
                    )}
                    <input
                      type="text"
                      placeholder="Nombre del barbero *"
                      value={newBarber.name}
                      onChange={(e) => setNewBarber((b) => ({ ...b, name: e.target.value }))}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Biografía (opcional)"
                      value={newBarber.bio}
                      onChange={(e) => setNewBarber((b) => ({ ...b, bio: e.target.value }))}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                    <input
                      type="url"
                      placeholder="URL de foto (opcional)"
                      value={newBarber.imageUrl}
                      onChange={(e) => setNewBarber((b) => ({ ...b, imageUrl: e.target.value }))}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={creatingBarber}
                      className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {creatingBarber ? 'Creando y agregando...' : 'Crear y agregar al negocio'}
                    </button>
                  </form>
                )}

                {/* Lista de barberos miembros */}
                {(shop.barbers?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aún no hay barberos en este negocio
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {shop.barbers.map((barber) => (
                      <div
                        key={barber.id}
                        className="flex items-center justify-between py-3"
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
                            <p className="text-sm font-medium text-gray-900">{barber.name}</p>
                            {barber.bio && (
                              <p className="text-xs text-gray-500 line-clamp-1">{barber.bio}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveBarber(barber.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50"
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
