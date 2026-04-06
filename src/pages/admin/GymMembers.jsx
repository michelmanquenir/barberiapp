import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  User,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Dumbbell,
  Activity,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CreditCard,
  BarChart2,
  AlertTriangle,
  Shield,
  Phone,
  Mail,
  Award,
} from 'lucide-react'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'
import AdminNavbar from '../../components/AdminNavbar'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtTime(t) {
  if (!t) return '—'
  return t.substring(0, 5)
}

const MEMBERSHIP_STATUS = {
  active:    { label: 'Activa',    cls: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  expired:   { label: 'Expirada',  cls: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
}

const PAYMENT_STATUS = {
  paid:    { label: 'Pagado',    cls: 'text-green-600 dark:text-green-400' },
  pending: { label: 'Pendiente', cls: 'text-amber-600 dark:text-amber-400' },
  overdue: { label: 'Vencido',   cls: 'text-red-600 dark:text-red-400' },
}

const MEMBER_STATUS = {
  active:   { label: 'Activo',   cls: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' },
  inactive: { label: 'Inactivo', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
  suspended:{ label: 'Suspendido', cls: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
}

// ─── empty forms ──────────────────────────────────────────────────────────────

const EMPTY_MEMBER = {
  name: '', email: '', phone: '', rut: '', birthDate: '', joinDate: '',
  status: 'active', photoUrl: '', emergencyContactName: '', emergencyContactPhone: '', medicalNotes: '',
  createAppAccount: false,
}

const EMPTY_MEMBERSHIP = {
  planName: '', monthlyPrice: '', visitsAllowed: '', startDate: '', endDate: '',
  status: 'active', paymentStatus: 'pending', notes: '',
}

const EMPTY_CHECKIN = {
  memberId: '', attendanceDate: new Date().toISOString().substring(0, 10),
  checkInTime: new Date().toTimeString().substring(0, 5),
  classType: '', isTrialClass: false, notes: '',
}

const EMPTY_PROGRESS = {
  recordDate: new Date().toISOString().substring(0, 10),
  weightKg: '', heightCm: '', bodyFatPct: '',
  chestCm: '', waistCm: '', hipsCm: '', bicepCm: '', thighCm: '', notes: '',
}

// ─── tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'dashboard', label: 'Panel', icon: BarChart2 },
  { key: 'members',   label: 'Miembros', icon: Users },
  { key: 'checkin',   label: 'Check-in', icon: Activity },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GymMembers() {
  const { shopId } = useParams()
  const navigate = useNavigate()

  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Detail view
  const [selectedMember, setSelectedMember] = useState(null) // full member object
  const [memberTab, setMemberTab] = useState('profile') // profile | membership | attendance | progress
  const [memberships, setMemberships] = useState([])
  const [attendance, setAttendance] = useState([])
  const [progress, setProgress] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Forms / modals
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [savingMember, setSavingMember] = useState(false)

  const [showMembershipForm, setShowMembershipForm] = useState(false)
  const [membershipForm, setMembershipForm] = useState(EMPTY_MEMBERSHIP)
  const [editingMembershipId, setEditingMembershipId] = useState(null)
  const [savingMembership, setSavingMembership] = useState(false)

  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [checkinForm, setCheckinForm] = useState(EMPTY_CHECKIN)
  const [savingCheckin, setSavingCheckin] = useState(false)

  const [showProgressForm, setShowProgressForm] = useState(false)
  const [progressForm, setProgressForm] = useState(EMPTY_PROGRESS)
  const [editingProgressId, setEditingProgressId] = useState(null)
  const [savingProgress, setSavingProgress] = useState(false)

  // ─── Load ────────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [statsData, membersData, todayData] = await Promise.all([
        api.getGymStats(shopId),
        api.getGymMembers(shopId),
        api.getGymTodayAttendance(shopId),
      ])
      setStats(statsData)
      setMembers(membersData || [])
      setTodayAttendance(todayData || [])
    } catch (e) {
      toast.error(e.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [shopId])

  useEffect(() => { loadAll() }, [loadAll])

  const loadMemberDetail = useCallback(async (memberId) => {
    setLoadingDetail(true)
    try {
      const [mem, mships, att, prog] = await Promise.all([
        api.getGymMember(shopId, memberId),
        api.getGymMemberships(shopId, memberId),
        api.getGymMemberAttendance(shopId, memberId),
        api.getGymProgress(shopId, memberId),
      ])
      setSelectedMember(mem)
      setMemberships(mships || [])
      setAttendance(att || [])
      setProgress(prog || [])
    } catch (e) {
      toast.error(e.message || 'Error al cargar miembro')
    } finally {
      setLoadingDetail(false)
    }
  }, [shopId])

  // ─── Member CRUD ─────────────────────────────────────────────────────────────

  function openCreateMember() {
    setEditingMemberId(null)
    setMemberForm(EMPTY_MEMBER)
    setShowMemberForm(true)
  }

  function openEditMember(m) {
    setEditingMemberId(m.id)
    setMemberForm({
      name: m.name || '',
      email: m.email || '',
      phone: m.phone || '',
      rut: m.rut || '',
      birthDate: m.birthDate || '',
      joinDate: m.joinDate || '',
      status: m.status || 'active',
      photoUrl: m.photoUrl || '',
      emergencyContactName: m.emergencyContactName || '',
      emergencyContactPhone: m.emergencyContactPhone || '',
      medicalNotes: m.medicalNotes || '',
      createAppAccount: false, // nunca re-crear cuenta al editar
    })
    setShowMemberForm(true)
  }

  async function saveMember() {
    if (!memberForm.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setSavingMember(true)
    try {
      if (editingMemberId) {
        await api.updateGymMember(shopId, editingMemberId, memberForm)
        toast.success('Miembro actualizado')
        if (selectedMember?.id === editingMemberId) {
          await loadMemberDetail(editingMemberId)
        }
      } else {
        await api.createGymMember(shopId, memberForm)
        toast.success('Miembro creado')
      }
      setShowMemberForm(false)
      await loadAll()
    } catch (e) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSavingMember(false)
    }
  }

  async function deleteMember(m) {
    const ok = await confirmDanger(`¿Eliminar a ${m.name}?`, 'Se eliminará el miembro y todos sus registros.')
    if (!ok) return
    try {
      await api.deleteGymMember(shopId, m.id)
      toast.success('Miembro eliminado')
      if (selectedMember?.id === m.id) setSelectedMember(null)
      await loadAll()
    } catch (e) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  // ─── Membership CRUD ─────────────────────────────────────────────────────────

  function openCreateMembership() {
    setEditingMembershipId(null)
    const today = new Date().toISOString().substring(0, 10)
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10)
    setMembershipForm({ ...EMPTY_MEMBERSHIP, startDate: today, endDate: nextMonth })
    setShowMembershipForm(true)
  }

  function openEditMembership(ms) {
    setEditingMembershipId(ms.id)
    setMembershipForm({
      planName: ms.planName || '',
      monthlyPrice: ms.monthlyPrice ?? '',
      visitsAllowed: ms.visitsAllowed ?? '',
      startDate: ms.startDate || '',
      endDate: ms.endDate || '',
      status: ms.status || 'active',
      paymentStatus: ms.paymentStatus || 'pending',
      notes: ms.notes || '',
    })
    setShowMembershipForm(true)
  }

  async function saveMembership() {
    if (!selectedMember) return
    setSavingMembership(true)
    try {
      const data = {
        ...membershipForm,
        monthlyPrice: membershipForm.monthlyPrice !== '' ? Number(membershipForm.monthlyPrice) : null,
        visitsAllowed: membershipForm.visitsAllowed !== '' ? Number(membershipForm.visitsAllowed) : null,
      }
      if (editingMembershipId) {
        await api.updateGymMembership(shopId, editingMembershipId, data)
        toast.success('Membresía actualizada')
      } else {
        await api.createGymMembership(shopId, selectedMember.id, data)
        toast.success('Membresía creada')
      }
      setShowMembershipForm(false)
      await loadMemberDetail(selectedMember.id)
    } catch (e) {
      toast.error(e.message || 'Error al guardar membresía')
    } finally {
      setSavingMembership(false)
    }
  }

  // ─── Check-in ────────────────────────────────────────────────────────────────

  function openCheckin(memberId) {
    setCheckinForm({
      ...EMPTY_CHECKIN,
      memberId: memberId || '',
      attendanceDate: new Date().toISOString().substring(0, 10),
      checkInTime: new Date().toTimeString().substring(0, 5),
    })
    setShowCheckinForm(true)
  }

  async function saveCheckin() {
    if (!checkinForm.memberId) { toast.error('Selecciona un miembro'); return }
    setSavingCheckin(true)
    try {
      await api.gymCheckIn(shopId, {
        ...checkinForm,
        memberId: Number(checkinForm.memberId),
      })
      toast.success('Check-in registrado')
      setShowCheckinForm(false)
      await loadAll()
      if (selectedMember?.id === Number(checkinForm.memberId)) {
        await loadMemberDetail(selectedMember.id)
      }
    } catch (e) {
      toast.error(e.message || 'Error al registrar')
    } finally {
      setSavingCheckin(false)
    }
  }

  async function deleteAttendanceRecord(id) {
    const ok = await confirmDanger('¿Eliminar asistencia?', 'Esta acción no se puede deshacer.')
    if (!ok) return
    try {
      await api.deleteGymAttendance(shopId, id)
      toast.success('Asistencia eliminada')
      if (selectedMember) await loadMemberDetail(selectedMember.id)
      await loadAll()
    } catch (e) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  // ─── Progress CRUD ───────────────────────────────────────────────────────────

  function openAddProgress() {
    setEditingProgressId(null)
    setProgressForm({ ...EMPTY_PROGRESS, recordDate: new Date().toISOString().substring(0, 10) })
    setShowProgressForm(true)
  }

  function openEditProgress(p) {
    setEditingProgressId(p.id)
    setProgressForm({
      recordDate: p.recordDate || '',
      weightKg: p.weightKg ?? '',
      heightCm: p.heightCm ?? '',
      bodyFatPct: p.bodyFatPct ?? '',
      chestCm: p.chestCm ?? '',
      waistCm: p.waistCm ?? '',
      hipsCm: p.hipsCm ?? '',
      bicepCm: p.bicepCm ?? '',
      thighCm: p.thighCm ?? '',
      notes: p.notes || '',
    })
    setShowProgressForm(true)
  }

  async function saveProgress() {
    if (!selectedMember) return
    setSavingProgress(true)
    try {
      const toNum = (v) => v !== '' && v !== null && v !== undefined ? Number(v) : null
      const data = {
        recordDate: progressForm.recordDate,
        weightKg: toNum(progressForm.weightKg),
        heightCm: toNum(progressForm.heightCm),
        bodyFatPct: toNum(progressForm.bodyFatPct),
        chestCm: toNum(progressForm.chestCm),
        waistCm: toNum(progressForm.waistCm),
        hipsCm: toNum(progressForm.hipsCm),
        bicepCm: toNum(progressForm.bicepCm),
        thighCm: toNum(progressForm.thighCm),
        notes: progressForm.notes || null,
      }
      if (editingProgressId) {
        await api.updateGymProgress(shopId, selectedMember.id, editingProgressId, data)
        toast.success('Registro actualizado')
      } else {
        await api.addGymProgress(shopId, selectedMember.id, data)
        toast.success('Registro guardado')
      }
      setShowProgressForm(false)
      await loadMemberDetail(selectedMember.id)
    } catch (e) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSavingProgress(false)
    }
  }

  async function deleteProgressRecord(p) {
    const ok = await confirmDanger('¿Eliminar registro?', 'Esta acción no se puede deshacer.')
    if (!ok) return
    try {
      await api.deleteGymProgress(shopId, selectedMember.id, p.id)
      toast.success('Registro eliminado')
      await loadMemberDetail(selectedMember.id)
    } catch (e) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  // ─── Filtered members ────────────────────────────────────────────────────────

  const filteredMembers = members.filter(m =>
    search === '' ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search) ||
    m.rut?.includes(search)
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AdminNavbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminNavbar />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(`/admin/shops/${shopId}`)}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🥊 Gestión de Gym
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Miembros, membresías, asistencia y progreso</p>
          </div>
          <button
            onClick={loadAll}
            className="ml-auto p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
                  tab === t.key
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />{t.label}
              </button>
            )
          })}
        </div>

        {/* ── TAB: Dashboard ────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            todayAttendance={todayAttendance}
            members={members}
            onCheckin={() => { setTab('checkin'); openCheckin('') }}
            onViewMember={(m) => { setTab('members'); setSelectedMember(null); setTimeout(() => selectMember(m), 50) }}
          />
        )}

        {/* ── TAB: Miembros ─────────────────────────────────────────────── */}
        {tab === 'members' && !selectedMember && (
          <MembersListTab
            members={filteredMembers}
            search={search}
            setSearch={setSearch}
            onSelect={(m) => selectMember(m)}
            onAdd={openCreateMember}
            onEdit={openEditMember}
            onDelete={deleteMember}
            onCheckin={(m) => { setTab('checkin'); openCheckin(m.id) }}
          />
        )}

        {/* ── Member Detail ─────────────────────────────────────────────── */}
        {tab === 'members' && selectedMember && (
          <MemberDetailView
            member={selectedMember}
            memberTab={memberTab}
            setMemberTab={setMemberTab}
            memberships={memberships}
            attendance={attendance}
            progress={progress}
            loading={loadingDetail}
            onBack={() => setSelectedMember(null)}
            onEdit={() => openEditMember(selectedMember)}
            onDelete={() => deleteMember(selectedMember)}
            onCheckin={() => { setTab('checkin'); openCheckin(selectedMember.id) }}
            onAddMembership={openCreateMembership}
            onEditMembership={openEditMembership}
            onAddProgress={openAddProgress}
            onEditProgress={openEditProgress}
            onDeleteProgress={deleteProgressRecord}
            onDeleteAttendance={deleteAttendanceRecord}
          />
        )}

        {/* ── TAB: Check-in ─────────────────────────────────────────────── */}
        {tab === 'checkin' && (
          <CheckinTab
            members={members}
            todayAttendance={todayAttendance}
            onCheckin={openCheckin}
            onDeleteAttendance={deleteAttendanceRecord}
          />
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {showMemberForm && (
        <Modal title={editingMemberId ? 'Editar miembro' : 'Nuevo miembro'} onClose={() => setShowMemberForm(false)}>
          <MemberForm form={memberForm} setForm={setMemberForm} isEditing={!!editingMemberId} />
          <ModalFooter
            onCancel={() => setShowMemberForm(false)}
            onSave={saveMember}
            saving={savingMember}
            saveLabel={editingMemberId ? 'Guardar cambios' : 'Crear miembro'}
          />
        </Modal>
      )}

      {showMembershipForm && (
        <Modal title={editingMembershipId ? 'Editar membresía' : 'Nueva membresía'} onClose={() => setShowMembershipForm(false)}>
          <MembershipForm form={membershipForm} setForm={setMembershipForm} />
          <ModalFooter
            onCancel={() => setShowMembershipForm(false)}
            onSave={saveMembership}
            saving={savingMembership}
            saveLabel={editingMembershipId ? 'Guardar cambios' : 'Crear membresía'}
          />
        </Modal>
      )}

      {showCheckinForm && (
        <Modal title="Registrar asistencia" onClose={() => setShowCheckinForm(false)}>
          <CheckinForm form={checkinForm} setForm={setCheckinForm} members={members} />
          <ModalFooter
            onCancel={() => setShowCheckinForm(false)}
            onSave={saveCheckin}
            saving={savingCheckin}
            saveLabel="Registrar"
          />
        </Modal>
      )}

      {showProgressForm && (
        <Modal title={editingProgressId ? 'Editar registro' : 'Nuevo registro de progreso'} onClose={() => setShowProgressForm(false)} wide>
          <ProgressForm form={progressForm} setForm={setProgressForm} />
          <ModalFooter
            onCancel={() => setShowProgressForm(false)}
            onSave={saveProgress}
            saving={savingProgress}
            saveLabel={editingProgressId ? 'Guardar cambios' : 'Registrar'}
          />
        </Modal>
      )}
    </div>
  )

  function selectMember(m) {
    setMemberTab('profile')
    setSelectedMember(m)
    loadMemberDetail(m.id)
  }
}

