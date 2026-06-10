import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, PiggyBank,
  Plus, Trash2, Pencil, Check, X,
  DollarSign, Target, AlertCircle, Loader2,
  ArrowUpCircle, RefreshCw, ChevronRight,
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

function getThisMonthExpenses(expenses) {
  const now  = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const inRange = d => { const dt = new Date(d + 'T00:00:00'); return dt >= from && dt <= to }
  const before  = d => new Date(d + 'T00:00:00') <= to

  const result = []

  expenses.forEach(e => {
    if (e.installmentNumber != null || e.recurring) return
    if (inRange(e.date)) result.push(e)
  })

  expenses.forEach(e => {
    if (!e.recurring || !before(e.date)) return
    result.push(e)
  })

  const latestByPlan = {}
  const currentMonthByPlan = {}
  expenses.forEach(e => {
    if (e.installmentNumber == null || !before(e.date)) return
    const key = `${e.category}|${e.installmentTotal}|${e.description ?? ''}`
    if (!latestByPlan[key] || e.installmentNumber > latestByPlan[key].installmentNumber)
      latestByPlan[key] = e
    if (inRange(e.date) && (!currentMonthByPlan[key] || e.installmentNumber > currentMonthByPlan[key].installmentNumber))
      currentMonthByPlan[key] = e
  })
  Object.keys(latestByPlan).forEach(key => {
    const latest = latestByPlan[key]
    if (latest.installmentNumber >= latest.installmentTotal) return
    result.push(currentMonthByPlan[key] ?? latest)
  })

  return result.sort((a, b) => b.amount - a.amount)
}

function getThisMonthIncomes(incomes) {
  const now  = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const inRange = d => { const dt = new Date(d + 'T00:00:00'); return dt >= from && dt <= to }
  const before  = d => new Date(d + 'T00:00:00') <= to
  const result = []
  incomes.forEach(i => { if (!i.recurring && inRange(i.date)) result.push(i) })
  incomes.forEach(i => { if (i.recurring && before(i.date)) result.push(i) })
  return result.sort((a, b) => b.amount - a.amount)
}

