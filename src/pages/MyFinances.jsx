import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, PiggyBank, CreditCard,
  Plus, Trash2, Pencil, Check, ChevronRight, X,
  DollarSign, Target, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const EXPENSE_CATEGORIES = [
  { value: 'COMIDA', label: 'Comida' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'OCIO', label: 'Ocio' },
  { value: 'SALUD', label: 'Salud' },
  { value: 'EDUCACION', label: 'Educación' },
  { value: 'HOGAR', label: 'Hogar' },
  { value: 'ROPA', label: 'Ropa' },
  { value: 'TECNOLOGIA', label: 'Tecnología' },
  { value: 'OTRO', label: 'Otro' },
]

const CATEGORY_COLORS = {
  COMIDA: '#f97316',
  TRANSPORTE: '#3b82f6',
  OCIO: '#a855f7',
  SALUD: '#22c55e',
  EDUCACION: '#eab308',
  HOGAR: '#14b8a6',
  ROPA: '#ec4899',
  TECNOLOGIA: '#6366f1',
  OTRO: '#94a3b8',
}

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'cuotas', label: 'Cuotas' },
  { id: 'metas', label: 'Metas' },
]

const fmt = (n) => `$${(n ?? 0).toLocaleString('es-CL')}`

// ── Modal genérico ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500'

// ── Tarjetas de resumen ─────────────────────────────────────────────────────

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

// ── TAB: Resumen ────────────────────────────────────────────────────────────

