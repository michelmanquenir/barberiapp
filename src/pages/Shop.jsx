import { ShoppingCart, Plus } from 'lucide-react'
import { useState } from 'react'

function Shop() {
  const [cart] = useState([])

  const products = [
    {
      id: 1,
      name: 'Pomada Premium',
      description: 'Fijación fuerte, acabado mate',
      price: 12000,
      category: 'Styling',
      stock: 15
    },
    {
      id: 2,
      name: 'Shampoo Anticaída',
      description: 'Fortalece el cabello',
      price: 18000,
      category: 'Cuidado',
      stock: 8
    },
    {
      id: 3,
      name: 'Aceite para Barba',
      description: 'Hidratación y brillo natural',
      price: 15000,
      category: 'Barba',
      stock: 12
    },
    {
      id: 4,
      name: 'Cera Moldeadora',
      description: 'Control y definición',
      price: 10000,
      category: 'Styling',
      stock: 20
    },
    {
      id: 5,
      name: 'Kit Completo Barba',
      description: 'Peine, cepillo y aceite',
      price: 35000,
      category: 'Barba',
      stock: 5
    },
    {
      id: 6,
      name: 'Gel Fijador',
      description: 'Fijación extrema',
      price: 8000,
      category: 'Styling',
      stock: 25
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tienda de Productos</h1>

        <button className="btn-primary flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Carrito ({cart.length})
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="card hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-6xl">📦</span>
            </div>

            <div className="mb-2">
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                {product.category}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {product.name}
            </h3>

            <p className="text-gray-600 text-sm mb-4">
              {product.description}
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary-600">
                  ${product.price.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {product.stock} disponibles
                </p>
              </div>

              <button className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Shop