function TabResumen({ summary, userId, onAddExpense }) {
  const [expenses,        setExpenses]        = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)

  useEffect(() => {
    if (!userId) return
    api.getFinanceExpenses(userId)
      .then(data => setExpenses(data || []))
      .catch(() => setExpenses([]))
      .finally(() => setLoadingExpenses(false))
  }, [userId])

  const monthExpenses = useMemo(() => getThisMonthExpenses(expenses), [expenses])
  const monthLabel    = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

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
  const income  = summary.monthlyIncome  ?? 0

  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : null
  const savingsStatus =
    income === 0     ? 'nodata'    :
    balance < 0      ? 'deficit'   :
    savingsRate < 10 ? 'low'       :
    savingsRate < 20 ? 'fair'      :
    savingsRate < 35 ? 'good'      :
                       'excellent'

  const SAVINGS_CONFIG = {
    nodata:    { label: '—',         barColor: 'bg-gray-300 dark:bg-gray-600', zone: 'text-gray-500 dark:text-gray-400',      bg: 'bg-gray-50 dark:bg-gray-800/60',        msg: 'Agrega tus ingresos del mes para calcular tu tasa de ahorro.' },
    deficit:   { label: 'Déficit',   barColor: 'bg-red-500',                   zone: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-950/40',          msg: 'Estás gastando más de lo que ingresas. Revisa tus gastos para revertir esta situación.' },
    low:       { label: 'Bajo',      barColor: 'bg-orange-400',                zone: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950/40',    msg: 'Intenta destinar al menos el 10 % de tus ingresos al ahorro.' },
    fair:      { label: 'Regular',   barColor: 'bg-yellow-400',                zone: 'text-yellow-600 dark:text-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-950/40',    msg: 'Vas por buen camino. La meta recomendada es superar el 20 % de ahorro.' },
    good:      { label: 'Bueno',     barColor: 'bg-primary-500',               zone: 'text-primary-600 dark:text-primary-400',bg: 'bg-primary-50 dark:bg-primary-950/40',  msg: 'Buen ritmo. Considera asignar parte a tus metas de ahorro.' },
    excellent: { label: 'Excelente', barColor: 'bg-green-500',                 zone: 'text-green-600 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-950/40',      msg: '¡Excelente! Estás ahorrando más del 35 % de tus ingresos.' },
  }
  const cfg    = SAVINGS_CONFIG[savingsStatus]
  const barPct = savingsStatus === 'deficit' ? 100 : savingsStatus === 'nodata' ? 0 : Math.min(100, savingsRate)

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-6 lg:space-y-0">

      {/* ════════════════════ COLUMNA IZQUIERDA ════════════════════ */}
      <div className="space-y-5">

        {/* Tarjetas — siempre 2x2 */}
        <div className="grid grid-cols-2 gap-3">
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
            label="Balance"
            value={balance}
            color={balance >= 0
              ? 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
              : 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'}
            sub={balance >= 0 ? 'disponible este mes' : 'gastas más de lo que ingresa'}
          />
          <SummaryCard
            icon={PiggyBank}
            label="Total ahorrado"
            value={summary.totalSavings}
            color="bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400"
            sub="en todas tus metas"
          />
        </div>

        {/* Indicador de tasa de ahorro */}
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Tasa de ahorro</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {savingsStatus === 'nodata'
                  ? 'Sin datos de ingresos'
                  : balance >= 0
                    ? `Podrías guardar ${fmt(balance)} este mes`
                    : `Te faltan ${fmt(Math.abs(balance))} para cubrir tus gastos`}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className={`text-3xl font-bold leading-none ${cfg.zone}`}>
                {savingsStatus === 'nodata' ? '—'
                 : savingsStatus === 'deficit' ? `−${Math.abs(savingsRate)}%`
                 : `${savingsRate}%`}
              </p>
              <p className={`text-xs font-semibold mt-1 ${cfg.zone}`}>{cfg.label}</p>
            </div>
          </div>
          <div className="relative mb-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all duration-700 ${cfg.barColor}`} style={{ width: `${barPct}%` }} />
            </div>
            {[10, 20, 35].map(mark => (
              <div key={mark} className="absolute top-0 h-3 w-0.5 bg-white dark:bg-gray-900 opacity-70" style={{ left: `${mark}%` }} />
            ))}
          </div>
          <div className="relative h-4 mb-4 text-xs text-gray-400">
            <span className="absolute left-0">0%</span>
            <span className="absolute" style={{ left: '10%', transform: 'translateX(-50%)' }}>10%</span>
            <span className="absolute" style={{ left: '20%', transform: 'translateX(-50%)' }}>20%</span>
            <span className="absolute" style={{ left: '35%', transform: 'translateX(-50%)' }}>35%</span>
            <span className="absolute right-0">100%</span>
          </div>
          <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg ${cfg.bg}`}>
            {savingsStatus === 'deficit' || savingsStatus === 'low'
              ? <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.zone}`} />
              : <TrendingUp   className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.zone}`} />}
            <p className={`text-sm ${cfg.zone}`}>{cfg.msg}</p>
          </div>
        </div>

        {/* Gráfico de barras: Ingresos vs Gastos */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">Ingresos vs Gastos</h3>
          <ResponsiveContainer width="100%" height={200}>
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

        {/* Gráfico de torta: Gastos por categoría */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">Gastos por categoría</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-44 text-gray-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">Sin gastos este mes</p>
            </div>
          )}
        </div>

      </div>{/* fin columna izquierda */}

      {/* ════════════════════ COLUMNA DERECHA ════════════════════ */}
      <div className="mt-6 lg:mt-0">
        <div className="lg:sticky lg:top-20 card !p-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Gastos del mes</h3>
              <p className="text-xs text-gray-400 capitalize">{monthLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                -{fmt(monthExpenses.reduce((s, e) => s + (e.amount || 0), 0))}
              </p>
              <p className="text-xs text-gray-400">{monthExpenses.length} ítem{monthExpenses.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Lista con scroll propio */}
          <div className="overflow-y-auto max-h-[calc(100vh-16rem)] lg:max-h-[72vh]">
            {loadingExpenses ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map(i => <LoadingRow key={i} />)}
              </div>
            ) : monthExpenses.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400">
                <AlertCircle className="h-10 w-10 mb-3" />
                <p className="font-medium text-gray-600 dark:text-gray-400">Sin gastos este mes</p>
                <button onClick={onAddExpense} className="mt-4 btn-primary flex items-center gap-2 text-sm">
                  <Plus className="h-4 w-4" /> Agregar gasto
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {monthExpenses.map((item, idx) => {
                  const cat   = EXPENSE_CATEGORIES.find(c => c.value === item.category)
                  const color = CATEGORY_COLORS[item.category] ?? '#94a3b8'
                  return (
                    <div key={item.id ?? idx} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: color + '22' }}>
                        {cat?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                            {item.description || cat?.label}
                          </p>
                          {item.recurring && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                              <RefreshCw className="h-2.5 w-2.5" /> Mensual
                            </span>
                          )}
                          {item.installmentNumber != null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 shrink-0">
                              Cuota {item.installmentNumber}/{item.installmentTotal}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{cat?.label} · {fmtDate(item.date)}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 shrink-0">
                        -{fmt(item.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={onAddExpense}
              className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline text-center flex items-center justify-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Agregar gasto
            </button>
          </div>

        </div>
      </div>{/* fin columna derecha */}

    </div>
  )
}

// ─── TAB: Ingresos ───────────────────────────────────────────────────────────

const INCOME_FREQ_ONCE      = 'once'
const INCOME_FREQ_RECURRING = 'recurring'
const INCOME_FREQ_MONTHS    = 'months'

function incomeFreqOf(item) {
  if (item.recurring)      return INCOME_FREQ_RECURRING
  if (item.durationMonths) return INCOME_FREQ_MONTHS
  return INCOME_FREQ_ONCE
}

function TabIngresos({ userId, onRefreshSummary }) {
  const [incomes, setIncomes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [modal,   setModal]     = useState(null)
  const [error,   setError]     = useState('')
  const [form,    setForm]      = useState({ type: 'SALARY', description: '', amount: '', date: today(), incomeFreq: INCOME_FREQ_ONCE, durationMonths: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.getFinanceIncomes(userId)
      .then(data => setIncomes(data || []))
      .catch(() => setIncomes([]))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setError(''); setForm({ type: 'SALARY', description: '', amount: '', date: today(), incomeFreq: INCOME_FREQ_ONCE, durationMonths: '' }); setModal('new') }
  const openEdit = (item) => { setError(''); setForm({ type: item.type, description: item.description ?? '', amount: item.amount, date: item.date ?? today(), incomeFreq: incomeFreqOf(item), durationMonths: item.durationMonths ?? '' }); setModal(item) }

  const handleSave = async () => {
    setError('')
    const data = {
      type:           form.type,
      description:    form.description,
      amount:         parseFloat(form.amount),
      date:           form.date,
      recurring:      form.incomeFreq === INCOME_FREQ_RECURRING,
      durationMonths: form.incomeFreq === INCOME_FREQ_MONTHS ? parseInt(form.durationMonths) || null : null,
    }
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) { setError('Ingresa un monto válido mayor a 0.'); return }
    if (form.incomeFreq === INCOME_FREQ_MONTHS && (!data.durationMonths || data.durationMonths < 1)) { setError('Indica cuántos meses recibirás este ingreso.'); return }
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
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                  ${item.type === 'SALARY'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'}`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 dark:text-gray-50 truncate">
                      {item.description || (item.type === 'SALARY' ? 'Sueldo fijo' : 'Ingreso extra')}
                    </p>
                    {item.recurring && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                        <RefreshCw className="h-3 w-3" /> Mensual
                      </span>
                    )}
                    {item.durationMonths && !item.recurring && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                        {item.durationMonths} mes{item.durationMonths !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
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

          {/* Frecuencia del ingreso */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frecuencia</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: INCOME_FREQ_ONCE,      label: 'Único',     desc: 'Un solo ingreso',       icon: '💵' },
                { value: INCOME_FREQ_RECURRING, label: 'Periódico', desc: 'Se repite cada mes',    icon: '🔄' },
                { value: INCOME_FREQ_MONTHS,    label: 'Por meses', desc: 'Durante X meses',       icon: '📅' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, incomeFreq: opt.value })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                    form.incomeFreq === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${form.incomeFreq === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {form.incomeFreq === INCOME_FREQ_MONTHS && (
            <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-4 mb-4">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3">📅 ¿Por cuántos meses recibirás este ingreso?</p>
              <FormField label="Número de meses">
                <input
                  type="number" min="1"
                  value={form.durationMonths}
                  onChange={e => setForm({ ...form, durationMonths: e.target.value })}
                  placeholder="Ej: 6"
                  className={inputCls}
                />
              </FormField>
              {form.durationMonths && parseInt(form.durationMonths) > 0 && (
                <p className="text-xs text-purple-600 dark:text-purple-400 -mt-2">
                  Recibirás este ingreso durante {form.durationMonths} mes{parseInt(form.durationMonths) !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          )}

          {form.incomeFreq === INCOME_FREQ_RECURRING && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                🔄 Este ingreso se marcará como <strong>periódico mensual</strong>. Recuerda registrarlo cada mes cuando lo recibas.
              </p>
            </div>
          )}

          <ModalButtons onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ─── Helpers: Gastos ─────────────────────────────────────────────────────────

const EXPENSE_TYPE_NORMAL      = 'normal'
const EXPENSE_TYPE_RECURRING   = 'periodico'
const EXPENSE_TYPE_INSTALLMENT = 'cuotas'

function fmtNextBillingDate(billingDay) {
  if (!billingDay || billingDay < 1 || billingDay > 31) return null
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), billingDay)
  const d = thisMonth >= now ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, billingDay)
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
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
    billingDay:         '',
  }
}

