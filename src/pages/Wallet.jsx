import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'

function Wallet() {
  const transactions = [
    {
      id: 1,
      type: 'debit',
      description: 'Pago de Corte de Pelo',
      amount: 15000,
      date: '2024-12-15'
    },
    {
      id: 2,
      type: 'credit',
      description: 'Recarga de Saldo',
      amount: 50000,
      date: '2024-12-10'
    },
    {
      id: 3,
      type: 'debit',
      description: 'Pack Completo',
      amount: 30000,
      date: '2024-12-05'
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi Wallet</h1>

      <div className="card mb-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-3 mb-4">
          <WalletIcon className="h-8 w-8" />
          <span className="text-lg">Saldo Disponible</span>
        </div>
        <div className="text-4xl font-bold mb-6">$125.000</div>
        <button className="btn-primary bg-white text-primary-700 hover:bg-gray-100 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Agregar Fondos
        </button>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Historial de Transacciones
        </h2>

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'credit'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                    }`}
                >
                  {transaction.type === 'credit' ? (
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              <span
                className={`text-lg font-bold ${transaction.type === 'credit'
                    ? 'text-green-600'
                    : 'text-red-600'
                  }`}
              >
                {transaction.type === 'credit' ? '+' : '-'}$
                {transaction.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Wallet
