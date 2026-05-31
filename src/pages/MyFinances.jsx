import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, PiggyBank,
  Plus, Trash2, Pencil, Check, X,
  DollarSign, Target, AlertCircle, Loader2,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ─── Constantes ─────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: 'COMIDA',      label: 'Comida',       emoji: '🛒' },
  { value: 'TRANSPORTE',  label: 'Transporte',   emoji: '🚌' },
  { value: 'OCIO',        label: 'Ocio',         emoji: '🎮' },
  { value: 'SALUD',       label: 'Salud',        emoji: '🏥' },
  { value: 'EDUCACION',   label: 'Educación',    emoji: '📚' },
  { value: 'HOGAR',       label: 'Hogar',        emoji: '🏠' },
  { value: 'ROPA',        label: 'Ropa',         emoji: '👕' },
  { value: 'TECNOLOGIA',  label: 'Tecnología',   emoji: '💻' },
  { value: 'OTRO',        label: 'Otro',         emoji: '📦' },
]

const CATEGORY_COLORS = {
  COMIDA:     '#f97316',
  TRANSPORTE: '#3b82f6',
  OCIO:       '#a855f7',
  SALUD:      '#22c55e',
  EDUCACION:  '#eab308',
  HOGAR:      '#14b8a6',
  ROPA:       '#ec4899',
  TECNOLOGIA: '#6366f1',
  OTRO:       '#94a3b8',
}

const TABS = [
  { id: 'resumen',  label: 'Resumen'   },
  { id: 'ingresos', label: 'Ingresos'  },
  { id: 'gastos',   label: 'Gastos'    },
  { id: 'metas',    label: 'Metas'     },
]

const fmt = (n) => `$${(n ?? 0).toLocaleString('es-CL')}`
const fmtDate = (d) => {
  if (!d) return '–'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CL') } catch { return d }
}

// ─── Helpers UI ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, required, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' +
  'text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors'

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm mb-4">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {msg}
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
    </div>
  )
}

