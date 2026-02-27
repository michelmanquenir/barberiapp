import { ShoppingCart, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function Shop() {
  const [cart, setCart] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProducts()
      .then(data => setProducts(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const addToCart = (product) => {
    setCart(prev => [...prev, product])
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Cargando productos...</p>
      </div>
    )
  }

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
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <span className="text-6xl">📦</span>
              )}
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
                  ${product.price?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {product.stock} disponibles
                </p>
              </div>

              <button
                onClick={() => addToCart(product)}
                className="btn-primary flex items-center gap-2"
              >
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
