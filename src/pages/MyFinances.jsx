import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, PiggyBank,
  Plus, Trash2, Pencil, Check, X,
  DollarSign, Target, AlertCircle, Loader2,
  ArrowUpCircle, RefreshCw, ChevronRight, ChevronLeft,
  Settings, Download, CreditCard, CalendarDays,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// â”€â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EXPENSE_CATEGORIES = [
  { value: 'COMIDA',      label: 'Comida',       emoji: 'ðŸ›’' },
  { value: 'TRANSPORTE',  label: 'Transporte',   emoji: 'ðŸšŒ' },
  { value: 'OCIO',        label: 'Ocio',         emoji: 'ðŸŽ®' },
  { value: 'SALUD',       label: 'Salud',        emoji: 'ðŸ¥' },
  { value: 'EDUCACION',   label: 'EducaciÃ³n',    emoji: 'ðŸ“š' },
  { value: 'HOGAR',       label: 'Hogar',        emoji: 'ðŸ ' },
  { value: 'ROPA',        label: 'Ropa',         emoji: 'ðŸ‘•' },
  { value: 'TECNOLOGIA',  label: 'TecnologÃ­a',   emoji: 'ðŸ’»' },
  { value: 'OTRO',        label: 'Otro',         emoji: 'ðŸ“¦' },
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
  if (!d) return 'â€“'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('es-CL') } catch { return d }
}

// â”€â”€â”€ Helpers UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Tarjetas de resumen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Period helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function computePeriodDates(year, month, billingDay) {
  // billingDay = 1 â†’ calendar month; billingDay = 19 â†’ 19th prev to 19th current
  if (!billingDay || billingDay <= 1) {
    return {
      from: new Date(year, month, 1),
      to:   new Date(year, month + 1, 0),
    }
  }
  return {
    from: new Date(year, month - 1, billingDay),
    to:   new Date(year, month, billingDay),
  }
}

function getPeriodExpenses(expenses, from, to) {
  const inRange = d => { const dt = new Date(d + 'T00:00:00'); return dt >= from && dt <= to }
  const result  = []

  // Normal expenses in range
  expenses.forEach(e => {
    if (e.installmentNumber != null || e.recurring) return
    if (inRange(e.date)) result.push(e)
  })

  // Recurring: aparece en TODOS los perÃ­odos sin restricciÃ³n de fecha de registro
  expenses.forEach(e => {
    if (!e.recurring) return
    result.push(e)
  })

  // Installment plans: collect all entries regardless of date
  const latestByPlan        = {}
  const earliestByPlan      = {}
  const currentPeriodByPlan = {}
  expenses.forEach(e => {
    if (e.installmentNumber == null) return
    const key = `${e.category}|${e.installmentTotal}|${e.description ?? ''}`
    if (!latestByPlan[key]   || e.installmentNumber > latestByPlan[key].installmentNumber)
      latestByPlan[key] = e
    if (!earliestByPlan[key] || e.installmentNumber < earliestByPlan[key].installmentNumber)
      earliestByPlan[key] = e
    if (inRange(e.date) && (!currentPeriodByPlan[key] || e.installmentNumber > currentPeriodByPlan[key].installmentNumber))
      currentPeriodByPlan[key] = e
  })
  Object.keys(latestByPlan).forEach(key => {
    const latest   = latestByPlan[key]
    const earliest = earliestByPlan[key]
    if ((latest.installmentNumber ?? 0) >= (latest.installmentTotal ?? 1)) return
    // Estimate plan start from earliest known entry (back-project if needed)
    const earlyDt    = new Date(earliest.date + 'T00:00:00')
    const backMonths = earliest.installmentNumber <= 1 ? 0 : earliest.installmentNumber - 1
    const planStart  = new Date(earlyDt.getFullYear(), earlyDt.getMonth() - backMonths, earlyDt.getDate())
    if (planStart > to) return
    result.push(currentPeriodByPlan[key] ?? latest)
  })

  // Sort: periÃ³dicos â†’ cuotas (menos restantes primero) â†’ normales
  const groupOf = e => e.recurring ? 0 : e.installmentNumber != null ? 1 : 2
  return result.sort((a, b) => {
    const gA = groupOf(a), gB = groupOf(b)
    if (gA !== gB) return gA - gB
    if (gA === 1) {
      const remA = (a.installmentTotal ?? 0) - (a.installmentNumber ?? 0)
      const remB = (b.installmentTotal ?? 0) - (b.installmentNumber ?? 0)
      if (remA !== remB) return remA - remB
    }
    return b.amount - a.amount
  })
}

function getPeriodIncomes(incomes, from, to) {
  const inRange = d => { const dt = new Date(d + 'T00:00:00'); return dt >= from && dt <= to }
  const result  = []
  incomes.forEach(i => { if (!i.recurring && inRange(i.date)) result.push(i) })
  // PeriÃ³dico: aparece en TODOS los perÃ­odos sin restricciÃ³n de fecha de registro
  incomes.forEach(i => { if (i.recurring) result.push(i) })
  return result.sort((a, b) => b.amount - a.amount)
}