function EmptyState({ icon: Icon, text, sub, onAdd, addLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{text}</p>
      <p className="text-sm text-gray-400 mb-5">{sub}</p>
      {onAdd && (
        <button onClick={onAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  )
}

// ─── Tarjetas de resumen ─────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{fmt(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── TAB: Resumen ────────────────────────────────────────────────────────────

function TabResumen({ summary }) {
  const barData = [
    { name: 'Ingresos', value: summary.monthlyIncome  ?? 0 },
    { name: 'Gastos',   value: summary.monthlyExpenses ?? 0 },
  ]

  const pieData = Object.entries(summary.expensesByCategory ?? {}).map(([cat, val]) => ({
    name:  EXPENSE_CATEGORIES.find(c => c.value === cat)?.label ?? cat,
    value: val,
    color: CATEGORY_COLORS[cat] ?? '#94a3b8',
  }))

  const balance = summary.monthlyBalance ?? 0

  return (
    <div className="space-y-6">
      {/* Tarjetas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          label="Ingresos del mes"
          value={summary.monthlyIncome}
          color="bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
        />
        <SummaryCard
          icon={TrendingDown}
          label="Gastos del mes"
          value={summary.monthlyExpenses}
          color="bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
        />
        <SummaryCard
          icon={DollarSign}
          label="Balance mensual"
          value={balance}
          color={balance >= 0
            ? 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
            : 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'}
        />
        <SummaryCard
          icon={PiggyBank}
          label="Total ahorrado"
          value={summary.totalSavings}
          color="bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400"
          sub="en todas tus metas"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">Ingresos vs Gastos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">Gastos por categoría</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">Sin gastos registrados este mes</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// ─── TAB: Ingresos ───────────────────────────────────────────────────────────

function TabIngresos({ userId, onRefreshSummary }) {
  const [incomes, setIncomes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [modal,   setModal]     = useState(null)
  const [error,   setError]     = useState('')
  const [form,    setForm]      = useState({ type: 'SALARY', description: '', amount: '', date: today() })

  const load = useCallback(() => {
    setLoading(true)
    api.getFinanceIncomes(userId)
      .then(data => setIncomes(data || []))
      .catch(() => setIncomes([]))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setError(''); setForm({ type: 'SALARY', description: '', amount: '', date: today() }); setModal('new') }
  const openEdit = (item) => { setError(''); setForm({ type: item.type, description: item.description ?? '', amount: item.amount, date: item.date ?? today() }); setModal(item) }

  const handleSave = async () => {
    setError('')
    const data = { ...form, amount: parseFloat(form.amount) }
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) { setError('Ingresa un monto válido mayor a 0.'); return }
    setSaving(true)
    try {
      if (modal === 'new') await api.createFinanceIncome(userId, data)
      else                  await api.updateFinanceIncome(modal.id, userId, data)
      setModal(null)
      load()
      onRefreshSummary()
    } catch (e) {
      setError(e.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este ingreso?')) return
    try {
      await api.deleteFinanceIncome(id, userId)
      load()
      onRefreshSummary()
    } catch (e) {
      alert('No se pudo eliminar: ' + (e.message || 'error desconocido'))
    }
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Mis Ingresos</h2>
          {!loading && incomes.length > 0 && (
            <p className="text-sm text-gray-400">{incomes.length} registro{incomes.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Agregar ingreso
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <LoadingRow key={i} />)}</div>
      ) : incomes.length === 0 ? (
        <EmptyState
          icon={ArrowUpCircle}
          text="Aún no tienes ingresos registrados"
          sub="Agrega tu sueldo o ingresos extra para llevar el control."
          onAdd={openNew}
          addLabel="Agregar primer ingreso"
        />
      ) : (
        <div className="space-y-3">
          {incomes.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                  ${item.type === 'SALARY'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'}`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-50 truncate">
                    {item.description || (item.type === 'SALARY' ? 'Sueldo fijo' : 'Ingreso extra')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.type === 'SALARY' ? 'Sueldo fijo' : 'Ingreso extra'} · {fmtDate(item.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className="text-base font-bold text-green-600 dark:text-green-400">+{fmt(item.amount)}</span>
                <button onClick={() => openEdit(item)}   title="Editar"   className="p-1 text-gray-400 hover:text-primary-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(item.id)} title="Eliminar" className="p-1 text-gray-400 hover:text-red-500  transition-colors"><Trash2  className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo ingreso' : 'Editar ingreso'} onClose={() => setModal(null)}>
          <ErrorBanner msg={error} />
          <FormField label="Tipo" required>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="SALARY">Sueldo fijo</option>
              <option value="EXTRA">Ingreso extra</option>
            </select>
          </FormField>
          <FormField label="Descripción">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Sueldo enero, Freelance, Bono..." className={inputCls} />
          </FormField>
          <FormField label="Monto" required>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Fecha" required>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </FormField>
          <ModalButtons onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ─── TAB: Gastos ─────────────────────────────────────────────────────────────

// Tipos internos para el formulario
const EXPENSE_TYPE_NORMAL    = 'normal'
const EXPENSE_TYPE_RECURRING = 'periodico'
const EXPENSE_TYPE_INSTALLMENT = 'cuotas'

function expenseTypeOf(item) {
  if (item.installmentNumber != null && item.installmentTotal != null) return EXPENSE_TYPE_INSTALLMENT
  if (item.recurring) return EXPENSE_TYPE_RECURRING
  return EXPENSE_TYPE_NORMAL
}

function buildFormFromItem(item) {
  return {
    category:           item.category,
    description:        item.description ?? '',
    amount:             item.amount,
    date:               item.date ?? today(),
    expenseType:        expenseTypeOf(item),
    installmentNumber:  item.installmentNumber ?? '',
    installmentTotal:   item.installmentTotal  ?? '',
  }
}

function buildEmptyForm() {
  return {
    category:           'COMIDA',
    description:        '',
    amount:             '',
    date:               today(),
    expenseType:        EXPENSE_TYPE_NORMAL,
    installmentNumber:  '',
    installmentTotal:   '',
  }
}

function formToPayload(form) {
  return {
    category:           form.category,
    description:        form.description,
    amount:             parseFloat(form.amount),
    date:               form.date,
    recurring:          form.expenseType === EXPENSE_TYPE_RECURRING,
    installmentNumber:  form.expenseType === EXPENSE_TYPE_INSTALLMENT ? parseInt(form.installmentNumber) || null : null,
    installmentTotal:   form.expenseType === EXPENSE_TYPE_INSTALLMENT ? parseInt(form.installmentTotal)  || null : null,
  }
}

function TabGastos({ userId, onRefreshSummary }) {
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [modal,    setModal]    = useState(null)   // null | 'new' | item
  const [error,    setError]    = useState('')
  const [form,     setForm]     = useState(buildEmptyForm())

  const load = useCallback(() => {
    setLoading(true)
    api.getFinanceExpenses(userId)
      .then(data => setExpenses(data || []))
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew  = (preset = {}) => {
    setError('')
    setForm({ ...buildEmptyForm(), ...preset })
    setModal('new')
  }

  const openEdit = (item) => {
    setError('')
    setForm(buildFormFromItem(item))
    setModal(item)
  }

  // Abre el form pre-llenado para registrar la SIGUIENTE cuota de un gasto
  const openNextInstallment = (item) => {
    openNew({
      category:          item.category,
      description:       item.description,
      amount:            item.amount,
      date:              today(),
      expenseType:       EXPENSE_TYPE_INSTALLMENT,
      installmentNumber: String((item.installmentNumber ?? 0) + 1),
      installmentTotal:  String(item.installmentTotal ?? ''),
    })
  }

  const handleSave = async () => {
    setError('')
    const data = formToPayload(form)
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      setError('Ingresa un monto válido mayor a 0.')
      return
    }
    if (form.expenseType === EXPENSE_TYPE_INSTALLMENT) {
      if (!data.installmentNumber || data.installmentNumber < 1) { setError('Número de cuota actual inválido.'); return }
      if (!data.installmentTotal  || data.installmentTotal  < 1) { setError('Total de cuotas inválido.'); return }
      if (data.installmentNumber > data.installmentTotal)       { setError('La cuota actual no puede ser mayor al total.'); return }
    }
    setSaving(true)
    try {
      if (modal === 'new') await api.createFinanceExpense(userId, data)
      else                  await api.updateFinanceExpense(modal.id, userId, data)
      setModal(null)
      load()
      onRefreshSummary()
    } catch (e) {
      setError(e.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return
    try {
      await api.deleteFinanceExpense(id, userId)
      load()
      onRefreshSummary()
    } catch (e) {
      alert('No se pudo eliminar: ' + (e.message || 'error desconocido'))
    }
  }

  // ── Totales por categoría (chips) ─────────────────────────────────────────
  const totalByCategory = expenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + (item.amount || 0)
    return acc
  }, {})

  // ── Planes en cuotas: agrupa por (descripción + total) ────────────────────
  // Muestra el MAYOR installmentNumber registrado como "última cuota pagada"
  const installmentPlans = useMemo(() => {
    const map = {}
    expenses
      .filter(e => e.installmentNumber != null && e.installmentTotal != null)
      .forEach(e => {
        const key = `${(e.description || e.category)}__${e.installmentTotal}`
        if (!map[key] || e.installmentNumber > map[key].lastPaid) {
          map[key] = {
            key,
            name:         e.description || EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category,
            category:     e.category,
            amount:       e.amount,
            lastPaid:     e.installmentNumber,
            total:        e.installmentTotal,
          }
        }
      })
    return Object.values(map).sort((a, b) => {
      // Activos primero (no terminados), luego por nombre
      const aDone = a.lastPaid >= a.total
      const bDone = b.lastPaid >= b.total
      if (aDone !== bDone) return aDone ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [expenses])

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Mis Gastos</h2>
          {!loading && expenses.length > 0 && (
            <p className="text-sm text-gray-400">
              {expenses.length} registro{expenses.length !== 1 ? 's' : ''} · Total: {fmt(expenses.reduce((s, i) => s + (i.amount || 0), 0))}
            </p>
          )}
        </div>
        <button onClick={() => openNew()} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Agregar gasto
        </button>
      </div>

      {/* Chips resumen por categoría */}
      {!loading && Object.keys(totalByCategory).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(totalByCategory).map(([cat, total]) => {
            const c = EXPENSE_CATEGORIES.find(x => x.value === cat)
            return (
              <span key={cat} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {c?.emoji} {c?.label}: {fmt(total)}
              </span>
            )
          })}
        </div>
      )}

      {/* ── Panel: planes en cuotas (derivado de los gastos registrados) ── */}
      {!loading && installmentPlans.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Planes en cuotas activos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {installmentPlans.map(plan => {
              const pct    = Math.min(100, Math.round((plan.lastPaid / plan.total) * 100))
              const done   = plan.lastPaid >= plan.total
              const left   = plan.total - plan.lastPaid
              const color  = CATEGORY_COLORS[plan.category] ?? '#94a3b8'
              return (
                <div key={plan.key} className={`rounded-xl border p-4 transition-opacity
                  ${done
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 opacity-60'
                    : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{EXPENSE_CATEGORIES.find(c => c.value === plan.category)?.emoji ?? '📦'}</span>
                      <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm truncate">{plan.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2
                      ${done
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'}`}>
                      {done ? '✓ Saldada' : `Cuota ${plan.lastPaid}/${plan.total}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>{fmt(plan.amount)}/mes</span>
                    {!done && <span>{left} cuota{left !== 1 ? 's' : ''} restante{left !== 1 ? 's' : ''} · {fmt(left * plan.amount)}</span>}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-orange-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Basado en los pagos registrados como "En cuotas". El progreso avanza cuando agregas cada cuota mensual.
          </p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <LoadingRow key={i} />)}</div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={ArrowDownCircle}
          text="Aún no tienes gastos registrados"
          sub="Registra gastos normales, periódicos o en cuotas para llevar el control."
          onAdd={() => openNew()}
          addLabel="Agregar primer gasto"
        />
      ) : (
        <div className="space-y-3">
          {expenses.map((item) => {
            const cat      = EXPENSE_CATEGORIES.find(c => c.value === item.category)
            const color    = CATEGORY_COLORS[item.category] ?? '#94a3b8'
            const type     = expenseTypeOf(item)
            const isInstallment = type === EXPENSE_TYPE_INSTALLMENT
            const isRecurring   = type === EXPENSE_TYPE_RECURRING
            const pct = isInstallment && item.installmentTotal
              ? Math.min(100, Math.round((item.installmentNumber / item.installmentTotal) * 100))
              : 0
            const isLastInstallment = isInstallment && item.installmentNumber === item.installmentTotal

            return (
              <div key={item.id} className="rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  {/* Icono + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: color + '22' }}>
                      {cat?.emoji ?? '📦'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-gray-50 truncate">
                          {item.description || cat?.label}
                        </p>
                        {/* Badges */}
                        {isRecurring && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                            <RefreshCw className="h-3 w-3" /> Mensual
                          </span>
                        )}
                        {isInstallment && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                            isLastInstallment
                              ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                              : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                          }`}>
                            <ChevronRight className="h-3 w-3" />
                            Cuota {item.installmentNumber}/{item.installmentTotal}
                            {isLastInstallment && ' ✓'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{cat?.label} · {fmtDate(item.date)}</p>
                    </div>
                  </div>

                  {/* Monto + acciones */}
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-base font-bold text-red-600 dark:text-red-400">-{fmt(item.amount)}</span>
                    {/* Botón "siguiente cuota" — solo aparece en gastos en cuotas que no estén en la última */}
                    {isInstallment && !isLastInstallment && (
                      <button
                        onClick={() => openNextInstallment(item)}
                        title={`Registrar cuota ${(item.installmentNumber ?? 0) + 1}/${item.installmentTotal}`}
                        className="p-1 text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(item)}        title="Editar"   className="p-1 text-gray-400 hover:text-primary-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} title="Eliminar" className="p-1 text-gray-400 hover:text-red-500  transition-colors"><Trash2  className="h-4 w-4" /></button>
                  </div>
                </div>

                {/* Barra de progreso para cuotas */}
                {isInstallment && (
                  <div className="px-4 pb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progreso de cuotas</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isLastInstallment ? 'bg-green-500' : 'bg-orange-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo/editar gasto */}
      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo gasto' : 'Editar gasto'} onClose={() => setModal(null)}>
          <ErrorBanner msg={error} />

          {/* Categoría */}
          <FormField label="Categoría" required>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </FormField>

          {/* Descripción */}
          <FormField label="Descripción">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Supermercado, Celular Samsung, Netflix..." className={inputCls} />
          </FormField>

          {/* Monto */}
          <FormField label="Monto" required>
            <input type="number" min="0" step="0.01" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="0" className={inputCls} />
          </FormField>

          {/* Fecha */}
          <FormField label="Fecha" required>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </FormField>

          {/* Tipo de gasto — selector visual */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de gasto</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: EXPENSE_TYPE_NORMAL,      label: 'Normal',    desc: 'Un pago único',         icon: '💸' },
                { value: EXPENSE_TYPE_RECURRING,   label: 'Periódico', desc: 'Se repite cada mes',    icon: '🔄' },
                { value: EXPENSE_TYPE_INSTALLMENT, label: 'En cuotas', desc: 'Parte de un plan cuotas', icon: '📅' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, expenseType: opt.value })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                    form.expenseType === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${form.expenseType === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campos adicionales según tipo */}
          {form.expenseType === EXPENSE_TYPE_INSTALLMENT && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4 mb-4">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3">📅 Detalle de cuotas</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cuota actual (voy en la…)">
                  <input
                    type="number" min="1" value={form.installmentNumber}
                    onChange={e => setForm({ ...form, installmentNumber: e.target.value })}
                    placeholder="Ej: 10" className={inputCls}
                  />
                </FormField>
                <FormField label="Total de cuotas">
                  <input
                    type="number" min="1" value={form.installmentTotal}
                    onChange={e => setForm({ ...form, installmentTotal: e.target.value })}
                    placeholder="Ej: 30" className={inputCls}
                  />
                </FormField>
              </div>
              {form.installmentNumber && form.installmentTotal && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Vas en la cuota {form.installmentNumber} de {form.installmentTotal}
                  {' · '}quedan {Math.max(0, parseInt(form.installmentTotal) - parseInt(form.installmentNumber))} por pagar
                </p>
              )}
            </div>
          )}

          {form.expenseType === EXPENSE_TYPE_RECURRING && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                🔄 Este gasto se marcará como <strong>periódico mensual</strong>. Recuerda registrarlo cada mes cuando lo pagues.
              </p>
            </div>
          )}

          <ModalButtons onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ─── TAB: Metas de ahorro ────────────────────────────────────────────────────

function TabMetas({ userId, onRefreshSummary }) {
  const [goals,     setGoals]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [modal,     setModal]     = useState(null)
  const [addModal,  setAddModal]  = useState(null)
  const [addAmount, setAddAmount] = useState('')
  const [addError,  setAddError]  = useState('')
  const [error,     setError]     = useState('')
  const [form,      setForm]      = useState({ name: '', targetAmount: '', currentAmount: '0', targetDate: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.getFinanceSavingGoals(userId)
      .then(data => setGoals(data || []))
      .catch(() => setGoals([]))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setError(''); setForm({ name: '', targetAmount: '', currentAmount: '0', targetDate: '' }); setModal('new') }
  const openEdit = (item) => {
    setError('')
    setForm({ name: item.name, targetAmount: item.targetAmount, currentAmount: item.currentAmount, targetDate: item.targetDate ?? '' })
    setModal(item)
  }

  const handleSave = async () => {
    setError('')
    const data = { name: form.name, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount) || 0, targetDate: form.targetDate || null }
    if (!data.name) { setError('Escribe un nombre para la meta.'); return }
    if (isNaN(data.targetAmount) || data.targetAmount <= 0) { setError('Monto objetivo inválido.'); return }
    setSaving(true)
    try {
      if (modal === 'new') await api.createFinanceSavingGoal(userId, data)
      else                  await api.updateFinanceSavingGoal(modal.id, userId, data)
      setModal(null)
      load()
      onRefreshSummary()
    } catch (e) {
      setError(e.message || 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAmount = async () => {
    setAddError('')
    const amount = parseFloat(addAmount)
    if (!amount || isNaN(amount) || amount <= 0) { setAddError('Ingresa un monto mayor a 0.'); return }
    setSaving(true)
    try {
      await api.addToFinanceSavingGoal(addModal.id, userId, amount)
      setAddModal(null)
      setAddAmount('')
      load()
      onRefreshSummary()
    } catch (e) {
      setAddError(e.message || 'No se pudo agregar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta meta?')) return
    try {
      await api.deleteFinanceSavingGoal(id, userId)
      load()
      onRefreshSummary()
    } catch (e) {
      alert('No se pudo eliminar: ' + (e.message || 'error desconocido'))
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Metas de Ahorro</h2>
          {!loading && goals.length > 0 && (
            <p className="text-sm text-gray-400">{goals.length} meta{goals.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nueva meta
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <LoadingRow key={i} />)}</div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          text="Aún no tienes metas de ahorro"
          sub="Crea metas para ahorrar hacia vacaciones, un auto, emergencias, o lo que quieras."
          onAdd={openNew}
          addLabel="Crear primera meta"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((item) => {
            const pct      = Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
            const done     = item.currentAmount >= item.targetAmount
            const daysLeft = item.targetDate
              ? Math.ceil((new Date(item.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
              : null
            return (
              <div key={item.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                      ${done ? 'bg-green-100 dark:bg-green-950 text-green-600' : 'bg-primary-100 dark:bg-primary-950 text-primary-600'}`}>
                      {done ? <Check className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">{item.name}</p>
                      {daysLeft !== null && (
                        <p className={`text-xs ${daysLeft <= 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {daysLeft > 0 ? `${daysLeft} días restantes` : 'Fecha límite vencida'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => { setAddError(''); setAddModal(item); setAddAmount('') }} title="Agregar ahorro"
                      className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center hover:bg-primary-200 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(item)}    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500  transition-colors"><Trash2  className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500 dark:text-gray-400">Acumulado</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">{fmt(item.currentAmount)} / {fmt(item.targetAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">{pct}%{done ? ' · ✓ Meta alcanzada' : ''}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva/editar meta */}
      {modal && (
        <Modal title={modal === 'new' ? 'Nueva meta de ahorro' : 'Editar meta'} onClose={() => setModal(null)}>
          <ErrorBanner msg={error} />
          <FormField label="Nombre de la meta" required>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Vacaciones, Auto, Emergencias..." className={inputCls} />
          </FormField>
          <FormField label="Monto objetivo" required>
            <input type="number" min="0" step="0.01" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })}
              placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Ya tengo ahorrado">
            <input type="number" min="0" step="0.01" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })}
              placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Fecha límite (opcional)">
            <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} className={inputCls} />
          </FormField>
          <ModalButtons onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}

      {/* Modal agregar monto a meta */}
      {addModal && (
        <Modal title={`Agregar ahorro — "${addModal.name}"`} onClose={() => setAddModal(null)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Acumulado actual: <strong className="text-gray-900 dark:text-gray-50">{fmt(addModal.currentAmount)}</strong> de {fmt(addModal.targetAmount)}
          </p>
          <ErrorBanner msg={addError} />
          <FormField label="Monto a agregar" required>
            <input type="number" min="0" step="0.01" value={addAmount} onChange={e => setAddAmount(e.target.value)}
              placeholder="0" className={inputCls} autoFocus />
          </FormField>
          <ModalButtons onClose={() => setAddModal(null)} onSave={handleAddAmount} saving={saving} saveLabel="Agregar" />
        </Modal>
      )}
    </div>
  )
}

// ─── Botones de modal reutilizables ──────────────────────────────────────────

function ModalButtons({ onClose, onSave, saving, saveLabel = 'Guardar' }) {
  return (
    <div className="flex gap-3 mt-2">
      <button onClick={onClose} disabled={saving}
        className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
        Cancelar
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? 'Guardando...' : saveLabel}
      </button>
    </div>
  )
}

// ─── Helper: fecha de hoy ────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Página principal ────────────────────────────────────────────────────────

function MyFinances() {
  const { user } = useAuth()
  const [tab,            setTab]            = useState('resumen')
  const [summary,        setSummary]        = useState({})
  const [loadingSummary, setLoadingSummary] = useState(true)

  const loadSummary = useCallback(() => {
    api.getFinanceSummary(user.userId)
      .then(setSummary)
      .catch(() => setSummary({}))
      .finally(() => setLoadingSummary(false))
  }, [user.userId])

  useEffect(() => { loadSummary() }, [loadSummary])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center">
          <PiggyBank className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Finanzas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Control total de tu dinero</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loadingSummary && tab === 'resumen' ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3" />
          <p className="text-gray-400">Cargando resumen...</p>
        </div>
      ) : (
        <>
          {tab === 'resumen'  && <TabResumen  summary={summary} />}
          {tab === 'ingresos' && <TabIngresos userId={user.userId} onRefreshSummary={loadSummary} />}
          {tab === 'gastos'   && <TabGastos   userId={user.userId} onRefreshSummary={loadSummary} />}
          {tab === 'metas'    && <TabMetas    userId={user.userId} onRefreshSummary={loadSummary} />}
        </>
      )}
    </div>
  )
}

export default MyFinances
