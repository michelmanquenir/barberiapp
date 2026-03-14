import { useEffect, useState } from 'react'
import {
  Users, CheckCircle, XCircle, Clock, Search,
  FileText, Image as ImageIcon, ExternalLink,
} from 'lucide-react'
import SuperAdminLayout from './SuperAdminLayout'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'ALL',      label: 'Todos'      },
  { key: 'PENDING',  label: 'Pendientes' },
  { key: 'ACTIVE',   label: 'Activos'    },
  { key: 'REJECTED', label: 'Rechazados' },
]

const ROLE_LABEL  = { CLIENT: 'Cliente', BARBER: 'Barbero' }
const ROLE_COLOR  = {
  CLIENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  BARBER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendiente',  icon: Clock,        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  ACTIVE:   { label: 'Activo',     icon: CheckCircle,  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  REJECTED: { label: 'Rechazado',  icon: XCircle,      color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

function SuperAdminUsers() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch]     = useState('')
  const [actionId, setActionId] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await api.superAdmin.listUsers()
      setUsers(data || [])
    } catch {
      toast.error('No se pudo cargar la lista de usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleApprove = async (u) => {
    const ok = await confirm(
      `Aprobar a ${u.fullName || u.email}`,
      'El usuario podrá agendar citas y usar la app sin restricciones.',
      { confirmText: 'Sí, aprobar', icon: 'question' }
    )
    if (!ok) return
    setActionId(u.id)
    try {
      await api.superAdmin.approveUser(u.id)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'ACTIVE' } : x))
      toast.success(`${u.fullName || u.email} aprobado`)
    } catch {
      toast.error('No se pudo aprobar al usuario')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (u) => {
    const ok = await confirmDanger(
      `Rechazar a ${u.fullName || u.email}`,
      'El usuario no podrá agendar citas ni realizar acciones.'
    )
    if (!ok) return
    setActionId(u.id)
    try {
      await api.superAdmin.rejectUser(u.id)
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'REJECTED' } : x))
      toast.success(`${u.fullName || u.email} rechazado`)
    } catch {
      toast.error('No se pudo rechazar al usuario')
    } finally {
      setActionId(null)
    }
  }

  // Filtros
  const filtered = users.filter(u => {
    const matchesTab = activeTab === 'ALL' || u.status === activeTab
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      u.email?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  // Contadores para tabs
  const counts = {
    ALL:      users.length,
    PENDING:  users.filter(u => u.status === 'PENDING').length,
    ACTIVE:   users.filter(u => u.status === 'ACTIVE').length,
    REJECTED: users.filter(u => u.status === 'REJECTED').length,
  }

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Usuarios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Aprueba o rechaza usuarios para darles acceso a la plataforma.
        </p>
      </div>

      {/* Estadísticas rápidas */}
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
          placeholder="Buscar por nombre o email..."
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
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(u => {
            const statusCfg = STATUS_CONFIG[u.status] ?? STATUS_CONFIG.PENDING
            const StatusIcon = statusCfg.icon
            const isPdf = u.dniUrl?.toLowerCase().includes('.pdf')
            const isActing = actionId === u.id

            return (
              <div
                key={u.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.fullName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                        {u.fullName?.charAt(0)?.toUpperCase() ?? u.email?.charAt(0)?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                        {u.fullName || '(sin nombre)'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role] ?? ''}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    {u.createdAt && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Registrado: {new Date(u.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}

                    {/* DNI */}
                    {u.dniUrl ? (
                      <a
                        href={u.dniUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {isPdf ? <FileText className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        Ver documento de identidad
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Sin DNI cargado
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {u.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleApprove(u)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                    )}
                    {u.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleReject(u)}
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

export default SuperAdminUsers