function calcPeriodSummary(expenses, incomes, from, to) {
  const inRange = d => { const dt = new Date(d + 'T00:00:00'); return dt >= from && dt <= to }

  let monthlyExpenses = 0
  const expensesByCategory = {}

  // 1. Normal
  expenses.forEach(e => {
    if (e.installmentNumber != null || e.recurring || !inRange(e.date)) return
    monthlyExpenses += e.amount
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
  })

  // 2. PeriÃ³dicos: aparecen en TODOS los perÃ­odos (sin restricciÃ³n de fecha de registro)
  expenses.forEach(e => {
    if (!e.recurring) return
    monthlyExpenses += e.amount
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
  })

  // 3. Installments: collect all entries regardless of date
  const latestByPlan        = {}
  const earliestByPlan      = {}
  const currentPeriodByPlan = {}
  expenses.forEach(e => {
    if (e.installmentNumber == null) return
    const key = `${e.category}|${e.installmentTotal}|${e.description ?? ''}`
    if (!latestByPlan[key]   || e.installmentNumber > latestByPlan[key].installmentNumber)
      latestByPlan[key] = e
    if (!earliestByPlan[key] || e.installmentNumber < earliestByPlan[key].installmentNumber)
      earliestByPlan[key] = e
    if (inRange(e.date) && (!currentPeriodByPlan[key] || e.installmentNumber > currentPeriodByPlan[key].installmentNumber))
      currentPeriodByPlan[key] = e
  })
  Object.entries(latestByPlan).forEach(([key, latest]) => {
    const earliest = earliestByPlan[key]
    if ((latest.installmentNumber ?? 0) >= (latest.installmentTotal ?? 1)) return
    // Estimate plan start from earliest known entry
    const earlyDt    = new Date(earliest.date + 'T00:00:00')
    const backMonths = earliest.installmentNumber <= 1 ? 0 : earliest.installmentNumber - 1
    const planStart  = new Date(earlyDt.getFullYear(), earlyDt.getMonth() - backMonths, earlyDt.getDate())
    if (planStart > to) return
    const toCount = currentPeriodByPlan[key] ?? latest
    monthlyExpenses += toCount.amount
    expensesByCategory[toCount.category] = (expensesByCategory[toCount.category] || 0) + toCount.amount
  })

  // Incomes
  let monthlyIncome = 0
  const incomesByType = {}
  incomes.forEach(i => {
    if (i.recurring || !inRange(i.date)) return
    monthlyIncome += i.amount
    incomesByType[i.type] = (incomesByType[i.type] || 0) + i.amount
  })
  // PeriÃ³dicos: aparecen en TODOS los perÃ­odos (sin restricciÃ³n de fecha de registro)
  incomes.forEach(i => {
    if (!i.recurring) return
    monthlyIncome += i.amount
    incomesByType[i.type] = (incomesByType[i.type] || 0) + i.amount
  })

  return {
    monthlyExpenses,
    monthlyIncome,
    monthlyBalance: monthlyIncome - monthlyExpenses,
    expensesByCategory,
    incomesByType,
  }
}

// â”€â”€â”€ Export helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function exportToExcel(periodExpenses, periodIncomes, summary, periodLabel) {
  const { utils, writeFile } = await import('xlsx')

  const wb = utils.book_new()

  // Sheet 1: Resumen
  const summaryRows = [
    ['PerÃ­odo', periodLabel],
    ['Ingresos', summary.monthlyIncome ?? 0],
    ['Gastos',   summary.monthlyExpenses ?? 0],
    ['Balance',  summary.monthlyBalance  ?? 0],
    ['Total ahorrado', summary.totalSavings ?? 0],
  ]
  const wsSummary = utils.aoa_to_sheet(summaryRows)
  utils.book_append_sheet(wb, wsSummary, 'Resumen')

  // Sheet 2: Gastos
  const expHeaders = ['Fecha', 'CategorÃ­a', 'DescripciÃ³n', 'Tipo', 'Cuota', 'Monto']
  const expRows = periodExpenses.map(e => {
    const cat  = EXPENSE_CATEGORIES.find(c => c.value === e.category)
    const tipo = e.recurring ? 'PeriÃ³dico' : e.installmentNumber != null ? 'En cuotas' : 'Normal'
    const cuota = e.installmentNumber != null ? `${e.installmentNumber}/${e.installmentTotal}` : '-'
    return [e.date, cat?.label ?? e.category, e.description ?? '', tipo, cuota, e.amount]
  })
  const wsExp = utils.aoa_to_sheet([expHeaders, ...expRows])
  utils.book_append_sheet(wb, wsExp, 'Gastos')

  // Sheet 3: Ingresos
  const incHeaders = ['Fecha', 'Tipo', 'DescripciÃ³n', 'Frecuencia', 'Monto']
  const incRows = periodIncomes.map(i => {
    const tipo = i.type === 'SALARY' ? 'Sueldo fijo' : 'Ingreso extra'
    const freq = i.recurring ? 'PeriÃ³dico' : i.durationMonths ? `${i.durationMonths} meses` : 'Ãšnico'
    return [i.date, tipo, i.description ?? '', freq, i.amount]
  })
  const wsInc = utils.aoa_to_sheet([incHeaders, ...incRows])
  utils.book_append_sheet(wb, wsInc, 'Ingresos')

  writeFile(wb, `finanzas_${periodLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`)
}

