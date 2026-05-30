import { Wallet as WalletIcon, ArrowDownLeft, Plus, X, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function Wallet() {
  const { user } = useAuth()
  const [balance, setBalance]           = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [form, setForm]                 = useState({ amount: '', description: '' })

  useEffect(() => {
    Promise.all([
      api.getBalance(user.userId),
      api.getTransactions(user.userId),
    ])
      .then(([balanceData, txData]) => {
        setBalance(balanceData?.balance ?? 0)
        setTransactions(txData || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.userId])

  const openModal = () => {
    setForm({ amount: '', description: '' })
    setShowModal(true)
  }

  const handleAddIncome = async (e) => {
    e.preventDefault()
    const amount = parseInt(form.amount)
    if (!amount || amount <= 0) return
    const description = form.description.trim() || 'Ingreso'
    setSaving(true)
    try {
      const newTx = await api.addFunds(user.userId, amount, description)
      setBalance(prev => prev + amount)
      setTransactions(prev => [newTx, ...prev])
      setShowModal(false)
    } catch (err) {
      console.error('Error al agregar ingreso:', err)
    } finally {
      setSaving(false)
    }
  }

  const incomes   = transactions.filter(t => t.type === 'credit')
  const totalIncome = incomes.reduce((s, t) => s + (t.amount ?? 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando finanzas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-xl flex items-center justify-center">
              <WalletIcon className="w-5 h-5 text-white dark:text-gray-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis Finanzas</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Registro de ingresos personales</p>
            </div>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition"
          >
            <Plus className="w-4 h-4" />
            Agregar ingreso
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">Saldo actual</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatPrice(balance)}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/50 rounded-xl border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <p className="text-xs text-green-700 dark:text-green-400 font-medium uppercase tracking-wide">Total ingresado</p>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPrice(totalIncome)}</p>
          </div>
        </div>

        {/* Income list */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Ingresos registrados</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{incomes.length} entrada{incomes.length !== 1 ? 's' : ''}</span>
          </div>

          {incomes.length === 0 ? (
            <div className="flex flex-col items-center py-14 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <ArrowDownLeft className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Sin ingresos aún</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Agrega tu primer ingreso con el botón de arriba.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {incomes.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                      <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{tx.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    +{formatPrice(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar ingreso */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Agregar ingreso</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sueldo, Freelance, Venta..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !form.amount}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50 transition"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {saving ? 'Guardando...' : 'Guardar ingreso'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function formatPrice(n) {
  if (n == null) return '$0'
  return `$${Number(n).toLocaleString('es-CL')}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default Wallet
