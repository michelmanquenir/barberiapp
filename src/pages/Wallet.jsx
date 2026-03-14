import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function Wallet() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  const handleAddFunds = async () => {
    const input = prompt('¿Cuánto deseas agregar?')
    const amount = parseInt(input)
    if (!amount || amount <= 0) return
    try {
      await api.addFunds(user.userId, amount)
      setBalance(prev => prev + amount)
    } catch (err) {
      console.error('Error al agregar fondos:', err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Cargando wallet...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-8">Mi Wallet</h1>

      <div className="card mb-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-3 mb-4">
          <WalletIcon className="h-8 w-8" />
          <span className="text-lg">Saldo Disponible</span>
        </div>
        <div className="text-4xl font-bold mb-6">${balance.toLocaleString()}</div>
        <button
          onClick={handleAddFunds}
          className="btn-primary bg-white text-primary-700 hover:bg-gray-100 dark:hover:bg-gray-200 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Agregar Fondos
        </button>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">
          Historial de Transacciones
        </h2>

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'credit'
                      ? 'bg-green-100 dark:bg-green-950'
                      : 'bg-red-100 dark:bg-red-950'
                    }`}
                >
                  {transaction.type === 'credit' ? (
                    <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(transaction.date).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              <span
                className={`text-lg font-bold ${transaction.type === 'credit'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                  }`}
              >
                {transaction.type === 'credit' ? '+' : '-'}$
                {transaction.amount?.toLocaleString()}
              </span>
            </div>
          ))}

          {transactions.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">
              No hay transacciones aún
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Wallet