async function exportToPDF(periodExpenses, periodIncomes, summary, periodLabel) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Mis Finanzas', 14, 18)
  doc.setFontSize(11)
  doc.setTextColor(100, 100, 100)
  doc.text(`PerÃ­odo: ${periodLabel}`, 14, 26)

  // Summary table
  doc.setFontSize(13)
  doc.setTextColor(40, 40, 40)
  doc.text('Resumen', 14, 38)
  autoTable(doc, {
    startY: 42,
    head: [['Concepto', 'Monto']],
    body: [
      ['Ingresos del perÃ­odo', fmt(summary.monthlyIncome)],
      ['Gastos del perÃ­odo',   fmt(summary.monthlyExpenses)],
      ['Balance',              fmt(summary.monthlyBalance)],
      ['Total ahorrado',       fmt(summary.totalSavings ?? 0)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: { 1: { halign: 'right' } },
  })

  // Expenses table
  const expY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.text('Gastos del perÃ­odo', 14, expY)
  autoTable(doc, {
    startY: expY + 4,
    head: [['Fecha', 'CategorÃ­a', 'DescripciÃ³n', 'Tipo', 'Monto']],
    body: periodExpenses.map(e => {
      const cat  = EXPENSE_CATEGORIES.find(c => c.value === e.category)
      const tipo = e.recurring
        ? 'PeriÃ³dico'
        : e.installmentNumber != null
          ? `Cuota ${e.installmentNumber}/${e.installmentTotal}`
          : 'Normal'
      return [e.date, cat?.label ?? e.category, e.description ?? '', tipo, fmt(e.amount)]
    }),
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    columnStyles: { 4: { halign: 'right' } },
  })

  // Incomes table
  const incY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(13)
  doc.text('Ingresos del perÃ­odo', 14, incY)
  autoTable(doc, {
    startY: incY + 4,
    head: [['Fecha', 'Tipo', 'DescripciÃ³n', 'Monto']],
    body: periodIncomes.map(i => {
      const tipo = i.type === 'SALARY' ? 'Sueldo fijo' : 'Ingreso extra'
      return [i.date, tipo, i.description ?? '', fmt(i.amount)]
    }),
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
    columnStyles: { 3: { halign: 'right' } },
  })

  doc.save(`finanzas_${periodLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`)
}

// â”€â”€â”€ TAB: Resumen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Devuelve las cuotas (FinanceInstallment) activas/pasadas para un mes dado
function getInstallmentsForPeriod(installments, periodYear, periodMonth) {
  const now = new Date()
  const monthsFromNow = (periodYear * 12 + periodMonth) - (now.getFullYear() * 12 + now.getMonth())
  return installments
    .filter(inst => {
      const remaining = inst.totalInstallments - inst.paidInstallments
      if (monthsFromNow >= 0) return monthsFromNow < remaining          // futuro/actual
      else                    return (-monthsFromNow) <= inst.paidInstallments // pasado
    })
    .map(inst => {
      const cuotaNum = inst.paidInstallments + 1 + monthsFromNow
      const remainingAfterThisMonth = inst.totalInstallments - cuotaNum
      return {
        id:           `inst-proj-${inst.id}`,
        _projectedInstallment: true,
        description:  inst.description,
        amount:       inst.installmentAmount,
        category:     'CUOTA',
        _cuotaNum:    cuotaNum,
        _totalCuotas: inst.totalInstallments,
        _remaining:   remainingAfterThisMonth,
      }
    })
}

function TabResumen({ summary: serverSummary, userId, onAddExpense }) {
  const [expenses,      setExpenses]      = useState([])
  const [incomes,       setIncomes]       = useState([])
  const [installments,  setInstallments]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [exporting,     setExporting]     = useState(null) // 'excel' | 'pdf' | null
  const [editItem,      setEditItem]      = useState(null) // expense being edited
  const [deletingId,    setDeletingId]    = useState(null) // id being deleted

  // Period navigation
  const nowDate = new Date()
  const [periodYear,  setPeriodYear]  = useState(nowDate.getFullYear())
  const [periodMonth, setPeriodMonth] = useState(nowDate.getMonth())
  const [billingDay,  setBillingDay]  = useState(() => {
    const v = localStorage.getItem('finBillingDay')
    return v ? Math.max(1, Math.min(28, parseInt(v))) : 1
  })
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [billingInput, setBillingInput] = useState('')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([
      api.getFinanceExpenses(userId),
      api.getFinanceIncomes(userId),
      api.getFinanceInstallments(userId),
    ]).then(([exp, inc, inst]) => {
      setExpenses(exp   || [])
      setIncomes(inc    || [])
      setInstallments(inst || [])
    }).catch(() => { setExpenses([]); setIncomes([]); setInstallments([]) })
    .finally(() => setLoading(false))
  }, [userId])

  const refreshExpenses = useCallback(() => {
    api.getFinanceExpenses(userId)
      .then(data => setExpenses(data || []))
      .catch(() => {})
  }, [userId])

  const handleDeleteExpense = async (item) => {
    const label = item.description || EXPENSE_CATEGORIES.find(c => c.value === item.category)?.label || 'este gasto'
    if (!confirm(`Â¿Eliminar "${label}"?`)) return
    setDeletingId(item.id)
    try {
      await api.deleteFinanceExpense(item.id, userId)
      setExpenses(prev => prev.filter(e => e.id !== item.id))
    } catch {
      alert('No se pudo eliminar el gasto. Intenta de nuevo.')
    } finally {
      setDeletingId(null)
    }
  }

  // Compute period date range
  const { from: periodFrom, to: periodTo } = useMemo(
    () => computePeriodDates(periodYear, periodMonth, billingDay),
    [periodYear, periodMonth, billingDay]
  )

  const monthsFromNow = (periodYear * 12 + periodMonth) - (nowDate.getFullYear() * 12 + nowDate.getMonth())
  const isCurrentPeriod = monthsFromNow === 0
  const isFuturePeriod  = monthsFromNow > 0
  // Max 24 meses adelante
  const maxFutureMonths = 24
  const isMaxFuture = monthsFromNow >= maxFutureMonths

  const prevPeriod = () => {
    if (periodMonth === 0) { setPeriodYear(y => y - 1); setPeriodMonth(11) }
    else setPeriodMonth(m => m - 1)
  }
  const nextPeriod = () => {
    if (isMaxFuture) return
    if (periodMonth === 11) { setPeriodYear(y => y + 1); setPeriodMonth(0) }
    else setPeriodMonth(m => m + 1)
  }

  // Period labels
  const monthName = new Date(periodYear, periodMonth, 1)
    .toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const periodShort = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  const fmtShortDate = d => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  const periodRange = billingDay > 1
    ? `${fmtShortDate(periodFrom)} â€“ ${fmtShortDate(periodTo)}`
    : null
  const periodFull = billingDay > 1
    ? `${fmtShortDate(periodFrom)} â€“ ${periodTo.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : periodShort

  // Cuotas (FinanceInstallment) proyectadas para este perÃ­odo
  const projectedInstallments = useMemo(
    () => getInstallmentsForPeriod(installments, periodYear, periodMonth),
    [installments, periodYear, periodMonth]
  )

  // Client-side summary for selected period
  const periodSummaryData = useMemo(() => {
    const base = calcPeriodSummary(expenses, incomes, periodFrom, periodTo)
    // Sumar cuotas proyectadas al total de gastos
    const installmentTotal = projectedInstallments.reduce((s, i) => s + i.amount, 0)
    return {
      ...base,
      monthlyExpenses: base.monthlyExpenses + installmentTotal,
      monthlyBalance:  base.monthlyBalance  - installmentTotal,
      expensesByCategory: {
        ...base.expensesByCategory,
        ...(installmentTotal > 0 ? { CUOTA: (base.expensesByCategory?.CUOTA ?? 0) + installmentTotal } : {}),
      },
    }
  }, [expenses, incomes, periodFrom, periodTo, projectedInstallments])

  // Merge: period-specific data overrides server summary; totalSavings is period-independent
  const summary = { ...serverSummary, ...periodSummaryData }

  const periodExpenses = useMemo(() => {
    const base = getPeriodExpenses(expenses, periodFrom, periodTo)
    // Agregar cuotas proyectadas al inicio de la lista
    return [...projectedInstallments, ...base]
  }, [expenses, periodFrom, periodTo, projectedInstallments])

  const periodIncomesList = useMemo(
    () => getPeriodIncomes(incomes, periodFrom, periodTo),
    [incomes, periodFrom, periodTo]
  )

  // Export handlers
  const handleExportExcel = async () => {
    setExporting('excel')
    try { await exportToExcel(periodExpenses, periodIncomesList, summary, periodFull) }
    catch { alert('Error al exportar a Excel. Intenta de nuevo.') }
    finally { setExporting(null) }
  }
  const handleExportPDF = async () => {
    setExporting('pdf')
    try { await exportToPDF(periodExpenses, periodIncomesList, summary, periodFull) }
    catch { alert('Error al exportar a PDF. Intenta de nuevo.') }
    finally { setExporting(null) }
  }

  const saveBillingDay = () => {
    const v = parseInt(billingInput)
    if (isNaN(v) || v < 1 || v > 28) return
    setBillingDay(v)
    localStorage.setItem('finBillingDay', String(v))
    setShowBillingModal(false)
  }

  // Summary values
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
    nodata:    { label: 'â€”',         barColor: 'bg-gray-300 dark:bg-gray-600', zone: 'text-gray-500 dark:text-gray-400',      bg: 'bg-gray-50 dark:bg-gray-800/60',        msg: 'Agrega tus ingresos del mes para calcular tu tasa de ahorro.' },
    deficit:   { label: 'DÃ©ficit',   barColor: 'bg-red-500',                   zone: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-950/40',          msg: 'EstÃ¡s gastando mÃ¡s de lo que ingresas. Revisa tus gastos para revertir esta situaciÃ³n.' },
    low:       { label: 'Bajo',      barColor: 'bg-orange-400',                zone: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950/40',    msg: 'Intenta destinar al menos el 10 % de tus ingresos al ahorro.' },
    fair:      { label: 'Regular',   barColor: 'bg-yellow-400',                zone: 'text-yellow-600 dark:text-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-950/40',    msg: 'Vas por buen camino. La meta recomendada es superar el 20 % de ahorro.' },
    good:      { label: 'Bueno',     barColor: 'bg-primary-500',               zone: 'text-primary-600 dark:text-primary-400',bg: 'bg-primary-50 dark:bg-primary-950/40',  msg: 'Buen ritmo. Considera asignar parte a tus metas de ahorro.' },
    excellent: { label: 'Excelente', barColor: 'bg-green-500',                 zone: 'text-green-600 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-950/40',      msg: 'Â¡Excelente! EstÃ¡s ahorrando mÃ¡s del 35 % de tus ingresos.' },
  }
  const cfg    = SAVINGS_CONFIG[savingsStatus]
  const barPct = savingsStatus === 'deficit' ? 100 : savingsStatus === 'nodata' ? 0 : Math.min(100, savingsRate)

  const barData = [
    { name: 'Ingresos', value: summary.monthlyIncome  ?? 0 },
    { name: 'Gastos',   value: summary.monthlyExpenses ?? 0 },
  ]
  const pieData = Object.entries(summary.expensesByCategory ?? {}).map(([cat, val]) => ({
    name:  EXPENSE_CATEGORIES.find(c => c.value === cat)?.label ?? cat,
    value: val,
    color: CATEGORY_COLORS[cat] ?? '#94a3b8',
  }))

  return (
    <div>

      {/* â”€â”€ Barra de navegaciÃ³n de perÃ­odo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">

        {/* Nav meses */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shrink-0">
          <button onClick={prevPeriod}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-3 text-center min-w-[130px]">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-50 leading-tight">{periodShort}</p>
            {periodRange && (
              <p className="text-xs text-gray-400 leading-tight">{periodRange}</p>
            )}
          </div>
          <button onClick={nextPeriod} disabled={isMaxFuture}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Configurar dÃ­a de corte */}
        <button
          onClick={() => { setBillingInput(String(billingDay)); setShowBillingModal(true) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0">
          <Settings className="h-3.5 w-3.5" />
          {billingDay > 1 ? `Corte: dÃ­a ${billingDay}` : 'DÃ­a de corte'}
        </button>

        {/* Exportar */}
        <div className="flex gap-2 ml-auto">
          <button onClick={handleExportExcel} disabled={!!exporting || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:border-green-400 hover:text-green-600 dark:hover:border-green-700 dark:hover:text-green-400 transition-colors disabled:opacity-40">
            {exporting === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Excel
          </button>
          <button onClick={handleExportPDF} disabled={!!exporting || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:border-red-400 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-40">
            {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            PDF
          </button>
        </div>
      </div>

      {/* â”€â”€ Banner proyecciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isFuturePeriod && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 mb-5">
          <CalendarDays className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">ProyecciÃ³n â€”</span> Los montos reflejan tus cuotas e ingresos periÃ³dicos esperados. Los gastos normales no aparecen hasta que los registres.
          </p>
        </div>
      )}

      {/* â”€â”€ Grid 2 columnas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-6 lg:space-y-0">

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• COLUMNA IZQUIERDA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="space-y-5">

          {/* Tarjetas 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              icon={TrendingUp}
              label="Ingresos del perÃ­odo"
              value={summary.monthlyIncome}
              color="bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
            />
            <SummaryCard
              icon={TrendingDown}
              label="Gastos del perÃ­odo"
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
              sub={balance >= 0 ? 'disponible este perÃ­odo' : 'gastas mÃ¡s de lo que ingresa'}
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
                      ? `PodrÃ­as guardar ${fmt(balance)} este perÃ­odo`
                      : `Te faltan ${fmt(Math.abs(balance))} para cubrir tus gastos`}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className={`text-3xl font-bold leading-none ${cfg.zone}`}>
                  {savingsStatus === 'nodata' ? 'â€”'
                   : savingsStatus === 'deficit' ? `âˆ’${Math.abs(savingsRate)}%`
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

          {/* GrÃ¡fico: Ingresos vs Gastos */}
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

          {/* GrÃ¡fico: Gastos por categorÃ­a */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-4">Gastos por categorÃ­a</h3>
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
                <p className="text-sm">Sin gastos en este perÃ­odo</p>
              </div>
            )}
          </div>

        </div>{/* fin columna izquierda */}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• COLUMNA DERECHA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-20 card !p-0 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                  {isFuturePeriod ? 'ProyecciÃ³n de gastos' : 'Gastos del perÃ­odo'}
                </h3>
                <p className="text-xs text-gray-400">{periodFull}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  -{fmt(periodExpenses.reduce((s, e) => s + (e.amount || 0), 0))}
                </p>
                <p className="text-xs text-gray-400">{periodExpenses.length} Ã­tem{periodExpenses.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto max-h-[calc(100vh-16rem)] lg:max-h-[72vh]">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4].map(i => <LoadingRow key={i} />)}
                </div>
              ) : periodExpenses.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-gray-400">
                  <AlertCircle className="h-10 w-10 mb-3" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">Sin gastos en este perÃ­odo</p>
                  <button onClick={onAddExpense} className="mt-4 btn-primary flex items-center gap-2 text-sm">
                    <Plus className="h-4 w-4" /> Agregar gasto
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {periodExpenses.map((item, idx) => {
                    // â”€â”€ Item de cuota proyectada (FinanceInstallment) â”€â”€
                    if (item._projectedInstallment) {
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-3 bg-indigo-50/50 dark:bg-indigo-950/20">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 bg-indigo-100 dark:bg-indigo-950">
                            ðŸ’³
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                                {item.description}
                              </p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                                Cuota {item._cuotaNum}/{item._totalCuotas}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              Cuota Â· {item._remaining > 0
                                ? `quedan ${item._remaining} despuÃ©s de este mes`
                                : 'Ãºltima cuota ðŸŽ‰'}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 shrink-0">
                            -{fmt(item.amount)}
                          </span>
                        </div>
                      )
                    }

                    // â”€â”€ Gasto normal â”€â”€
                    const cat        = EXPENSE_CATEGORIES.find(c => c.value === item.category)
                    const color      = CATEGORY_COLORS[item.category] ?? '#94a3b8'
                    const isDeleting = deletingId === item.id
                    return (
                      <div key={item.id ?? idx} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0"
                          style={{ backgroundColor: color + '22' }}>
                          {cat?.emoji ?? 'ðŸ“¦'}
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
                          <p className="text-xs text-gray-400">{cat?.label} Â· {fmtDate(item.date)}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 shrink-0">
                          -{fmt(item.amount)}
                        </span>
                        {/* Editar / Eliminar */}
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditItem(item)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(item)}
                            title="Eliminar"
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-40">
                            {isDeleting
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2  className="h-3.5 w-3.5" />}
                          </button>
                        </div>
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

      {/* â”€â”€ Modal: Editar gasto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {editItem && (
        <EditExpenseModal
          userId={userId}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={refreshExpenses}
        />
      )}

      {/* â”€â”€ Modal: DÃ­a de corte â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showBillingModal && (
        <Modal title="DÃ­a de corte de tarjeta" onClose={() => setShowBillingModal(false)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Define el dÃ­a del mes en que se cierra tu ciclo de facturaciÃ³n. El resumen de cada perÃ­odo mostrarÃ¡ los
            gastos desde ese dÃ­a del mes anterior hasta ese dÃ­a del mes actual.
          </p>
          <FormField label="DÃ­a de corte (1 â€“ 28)">
            <input
              type="number" min="1" max="28"
              value={billingInput}
              onChange={e => setBillingInput(e.target.value)}
              placeholder="1 = mes calendario"
              className={inputCls}
              autoFocus
            />
          </FormField>
          {billingInput !== '' && parseInt(billingInput) >= 1 && parseInt(billingInput) <= 28 && (
            <p className="text-xs text-gray-400 -mt-2 mb-4">
              {parseInt(billingInput) <= 1
                ? 'UsarÃ¡ el mes calendario (del 1Â° al Ãºltimo dÃ­a del mes).'
                : `Ej: "Junio" irÃ¡ del ${billingInput} de mayo al ${billingInput} de junio.`}
            </p>
          )}
          <ModalButtons onClose={() => setShowBillingModal(false)} onSave={saveBillingDay} saving={false} />
        </Modal>
      )}

    </div>
  )
}

// â”€â”€â”€ TAB: Ingresos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) { setError('Ingresa un monto vÃ¡lido mayor a 0.'); return }
    if (form.incomeFreq === INCOME_FREQ_MONTHS && (!data.durationMonths || data.durationMonths < 1)) { setError('Indica cuÃ¡ntos meses recibirÃ¡s este ingreso.'); return }
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
    if (!confirm('Â¿Eliminar este ingreso?')) return
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
          text="AÃºn no tienes ingresos registrados"
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
                    {item.type === 'SALARY' ? 'Sueldo fijo' : 'Ingreso extra'} Â· {fmtDate(item.date)}
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
          <FormField label="DescripciÃ³n">
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
                { value: INCOME_FREQ_ONCE,      label: 'Ãšnico',     desc: 'Un solo ingreso',       icon: 'ðŸ’µ' },
                { value: INCOME_FREQ_RECURRING, label: 'PeriÃ³dico', desc: 'Se repite cada mes',    icon: 'ðŸ”„' },
                { value: INCOME_FREQ_MONTHS,    label: 'Por meses', desc: 'Durante X meses',       icon: 'ðŸ“…' },
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
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-3">ðŸ“… Â¿Por cuÃ¡ntos meses recibirÃ¡s este ingreso?</p>
              <FormField label="NÃºmero de meses">
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
                  RecibirÃ¡s este ingreso durante {form.durationMonths} mes{parseInt(form.durationMonths) !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          )}

          {form.incomeFreq === INCOME_FREQ_RECURRING && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ðŸ”„ Este ingreso se marcarÃ¡ como <strong>periÃ³dico mensual</strong>. Recuerda registrarlo cada mes cuando lo recibas.
              </p>
            </div>
          )}

          <ModalButtons onClose={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// â”€â”€â”€ Helpers: Gastos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

function expenseTypeOf(item) {
  if (item.recurring) return EXPENSE_TYPE_RECURRING
  if (item.installmentNumber != null) return EXPENSE_TYPE_INSTALLMENT
  return EXPENSE_TYPE_NORMAL
}

function expenseToForm(item) {
  return {
    category:          item.category ?? 'COMIDA',
    description:       item.description ?? '',
    amount:            String(item.amount ?? ''),
    date:              item.date ?? today(),
    expenseType:       expenseTypeOf(item),
    installmentNumber: item.installmentNumber != null ? String(item.installmentNumber) : '',
    installmentTotal:  item.installmentTotal  != null ? String(item.installmentTotal)  : '',
    billingDay:        item.billingDay        != null ? String(item.billingDay)        : '',
  }
}

// â”€â”€â”€ Modal: Nuevo gasto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function NewExpenseModal({ userId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState(buildEmptyForm())

  const handleSave = async () => {
    setError('')
    const data = formToPayload(form)
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      setError('Ingresa un monto vÃ¡lido mayor a 0.')
      return
    }
    if (form.expenseType === EXPENSE_TYPE_INSTALLMENT) {
      if (data.installmentNumber == null || isNaN(data.installmentNumber) || data.installmentNumber < 0) { setError('NÃºmero de cuota invÃ¡lido (mÃ­nimo 0).'); return }
      if (!data.installmentTotal  || data.installmentTotal  < 1) { setError('Total de cuotas invÃ¡lido.'); return }
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

      <FormField label="CategorÃ­a" required>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="DescripciÃ³n">
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
            { value: EXPENSE_TYPE_NORMAL,      label: 'Normal',    desc: 'Un pago Ãºnico',           icon: 'ðŸ’¸' },
            { value: EXPENSE_TYPE_RECURRING,   label: 'PeriÃ³dico', desc: 'Se repite cada mes',      icon: 'ðŸ”„' },
            { value: EXPENSE_TYPE_INSTALLMENT, label: 'En cuotas', desc: 'Parte de un plan cuotas', icon: 'ðŸ“…' },
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
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3">ðŸ“… Detalle de cuotas</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="NÂ° de cuota actual">
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
                ? `Compra registrada Â· aÃºn sin facturar Â· ${form.installmentTotal} cuotas totales`
                : `Cuota ${form.installmentNumber} de ${form.installmentTotal} Â· quedan ${Math.max(0, parseInt(form.installmentTotal) - parseInt(form.installmentNumber))} por pagar`}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
            <FormField label="DÃ­a de facturaciÃ³n tarjeta (opcional)">
              <input
                type="number" min="1" max="31" value={form.billingDay}
                onChange={e => setForm({ ...form, billingDay: e.target.value })}
                placeholder="Ej: 19" className={inputCls}
              />
            </FormField>
            {form.billingDay && parseInt(form.billingDay) >= 1 && parseInt(form.billingDay) <= 31 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 -mt-2">
                PrÃ³xima facturaciÃ³n: <strong>{fmtNextBillingDate(parseInt(form.billingDay))}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {form.expenseType === EXPENSE_TYPE_RECURRING && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ðŸ”„ Este gasto se marcarÃ¡ como <strong>periÃ³dico mensual</strong>. Recuerda registrarlo cada mes cuando lo pagues.
          </p>
        </div>
      )}

      <ModalButtons onClose={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  )
}

// â”€â”€â”€ Modal: Editar gasto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EditExpenseModal({ userId, item, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState(() => expenseToForm(item))

  const handleSave = async () => {
    setError('')
    const data = formToPayload(form)
    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      setError('Ingresa un monto vÃ¡lido mayor a 0.')
      return
    }
    if (form.expenseType === EXPENSE_TYPE_INSTALLMENT) {
      if (data.installmentNumber == null || isNaN(data.installmentNumber) || data.installmentNumber < 0) { setError('NÃºmero de cuota invÃ¡lido (mÃ­nimo 0).'); return }
      if (!data.installmentTotal  || data.installmentTotal  < 1) { setError('Total de cuotas invÃ¡lido.'); return }
      if (data.installmentNumber > data.installmentTotal)       { setError('La cuota actual no puede ser mayor al total.'); return }
    }
    setSaving(true)
    try {
      await api.updateFinanceExpense(item.id, userId, data)
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Editar gasto" onClose={onClose}>
      <ErrorBanner msg={error} />

      <FormField label="CategorÃ­a" required>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="DescripciÃ³n">
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
            { value: EXPENSE_TYPE_NORMAL,      label: 'Normal',    desc: 'Un pago Ãºnico',           icon: 'ðŸ’¸' },
            { value: EXPENSE_TYPE_RECURRING,   label: 'PeriÃ³dico', desc: 'Se repite cada mes',      icon: 'ðŸ”„' },
            { value: EXPENSE_TYPE_INSTALLMENT, label: 'En cuotas', desc: 'Parte de un plan cuotas', icon: 'ðŸ“…' },
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
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-3">ðŸ“… Detalle de cuotas</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="NÂ° de cuota actual">
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
                ? `Compra registrada Â· aÃºn sin facturar Â· ${form.installmentTotal} cuotas totales`
                : `Cuota ${form.installmentNumber} de ${form.installmentTotal} Â· quedan ${Math.max(0, parseInt(form.installmentTotal) - parseInt(form.installmentNumber))} por pagar`}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
            <FormField label="DÃ­a de facturaciÃ³n tarjeta (opcional)">
              <input
                type="number" min="1" max="31" value={form.billingDay}
                onChange={e => setForm({ ...form, billingDay: e.target.value })}
                placeholder="Ej: 19" className={inputCls}
              />
            </FormField>
            {form.billingDay && parseInt(form.billingDay) >= 1 && parseInt(form.billingDay) <= 31 && (
              <p className="text-xs text-orange-600 dark:text-orange-400 -mt-2">
                PrÃ³xima facturaciÃ³n: <strong>{fmtNextBillingDate(parseInt(form.billingDay))}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {form.expenseType === EXPENSE_TYPE_RECURRING && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ðŸ”„ Este gasto se marcarÃ¡ como <strong>periÃ³dico mensual</strong>.
          </p>
        </div>
      )}

      <ModalButtons onClose={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  )
}

// â”€â”€â”€ TAB: Metas de ahorro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (isNaN(data.targetAmount) || data.targetAmount <= 0) { setError('Monto objetivo invÃ¡lido.'); return }
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
    if (!confirm('Â¿Eliminar esta meta?')) return
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
          text="AÃºn no tienes metas de ahorro"
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
                          {daysLeft > 0 ? `${daysLeft} dÃ­as restantes` : 'Fecha lÃ­mite vencida'}
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
                <p className="text-right text-xs text-gray-400 mt-1">{pct}%{done ? ' Â· âœ“ Meta alcanzada' : ''}</p>
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
                <p className="text-xs text-gray-400 mb-1">NÃºmero de meses</p>
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
        <Modal title={`Agregar ahorro â€” "${addModal.name}"`} onClose={() => setAddModal(null)}>
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

// â”€â”€â”€ TAB: Cuotas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function buildInstallmentTimeline(installments) {
  if (!installments.length) return { months: [], rows: [] }

  const now = new Date()
  const curYear  = now.getFullYear()
  const curMonth = now.getMonth() // 0-indexed

  // For each installment compute start/end real month
  const enriched = installments.map(inst => {
    // cuota being paid THIS month = paidInstallments + 1
    // start real month = curMonth - paidInstallments
    const startOffset = -inst.paidInstallments
    const startDate   = new Date(curYear, curMonth + startOffset, 1)
    const endDate     = new Date(curYear, curMonth + startOffset + inst.totalInstallments - 1, 1)
    return { inst, startDate, endDate }
  })

  // Global range
  const minDate = enriched.reduce((m, e) => e.startDate < m ? e.startDate : m, enriched[0].startDate)
  const maxDate = enriched.reduce((m, e) => e.endDate   > m ? e.endDate   : m, enriched[0].endDate)

  // Generate month columns
  const months = []
  let d = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  while (d <= maxDate) {
    months.push({ year: d.getFullYear(), month: d.getMonth() })
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }

  // For each installment, build a cell per month
  const rows = enriched.map(({ inst, startDate }) => {
    const cells = months.map(({ year, month }) => {
      const monthDate  = new Date(year, month, 1)
      const monthIndex = Math.round((monthDate - startDate) / (1000 * 60 * 60 * 24 * 30.44))
      if (monthIndex < 0 || monthIndex >= inst.totalInstallments) return null // not active

      const cuotaNum = monthIndex + 1
      const isCur    = year === curYear && month === curMonth
      const isPast   = cuotaNum <= inst.paidInstallments
      const status   = isPast ? 'paid' : isCur ? 'current' : 'future'
      return { cuotaNum, status }
    })
    return { inst, cells }
  })

  return { months, rows }
}

function InstallmentTimelineView({ installments }) {
  if (!installments.length) return null

  const { months, rows } = buildInstallmentTimeline(installments)
  const now = new Date()

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <CalendarDays className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-50">Calendario de cuotas</h3>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500"/><span>Pagado</span></span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500"/><span>Este mes</span></span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700"/><span>Pendiente</span></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {/* Nombre columna fija */}
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[140px] border-r border-gray-100 dark:border-gray-800">
                Cuota
              </th>
              {months.map(({ year, month }) => {
                const isCur = year === now.getFullYear() && month === now.getMonth()
                return (
                  <th key={`${year}-${month}`}
                    className={`px-2 py-2.5 text-center font-semibold min-w-[72px] whitespace-nowrap
                      ${isCur
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
                        : 'text-gray-500 dark:text-gray-400'}`}>
                    <div>{MONTH_NAMES[month]}</div>
                    <div className="font-normal text-gray-400">{year}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inst, cells }) => (
              <tr key={inst.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-3 border-r border-gray-100 dark:border-gray-800">
                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px]">{inst.description}</p>
                  <p className="text-gray-400">{fmt(inst.installmentAmount)}/mes</p>
                </td>
                {cells.map((cell, i) => {
                  const { year, month } = months[i]
                  const isCur = year === now.getFullYear() && month === now.getMonth()
                  if (!cell) {
                    return (
                      <td key={i} className={`px-2 py-3 text-center ${isCur ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                        <span className="text-gray-200 dark:text-gray-700">â€”</span>
                      </td>
                    )
                  }
                  const { cuotaNum, status } = cell
                  const cellBg = status === 'paid'    ? 'bg-green-500'
                               : status === 'current' ? 'bg-blue-500'
                               :                        'bg-gray-200 dark:bg-gray-700'
                  const textCl = status === 'paid' || status === 'current' ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  return (
                    <td key={i} className={`px-2 py-3 text-center ${isCur ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                      <div className={`inline-flex flex-col items-center justify-center w-12 h-10 rounded-lg ${cellBg}`}>
                        <span className={`text-xs font-bold leading-none ${textCl}`}>{fmt(inst.installmentAmount).replace('$','$').replace(/\./g,'').slice(0,5)}</span>
                        <span className={`text-[10px] leading-none mt-0.5 ${textCl} opacity-80`}>{cuotaNum}/{inst.totalInstallments}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Fila total */}
            <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
              <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-4 py-3 border-r border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                Total del mes
              </td>
              {months.map(({ year, month }, colIdx) => {
                const isCur = year === now.getFullYear() && month === now.getMonth()
                const total = rows.reduce((sum, { cells }) => {
                  const cell = cells[colIdx]
                  return sum + (cell ? rows.find(r => r.cells === cells)?.inst?.installmentAmount ?? 0 : 0)
                }, 0)
                // Recalculate properly
                const monthTotal = rows.reduce((sum, { inst, cells }) => {
                  return sum + (cells[colIdx] ? inst.installmentAmount : 0)
                }, 0)
                return (
                  <td key={`tot-${year}-${month}`}
                    className={`px-2 py-3 text-center text-xs font-bold ${isCur ? 'bg-blue-50/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {monthTotal > 0 ? fmt(monthTotal) : <span className="text-gray-300 dark:text-gray-600 font-normal">â€”</span>}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// â”€â”€â”€ Botones de modal reutilizables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Helper: fecha de hoy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function today() {
  return new Date().toISOString().slice(0, 10)
}

// â”€â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