function formToPayload(form) {
  const isInstallment = form.expenseType === EXPENSE_TYPE_INSTALLMENT
  return {
    category:           form.category,
    description:        form.description,
    amount:             parseFloat(form.amount),
    date:               form.date,
    recurring:          form.expenseType === EXPENSE_TYPE_RECURRING,
    installmentNumber:  isInstallment && form.installmentNumber !== '' ? parseInt(form.installmentNumber) : null,
    installmentTotal:   isInstallment && form.installmentTotal  !== '' ? parseInt(form.installmentTotal)  : null,
    billingDay:         isInstallment && form.billingDay !== '' ? parseInt(form.billingDay) : null,
  }
}

// ─── Modal: Nuevo gasto ──────────────────────────────────────────────────────

function NewExpenseModal({ userId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState(buildEmptyForm())

  const handleSave = async () => {
    setError('')
    const data = formToPayload(form)
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      setError('Ingresa un monto válido mayor a 0.')
      return
    }
    if (form.expenseType === EXPENSE_TYPE_INSTALLMENT) {
      if (data.installmentNumber == null || isNaN(data.installmentNumber) || data.installmentNumber < 0) { setError('Número de cuota inválido (mínimo 0).'); return }
      if (!data.installmentTotal  || data.installmentTotal  < 1) { setError('Total de cuotas inválido.'); return }
      if (data.installmentNumber > data.installmentTotal)       { setError('La cuota actual no puede ser mayor al total.'); return }
    }
    setSaving(true)
    try {
      await api.createFinanceExpense(userId, data)
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Nuevo gasto" onClose={onClose}>
      <ErrorBanner msg={error} />

      <FormField label="Categoría" required>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Descripción">
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Ej: Supermercado, Celular Samsung, Netflix..." className={inputCls} />
      </FormField>

      <FormField label="Monto" required>
        <input type="number" min="0" step="0.01" value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          placeholder="0" className={inputCls} />
      </FormField>

      <FormField label="Fecha" required>
        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
      </FormField>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de gasto</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: EXPENSE_TYPE_NORMAL,      label: 'Normal',    desc: 'Un pago único',           icon: '💸' },
            { value: EXPENSE_TYPE_RECURRING,   label: 'Periódico', desc: 'Se repite cada mes',      icon: '🔄' },
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

      {form.expenseType === EXPENSE_TYPE_INSTALLMENT && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4 mb-4">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3">📅 Detalle de cuotas</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="N° de cuota actual">
              <input
                type="number" min="0" value={form.installmentNumber}
                onChange={e => setForm({ ...form, installmentNumber: e.target.value })}
                placeholder="0 = sin facturar" className={inputCls}
              />
            </FormField>
            <FormField label="Total de cuotas">
              <input
                type="number" min="1" value={form.installmentTotal}
                onChange={e => setForm({ ...form, installmentTotal: e.target.value })}
                placeholder="Ej: 12" className={inputCls}
              />
            </FormField>
          </div>
          {form.installmentNumber !== '' && form.installmentTotal && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              {parseInt(form.installmentNumber) === 0
                ? `Compra registrada · aún sin facturar · ${form.installmentTotal} cuotas totales`
                : `Cuota ${form.installmentNumber} de ${form.installmentTotal} · quedan ${Math.max(0, parseInt(form.installmentTotal) - parseInt(form.installmentNumber))} por pagar`}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
            <FormField label="Día de facturación tarjeta (opcional)">
              <input
                type="number" min="1" max="31" value={form.billingDay}
                onChange={e => setForm({ ...form, billingDay: e.target.value })}
                placeholder="Ej: 19" className={inputCls}
              />
            </FormField>
            {form.billingDay && parseInt(form.billingDay) >= 1 && parseInt(form.billingDay) <= 31 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 -mt-2">
                Próxima facturación: <strong>{fmtNextBillingDate(parseInt(form.billingDay))}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {form.expenseType === EXPENSE_TYPE_RECURRING && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🔄 Este gasto se marcará como <strong>periódico mensual</strong>. Recuerda registrarlo cada mes cuando lo pagues.
          </p>
        </div>
      )}

      <ModalButtons onClose={onClose} onSave={handleSave} saving={saving} />
    </Modal>
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
  const [form,      setForm]      = useState({ name: '', targetAmount: '', currentAmount: '0', targetDate: '', targetMonths: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.getFinanceSavingGoals(userId)
      .then(data => setGoals(data || []))
      .catch(() => setGoals([]))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setError(''); setForm({ name: '', targetAmount: '', currentAmount: '0', targetDate: '', targetMonths: '' }); setModal('new') }
  const openEdit = (item) => {
    setError('')
    setForm({ name: item.name, targetAmount: item.targetAmount, currentAmount: item.currentAmount, targetDate: item.targetDate ?? '', targetMonths: '' })
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
            const remaining      = item.targetAmount - item.currentAmount
            const showPlan       = !done && daysLeft !== null && daysLeft > 0 && remaining > 0
            const monthlyNeeded  = showPlan ? Math.ceil(remaining / (daysLeft / 30.44)) : null
            const weeklyNeeded   = showPlan ? Math.ceil(remaining / (daysLeft / 7))     : null
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
                {showPlan && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ahorro sugerido para llegar a tiempo</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-primary-50 dark:bg-primary-950/40 px-3 py-2 text-center">
                        <p className="text-xs text-gray-400">Mensual</p>
                        <p className="text-sm font-bold text-primary-700 dark:text-primary-300">{fmt(monthlyNeeded)}</p>
                      </div>
                      <div className="rounded-lg bg-primary-50 dark:bg-primary-950/40 px-3 py-2 text-center">
                        <p className="text-xs text-gray-400">Semanal</p>
                        <p className="text-sm font-bold text-primary-700 dark:text-primary-300">{fmt(weeklyNeeded)}</p>
                      </div>
                    </div>
                  </div>
                )}
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plazo para la meta <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">Número de meses</p>
                <input
                  type="number" min="1" max="360"
                  value={form.targetMonths}
                  onChange={e => {
                    const months = parseInt(e.target.value)
                    if (!isNaN(months) && months > 0) {
                      const d = new Date()
                      d.setMonth(d.getMonth() + months)
                      setForm({ ...form, targetMonths: e.target.value, targetDate: d.toISOString().slice(0, 10) })
                    } else {
                      setForm({ ...form, targetMonths: e.target.value, targetDate: '' })
                    }
                  }}
                  placeholder="Ej: 10"
                  className={inputCls}
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">O fecha exacta</p>
                <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value, targetMonths: '' })} className={inputCls} />
              </div>
            </div>
            {form.targetDate && (
              <p className="text-xs text-gray-400 mt-1">Fecha objetivo: {fmtDate(form.targetDate)}</p>
            )}
          </div>
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
  const [tab,             setTab]             = useState('resumen')
  const [summary,         setSummary]         = useState({})
  const [loadingSummary,  setLoadingSummary]  = useState(true)
  const [showAddExpense,  setShowAddExpense]  = useState(false)

  const loadSummary = useCallback(() => {
    api.getFinanceSummary(user.userId)
      .then(setSummary)
      .catch(() => setSummary({}))
      .finally(() => setLoadingSummary(false))
  }, [user.userId])

  useEffect(() => { loadSummary() }, [loadSummary])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950 flex items-center justify-center">
            <PiggyBank className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Finanzas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Control total de tu dinero</p>
          </div>
        </div>
        <button onClick={() => setShowAddExpense(true)} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Agregar gasto
        </button>
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
          {tab === 'resumen'  && <TabResumen  summary={summary} userId={user.userId} onAddExpense={() => setShowAddExpense(true)} />}
          {tab === 'ingresos' && <TabIngresos userId={user.userId} onRefreshSummary={loadSummary} />}
          {tab === 'metas'    && <TabMetas    userId={user.userId} onRefreshSummary={loadSummary} />}
        </>
      )}

      {/* Modal global: Agregar gasto */}
      {showAddExpense && (
        <NewExpenseModal
          userId={user.userId}
          onClose={() => setShowAddExpense(false)}
          onSaved={loadSummary}
        />
      )}
    </div>
  )
}

export default MyFinances