// ─── DashboardTab ─────────────────────────────────────────────────────────────

function DashboardTab({ stats, todayAttendance, members, onCheckin }) {
  if (!stats) return null

  const statCards = [
    { label: 'Total miembros',    value: stats.totalMembers,      color: 'blue',   icon: Users },
    { label: 'Activos',           value: stats.activeMembers,     color: 'green',  icon: CheckCircle },
    { label: 'Membresías activas',value: stats.activeMemberships, color: 'emerald',icon: CreditCard },
    { label: 'Asistencias hoy',   value: stats.todayAttendances,  color: 'violet', icon: Activity },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 text-${s.color}-500`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
              </div>
              <p className={`text-3xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Today attendance */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" />
            Asistencia de hoy
          </h2>
          <button
            onClick={onCheckin}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />Check-in
          </button>
        </div>
        {todayAttendance.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Sin asistencias hoy</p>
        ) : (
          <div className="space-y-2">
            {todayAttendance.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{a.memberName || `ID ${a.memberId}`}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {a.classType || 'General'}{a.isTrialClass ? ' · Clase de prueba' : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{fmtTime(a.checkInTime)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent members */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-blue-500" />
          Últimos miembros
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Sin miembros registrados</p>
        ) : (
          <div className="space-y-2">
            {members.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-semibold text-blue-600 dark:text-blue-400 text-sm">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{m.email || m.phone || '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(MEMBER_STATUS[m.status] || MEMBER_STATUS.inactive).cls}`}>
                  {(MEMBER_STATUS[m.status] || MEMBER_STATUS.inactive).label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MembersListTab ───────────────────────────────────────────────────────────

function MembersListTab({ members, search, setSearch, onSelect, onAdd, onEdit, onDelete, onCheckin }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o RUT..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-sm px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />Nuevo miembro
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'Sin resultados' : 'No hay miembros registrados'}</p>
          {!search && <p className="text-sm mt-1">Crea el primer miembro del gym</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map(m => (
            <div key={m.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer"
              onClick={() => onSelect(m)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${(MEMBER_STATUS[m.status] || MEMBER_STATUS.inactive).cls}`}>
                      {(MEMBER_STATUS[m.status] || MEMBER_STATUS.inactive).label}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onCheckin(m)} title="Check-in"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                    <Activity className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onEdit(m)} title="Editar"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(m)} title="Eliminar"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {m.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</p>}
                {m.email && <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{m.email}</p>}
                {m.activeMembership && (
                  <p className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CreditCard className="w-3 h-3" />{m.activeMembership.planName || 'Plan activo'}
                    {m.activeMembership.endDate && ` · hasta ${fmtDate(m.activeMembership.endDate)}`}
                  </p>
                )}
                <p className="flex items-center gap-1"><Activity className="w-3 h-3" />{m.totalAttendances ?? 0} asistencias totales</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MemberDetailView ─────────────────────────────────────────────────────────

function MemberDetailView({
  member, memberTab, setMemberTab,
  memberships, attendance, progress, loading,
  onBack, onEdit, onDelete, onCheckin,
  onAddMembership, onEditMembership,
  onAddProgress, onEditProgress, onDeleteProgress,
  onDeleteAttendance,
}) {
  const DETAIL_TABS = [
    { key: 'profile',    label: 'Perfil',     icon: User },
    { key: 'membership', label: 'Membresía',  icon: CreditCard },
    { key: 'attendance', label: 'Asistencia', icon: Activity },
    { key: 'progress',   label: 'Progreso',   icon: TrendingUp },
  ]

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-lg">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{member.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(MEMBER_STATUS[member.status] || MEMBER_STATUS.inactive).cls}`}>
              {(MEMBER_STATUS[member.status] || MEMBER_STATUS.inactive).label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCheckin} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
            <Activity className="w-3.5 h-3.5" />Check-in
          </button>
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Pencil className="w-3.5 h-3.5" />Editar
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-0.5 mb-5 border-b border-gray-200 dark:border-gray-700">
            {DETAIL_TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.key} onClick={() => setMemberTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${
                    memberTab === t.key
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              )
            })}
          </div>

          {memberTab === 'profile' && <MemberProfile member={member} />}
          {memberTab === 'membership' && (
            <MemberMembership
              memberships={memberships}
              onAdd={onAddMembership}
              onEdit={onEditMembership}
            />
          )}
          {memberTab === 'attendance' && (
            <MemberAttendance attendance={attendance} onDelete={onDeleteAttendance} />
          )}
          {memberTab === 'progress' && (
            <MemberProgress
              progress={progress}
              onAdd={onAddProgress}
              onEdit={onEditProgress}
              onDelete={onDeleteProgress}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── MemberProfile ────────────────────────────────────────────────────────────

function MemberProfile({ member }) {
  const rows = [
    { label: 'Email', value: member.email },
    { label: 'Teléfono', value: member.phone },
    { label: 'RUT', value: member.rut },
    { label: 'Fecha de nacimiento', value: fmtDate(member.birthDate) },
    { label: 'Fecha de ingreso', value: fmtDate(member.joinDate) },
    { label: 'Contacto emergencia', value: member.emergencyContactName },
    { label: 'Teléfono emergencia', value: member.emergencyContactPhone },
  ]
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><User className="w-4 h-4" />Información personal</h3>
        <dl className="space-y-2">
          {rows.map(r => r.value ? (
            <div key={r.label} className="flex gap-2 text-sm">
              <dt className="text-gray-500 dark:text-gray-400 w-40 shrink-0">{r.label}</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{r.value}</dd>
            </div>
          ) : null)}
        </dl>
      </div>
      {member.medicalNotes && (
        <div className="bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-200 dark:border-amber-800 p-5">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />Notas médicas
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 whitespace-pre-wrap">{member.medicalNotes}</p>
        </div>
      )}
      {member.hasTakenTrialClass && (
        <div className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <Award className="w-4 h-4 text-violet-500" />
          Este miembro ya utilizó su clase de prueba gratuita.
        </div>
      )}
    </div>
  )
}

// ─── MemberMembership ─────────────────────────────────────────────────────────

function MemberMembership({ memberships, onAdd, onEdit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-white">Historial de membresías</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
          <Plus className="w-3.5 h-3.5" />Nueva membresía
        </button>
      </div>
      {memberships.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Sin membresías registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map(ms => {
            const msCls = MEMBERSHIP_STATUS[ms.status] || MEMBERSHIP_STATUS.cancelled
            const payCls = PAYMENT_STATUS[ms.paymentStatus] || PAYMENT_STATUS.pending
            return (
              <div key={ms.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{ms.planName || 'Sin nombre'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${msCls.cls}`}>{msCls.label}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {ms.monthlyPrice != null && <span>💰 ${ms.monthlyPrice.toLocaleString('es-CL')}</span>}
                      {ms.startDate && <span>📅 Desde {fmtDate(ms.startDate)}</span>}
                      {ms.endDate && <span>📅 Hasta {fmtDate(ms.endDate)}</span>}
                      {ms.visitsAllowed != null && (
                        <span>🎟 {ms.visitsUsed ?? 0} / {ms.visitsAllowed} visitas</span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${payCls.cls}`}>
                      Pago: {payCls.label}
                    </p>
                    {ms.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{ms.notes}</p>}
                  </div>
                  <button onClick={() => onEdit(ms)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MemberAttendance ─────────────────────────────────────────────────────────

function MemberAttendance({ attendance, onDelete }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Historial de asistencia</h3>
      {attendance.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Sin asistencias registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attendance.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{fmtDate(a.attendanceDate)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {fmtTime(a.checkInTime)}{a.classType ? ` · ${a.classType}` : ''}
                    {a.isTrialClass ? ' · Prueba' : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => onDelete(a.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MemberProgress ───────────────────────────────────────────────────────────

function MemberProgress({ progress, onAdd, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-white">Registros de progreso</h3>
        <button onClick={onAdd} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
          <Plus className="w-3.5 h-3.5" />Nuevo registro
        </button>
      </div>
      {progress.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Sin registros de progreso</p>
        </div>
      ) : (
        <div className="space-y-2">
          {progress.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{fmtDate(p.recordDate)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {p.weightKg != null ? `${p.weightKg} kg` : ''}
                      {p.bmi != null ? ` · IMC ${p.bmi}` : ''}
                      {p.bodyFatPct != null ? ` · ${p.bodyFatPct}% grasa` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); onEdit(p) }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(p) }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded === p.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              {expanded === p.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      { label: 'Peso', value: p.weightKg != null ? `${p.weightKg} kg` : null },
                      { label: 'Altura', value: p.heightCm != null ? `${p.heightCm} cm` : null },
                      { label: 'IMC', value: p.bmi != null ? p.bmi : null },
                      { label: '% Grasa', value: p.bodyFatPct != null ? `${p.bodyFatPct}%` : null },
                      { label: 'Pecho', value: p.chestCm != null ? `${p.chestCm} cm` : null },
                      { label: 'Cintura', value: p.waistCm != null ? `${p.waistCm} cm` : null },
                      { label: 'Cadera', value: p.hipsCm != null ? `${p.hipsCm} cm` : null },
                      { label: 'Bícep', value: p.bicepCm != null ? `${p.bicepCm} cm` : null },
                      { label: 'Muslo', value: p.thighCm != null ? `${p.thighCm} cm` : null },
                    ].filter(r => r.value != null).map(r => (
                      <div key={r.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{r.label}</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{r.value}</p>
                      </div>
                    ))}
                  </div>
                  {p.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{p.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CheckinTab ───────────────────────────────────────────────────────────────

function CheckinTab({ members, todayAttendance, onCheckin, onDeleteAttendance }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-white">Control de asistencia</h2>
        <button onClick={() => onCheckin('')} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
          <Plus className="w-3.5 h-3.5" />Registrar asistencia
        </button>
      </div>

      {/* Quick check-in by member */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Check-in rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {members.filter(m => m.status === 'active').slice(0, 12).map(m => (
            <button key={m.id} onClick={() => onCheckin(m.id)}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition text-left">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-800 dark:text-white font-medium truncate">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Asistencia de hoy ({todayAttendance.length})
        </h3>
        {todayAttendance.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Sin asistencias hoy</p>
        ) : (
          <div className="space-y-2">
            {todayAttendance.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{a.memberName || `Miembro #${a.memberId}`}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {fmtTime(a.checkInTime)}{a.classType ? ` · ${a.classType}` : ''}{a.isTrialClass ? ' · Prueba' : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => onDeleteAttendance(a.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Forms ────────────────────────────────────────────────────────────────────

function MemberForm({ form, setForm, isEditing = false }) {
  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) })
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Nombre *"><Input {...f('name')} placeholder="Nombre completo" /></FormField>
        <FormField label="RUT"><Input {...f('rut')} placeholder="12.345.678-9" /></FormField>
        <FormField label="Email"><Input type="email" {...f('email')} placeholder="correo@ejemplo.com" /></FormField>
        <FormField label="Teléfono"><Input {...f('phone')} placeholder="+56 9 1234 5678" /></FormField>
        <FormField label="Fecha de nacimiento"><Input type="date" {...f('birthDate')} /></FormField>
        <FormField label="Fecha de ingreso"><Input type="date" {...f('joinDate')} /></FormField>
        <FormField label="Estado">
          <select {...f('status')} className={selectCls}>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="suspended">Suspendido</option>
          </select>
        </FormField>
      </div>

      {/* Crear cuenta en la app — solo al crear (no al editar) */}
      {!isEditing && (
        <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.createAppAccount}
              onChange={e => setForm({ ...form, createAppAccount: e.target.checked })}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Crear cuenta en la app
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Se enviará un correo al alumno con sus credenciales de acceso y una contraseña provisional que deberá cambiar en su primer ingreso.
              </p>
            </div>
          </label>
          {form.createAppAccount && !form.email && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              ⚠️ Debes ingresar el email del alumno para enviar las credenciales.
            </p>
          )}
        </div>
      )}

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Contacto de emergencia</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Nombre"><Input {...f('emergencyContactName')} placeholder="Nombre del contacto" /></FormField>
          <FormField label="Teléfono"><Input {...f('emergencyContactPhone')} placeholder="+56 9 ..." /></FormField>
        </div>
      </div>
      <FormField label="Notas médicas / observaciones">
        <textarea {...f('medicalNotes')} rows={3} placeholder="Lesiones, condiciones, alergias..." className={`${inputCls} resize-none`} />
      </FormField>
    </div>
  )
}

function MembershipForm({ form, setForm }) {
  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) })
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Nombre del plan"><Input {...f('planName')} placeholder="ej. Mensual, Trimestral..." /></FormField>
        <FormField label="Precio mensual (CLP)"><Input type="number" {...f('monthlyPrice')} placeholder="25000" /></FormField>
        <FormField label="Visitas permitidas"><Input type="number" {...f('visitsAllowed')} placeholder="Vacío = ilimitadas" /></FormField>
        <FormField label="Estado">
          <select {...f('status')} className={selectCls}>
            <option value="active">Activa</option>
            <option value="expired">Expirada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </FormField>
        <FormField label="Inicio"><Input type="date" {...f('startDate')} /></FormField>
        <FormField label="Vencimiento"><Input type="date" {...f('endDate')} /></FormField>
        <FormField label="Estado de pago">
          <select {...f('paymentStatus')} className={selectCls}>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="overdue">Vencido</option>
          </select>
        </FormField>
      </div>
      <FormField label="Notas">
        <textarea {...f('notes')} rows={2} placeholder="Observaciones sobre la membresía..." className={`${inputCls} resize-none`} />
      </FormField>
    </div>
  )
}

function CheckinForm({ form, setForm, members }) {
  return (
    <div className="space-y-4">
      <FormField label="Miembro *">
        <select value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className={selectCls}>
          <option value="">Seleccionar miembro...</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </FormField>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Fecha"><Input type="date" value={form.attendanceDate} onChange={e => setForm({ ...form, attendanceDate: e.target.value })} /></FormField>
        <FormField label="Hora de entrada"><Input type="time" value={form.checkInTime} onChange={e => setForm({ ...form, checkInTime: e.target.value })} /></FormField>
      </div>
      <FormField label="Tipo de clase">
        <Input value={form.classType} onChange={e => setForm({ ...form, classType: e.target.value })} placeholder="ej. Boxeo, Crossfit, Funcional..." />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input type="checkbox" checked={form.isTrialClass} onChange={e => setForm({ ...form, isTrialClass: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
        Es clase de prueba
      </label>
      <FormField label="Notas">
        <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opcional..." />
      </FormField>
    </div>
  )
}

function ProgressForm({ form, setForm }) {
  const f = (field) => ({
    value: form[field],
    onChange: e => setForm({ ...form, [field]: e.target.value }),
  })
  return (
    <div className="space-y-4">
      <FormField label="Fecha del registro"><Input type="date" {...f('recordDate')} /></FormField>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <FormField label="Peso (kg)"><Input type="number" step="0.1" {...f('weightKg')} placeholder="70.5" /></FormField>
        <FormField label="Altura (cm)"><Input type="number" step="0.1" {...f('heightCm')} placeholder="175" /></FormField>
        <FormField label="% Grasa corporal"><Input type="number" step="0.1" {...f('bodyFatPct')} placeholder="18.5" /></FormField>
        <FormField label="Pecho (cm)"><Input type="number" step="0.1" {...f('chestCm')} placeholder="95" /></FormField>
        <FormField label="Cintura (cm)"><Input type="number" step="0.1" {...f('waistCm')} placeholder="82" /></FormField>
        <FormField label="Cadera (cm)"><Input type="number" step="0.1" {...f('hipsCm')} placeholder="96" /></FormField>
        <FormField label="Bícep (cm)"><Input type="number" step="0.1" {...f('bicepCm')} placeholder="35" /></FormField>
        <FormField label="Muslo (cm)"><Input type="number" step="0.1" {...f('thighCm')} placeholder="55" /></FormField>
      </div>
      <FormField label="Notas">
        <textarea {...f('notes')} rows={2} placeholder="Observaciones del progreso..." className={`${inputCls} resize-none`} />
      </FormField>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 dark:placeholder-gray-500'
const selectCls = `${inputCls}`

function Input(props) {
  return <input className={inputCls} {...props} />
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, wide, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving, saveLabel }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
      <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
        Cancelar
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-60">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saveLabel}
      </button>
    </div>
  )
}