function TabResumen({ summary }) {
  const barData = [
    { name: 'Ingresos', value: summary.monthlyIncome ?? 0 },
    { name: 'Gastos', value: summary.monthlyExpenses ?? 0 },
  ]

  const pieData = Object.entries(summary.expensesByCategory ?? {}).map(([cat, val]) => ({
    name: EXPENSE_CATEGORIES.find(c => c.value === cat)?.label ?? cat,
    value: val,
    color: CATEGORY_COLORS[cat] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6">
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
          value={summary.monthlyBalance}
          color={summary.monthlyBalance >= 0
            ? 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
            : 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'}
        />
        <SummaryCard
          icon={CreditCard}
          label="Cuotas pendientes"
          value={summary.pendingInstallments}
          color="bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
          sub="monto total restante"
        />
      </div>

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
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">Sin gastos este mes</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-2">Total ahorrado</h3>
        <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{fmt(summary.totalSavings)}</p>
        <p className="text-xs text-gray-400 mt-1">suma de todas tus metas de ahorro</p>
      </div>
    </div>
  )
}

// ── TAB: Ingresos ───────────────────────────────────────────────────────────

function TabIngresos({ userId, onRefreshSummary }) {
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | income object
  const [form, setForm] = useState({ type: 'SALARY', description: '', amount: '', date: new Date().toISOString().slice(0, 10) })

  const load = useCallback(() => {
    api.getFinanceIncomes(userId).then(setIncomes).finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setForm({ type: 'SALARY', description: '', amount: '', date: new Date().toISOString().slice(0, 10) })
    setModal('new')
  }

  const openEdit = (item) => {
    setForm({ type: item.type, description: item.description ?? '', amount: item.amount, date: item.date })
    setModal(item)
  }

  const handleSave = async () => {
    const data = { ...form, amount: parseFloat(form.amount) }
    if (!data.amount || isNaN(data.amount)) return
    if (modal === 'new') {
      await api.createFinanceIncome(userId, data)
    } else {
      await api.updateFinanceIncome(modal.id, userId, data)
    }
    setModal(null)
    load()
    onRefreshSummary()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este ingreso?')) return
    await api.deleteFinanceIncome(id, userId)
    load()
    onRefreshSummary()
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Mis Ingresos</h2>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      <div className="space-y-3">
        {incomes.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'SALARY' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'bg-green-100 dark:bg-green-950 text-green-600'}`}>
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-50">{item.description || (item.type === 'SALARY' ? 'Sueldo' : 'Ingreso extra')}</p>
                <p className="text-xs text-gray-400">{item.type === 'SALARY' ? 'Sueldo' : 'Extra'} · {new Date(item.date + 'T00:00:00').toLocaleDateString('es-CL')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-green-600 dark:text-green-400">+{fmt(item.amount)}</span>
              <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {incomes.length === 0 && <p className="text-center text-gray-400 py-8">Sin ingresos registrados</p>}
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo ingreso' : 'Editar ingreso'} onClose={() => setModal(null)}>
          <FormField label="Tipo">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="SALARY">Sueldo fijo</option>
              <option value="EXTRA">Ingreso extra</option>
            </select>
          </FormField>
          <FormField label="Descripción">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Sueldo enero, Freelance..." className={inputCls} />
          </FormField>
          <FormField label="Monto">
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Fecha">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </FormField>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Cancelar</button>
            <button onClick={handleSave} className="flex-1 btn-primary">Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TAB: Gastos ─────────────────────────────────────────────────────────────

function TabGastos({ userId, onRefreshSummary }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ category: 'COMIDA', description: '', amount: '', date: new Date().toISOString().slice(0, 10) })

  const load = useCallback(() => {
    api.getFinanceExpenses(userId).then(setExpenses).finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setForm({ category: 'COMIDA', description: '', amount: '', date: new Date().toISOString().slice(0, 10) })
    setModal('new')
  }

  const openEdit = (item) => {
    setForm({ category: item.category, description: item.description ?? '', amount: item.amount, date: item.date })
    setModal(item)
  }

  const handleSave = async () => {
    const data = { ...form, amount: parseFloat(form.amount) }
    if (!data.amount || isNaN(data.amount)) return
    if (modal === 'new') {
      await api.createFinanceExpense(userId, data)
    } else {
      await api.updateFinanceExpense(modal.id, userId, data)
    }
    setModal(null)
    load()
    onRefreshSummary()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await api.deleteFinanceExpense(id, userId)
    load()
    onRefreshSummary()
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Mis Gastos</h2>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      <div className="space-y-3">
        {expenses.map((item) => {
          const cat = EXPENSE_CATEGORIES.find(c => c.value === item.category)
          const color = CATEGORY_COLORS[item.category] ?? '#94a3b8'
          return (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '22', color }}>
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">{item.description || cat?.label}</p>
                  <p className="text-xs text-gray-400">{cat?.label} · {new Date(item.date + 'T00:00:00').toLocaleDateString('es-CL')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-red-600 dark:text-red-400">-{fmt(item.amount)}</span>
                <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          )
        })}
        {expenses.length === 0 && <p className="text-center text-gray-400 py-8">Sin gastos registrados</p>}
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nuevo gasto' : 'Editar gasto'} onClose={() => setModal(null)}>
          <FormField label="Categoría">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          <FormField label="Descripción">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Supermercado, Uber..." className={inputCls} />
          </FormField>
          <FormField label="Monto">
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Fecha">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
          </FormField>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Cancelar</button>
            <button onClick={handleSave} className="flex-1 btn-primary">Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TAB: Cuotas ─────────────────────────────────────────────────────────────

function TabCuotas({ userId, onRefreshSummary }) {
  const [installments, setInstallments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ description: '', totalAmount: '', installmentAmount: '', totalInstallments: '', paidInstallments: '0', dueDay: '1' })

  const load = useCallback(() => {
    api.getFinanceInstallments(userId).then(setInstallments).finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setForm({ description: '', totalAmount: '', installmentAmount: '', totalInstallments: '', paidInstallments: '0', dueDay: '1' })
    setModal('new')
  }

  const openEdit = (item) => {
    setForm({
      description: item.description,
      totalAmount: item.totalAmount,
      installmentAmount: item.installmentAmount,
      totalInstallments: item.totalInstallments,
      paidInstallments: item.paidInstallments,
      dueDay: item.dueDay ?? '1',
    })
    setModal(item)
  }

  const handleSave = async () => {
    const data = {
      description: form.description,
      totalAmount: parseFloat(form.totalAmount),
      installmentAmount: parseFloat(form.installmentAmount),
      totalInstallments: parseInt(form.totalInstallments),
      paidInstallments: parseInt(form.paidInstallments),
      dueDay: parseInt(form.dueDay),
    }
    if (!data.description || isNaN(data.totalAmount)) return
    if (modal === 'new') {
      await api.createFinanceInstallment(userId, data)
    } else {
      await api.updateFinanceInstallment(modal.id, userId, data)
    }
    setModal(null)
    load()
    onRefreshSummary()
  }

  const handlePay = async (id) => {
    await api.payFinanceInstallment(id, userId)
    load()
    onRefreshSummary()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cuota?')) return
    await api.deleteFinanceInstallment(id, userId)
    load()
    onRefreshSummary()
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Mis Cuotas</h2>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      <div className="space-y-4">
        {installments.map((item) => {
          const pending = item.totalInstallments - item.paidInstallments
          const pct = Math.round((item.paidInstallments / item.totalInstallments) * 100)
          const isDone = pending === 0
          return (
            <div key={item.id} className={`card ${isDone ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{item.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {fmt(item.installmentAmount)}/cuota · vence día {item.dueDay ?? '–'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isDone && (
                    <button onClick={() => handlePay(item.id)} title="Marcar cuota pagada"
                      className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 text-green-600 flex items-center justify-center hover:bg-green-200">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>{item.paidInstallments}/{item.totalInstallments} cuotas</span>
                <span className={isDone ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {isDone ? 'Saldado' : `${pending} pendientes · ${fmt(pending * item.installmentAmount)}`}
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        {installments.length === 0 && <p className="text-center text-gray-400 py-8">Sin cuotas registradas</p>}
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nueva cuota / deuda' : 'Editar cuota'} onClose={() => setModal(null)}>
          <FormField label="Descripción">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Celular, TV, Tarjeta..." className={inputCls} />
          </FormField>
          <FormField label="Monto total">
            <input type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Monto por cuota">
            <input type="number" value={form.installmentAmount} onChange={e => setForm({ ...form, installmentAmount: e.target.value })} placeholder="0" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total cuotas">
              <input type="number" value={form.totalInstallments} onChange={e => setForm({ ...form, totalInstallments: e.target.value })} placeholder="12" className={inputCls} />
            </FormField>
            <FormField label="Cuotas pagadas">
              <input type="number" value={form.paidInstallments} onChange={e => setForm({ ...form, paidInstallments: e.target.value })} placeholder="0" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Día de vencimiento mensual">
            <input type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} placeholder="15" className={inputCls} />
          </FormField>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Cancelar</button>
            <button onClick={handleSave} className="flex-1 btn-primary">Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── TAB: Metas de ahorro ────────────────────────────────────────────────────

function TabMetas({ userId, onRefreshSummary }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [addModal, setAddModal] = useState(null)
  const [addAmount, setAddAmount] = useState('')
  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '0', targetDate: '' })

  const load = useCallback(() => {
    api.getFinanceSavingGoals(userId).then(setGoals).finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setForm({ name: '', targetAmount: '', currentAmount: '0', targetDate: '' })
    setModal('new')
  }

  const openEdit = (item) => {
    setForm({ name: item.name, targetAmount: item.targetAmount, currentAmount: item.currentAmount, targetDate: item.targetDate ?? '' })
    setModal(item)
  }

  const handleSave = async () => {
    const data = {
      name: form.name,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount),
      targetDate: form.targetDate || null,
    }
    if (!data.name || isNaN(data.targetAmount)) return
    if (modal === 'new') {
      await api.createFinanceSavingGoal(userId, data)
    } else {
      await api.updateFinanceSavingGoal(modal.id, userId, data)
    }
    setModal(null)
    load()
    onRefreshSummary()
  }

  const handleAddAmount = async () => {
    const amount = parseFloat(addAmount)
    if (!amount || isNaN(amount)) return
    await api.addToFinanceSavingGoal(addModal.id, userId, amount)
    setAddModal(null)
    setAddAmount('')
    load()
    onRefreshSummary()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta meta?')) return
    await api.deleteFinanceSavingGoal(id, userId)
    load()
    onRefreshSummary()
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Metas de Ahorro</h2>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nueva meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((item) => {
          const pct = Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100))
          const done = item.currentAmount >= item.targetAmount
          const daysLeft = item.targetDate
            ? Math.ceil((new Date(item.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null
          return (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? 'bg-green-100 dark:bg-green-950 text-green-600' : 'bg-primary-100 dark:bg-primary-950 text-primary-600'}`}>
                    {done ? <Check className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{item.name}</p>
                    {daysLeft !== null && (
                      <p className="text-xs text-gray-400">{daysLeft > 0 ? `${daysLeft} días restantes` : 'Fecha vencida'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAddModal(item); setAddAmount('') }}
                    className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center hover:bg-primary-200 text-xs font-bold">
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">Acumulado</span>
                <span className="font-semibold text-gray-900 dark:text-gray-50">{fmt(item.currentAmount)} / {fmt(item.targetAmount)}</span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-primary-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right text-xs text-gray-400 mt-1">{pct}%</p>
            </div>
          )
        })}
        {goals.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Sin metas de ahorro</p>}
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Nueva meta de ahorro' : 'Editar meta'} onClose={() => setModal(null)}>
          <FormField label="Nombre de la meta">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Vacaciones, Auto, Emergencias..." className={inputCls} />
          </FormField>
          <FormField label="Monto objetivo">
            <input type="number" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Monto actual ahorrado">
            <input type="number" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })} placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Fecha límite (opcional)">
            <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} className={inputCls} />
          </FormField>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Cancelar</button>
            <button onClick={handleSave} className="flex-1 btn-primary">Guardar</button>
          </div>
        </Modal>
      )}

      {addModal && (
        <Modal title={`Agregar ahorro a "${addModal.name}"`} onClose={() => setAddModal(null)}>
          <FormField label="Monto a agregar">
            <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0" className={inputCls} autoFocus />
          </FormField>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setAddModal(null)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">Cancelar</button>
            <button onClick={handleAddAmount} className="flex-1 btn-primary">Agregar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────

function MyFinances() {
  const { user } = useAuth()
  const [tab, setTab] = useState('resumen')
  const [summary, setSummary] = useState({})
  const [loadingSummary, setLoadingSummary] = useState(true)

  const loadSummary = useCallback(() => {
    api.getFinanceSummary(user.userId)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingSummary(false))
  }, [user.userId])

  useEffect(() => { loadSummary() }, [loadSummary])

  return (
    <div className="max-w-4xl mx-auto">
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
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadingSummary && tab === 'resumen' ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3" />
          <p className="text-gray-400">Cargando resumen...</p>
        </div>
      ) : (
        <>
          {tab === 'resumen' && <TabResumen summary={summary} />}
          {tab === 'ingresos' && <TabIngresos userId={user.userId} onRefreshSummary={loadSummary} />}
          {tab === 'gastos' && <TabGastos userId={user.userId} onRefreshSummary={loadSummary} />}
          {tab === 'cuotas' && <TabCuotas userId={user.userId} onRefreshSummary={loadSummary} />}
          {tab === 'metas' && <TabMetas userId={user.userId} onRefreshSummary={loadSummary} />}
        </>
      )}
    </div>
  )
}

export default MyFinances
