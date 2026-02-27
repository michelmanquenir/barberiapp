import { Heart, Star, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function Favorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getFavorites(user.userId)
      .then(data => setFavorites(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.userId])

  const handleRemove = async (favoriteId) => {
    try {
      await api.removeFavorite(favoriteId, user.userId)
      setFavorites(prev => prev.filter(f => f.id !== favoriteId))
    } catch (err) {
      console.error('Error al eliminar favorito:', err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Cargando favoritos...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Mis Barberos Favoritos
      </h1>

      {favorites.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => {
            const barber = favorite.barber
            const specialties = Array.isArray(barber.specialties)
              ? barber.specialties
              : barber.specialties
                ? JSON.parse(barber.specialties)
                : []

            return (
              <div key={favorite.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {barber.imageUrl ? (
                      <img src={barber.imageUrl} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">👨</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(favorite.id)}
                    className="p-2 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {barber.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{barber.rating}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <button className="btn-primary w-full flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendar Cita
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Aún no tienes barberos favoritos
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Marca como favoritos a tus barberos preferidos
          </p>
        </div>
      )}
    </div>
  )
}

export default Favorites
