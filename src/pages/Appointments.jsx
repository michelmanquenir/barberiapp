import { Calendar, Clock, User, MapPin, CreditCard } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function Appointments() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('upcoming')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAppointments(user.userId)
      .then(data => setAppointments(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.userId])

  const handleCancel = async (id) => {
    try {
      const updated = await api.cancelAppointment(id, user.userId)
      setAppointments(prev =>
        prev.map(apt => apt.id === id ? updated : apt)
      )
    } catch (err) {
      console.error('Error al cancelar la cita:', err)
    }
  }

  const filteredAppointments = appointments.filter(apt =>
    filter === 'upcoming' ? apt.status === 'confirmed' : apt.status === 'completed'
  )

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Cargando citas...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Mis Citas</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'upcoming'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Próximas
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'completed'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            Completadas
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAppointments.map((appointment) => (
          <div key={appointment.id} className="card hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {appointment.service?.name}
                    </h3>
                    <p className="text-gray-600 flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      {appointment.barber?.name}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${appointment.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {appointment.status === 'confirmed' ? 'Confirmada' : 'Completada'}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(appointment.date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {appointment.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {appointment.location === 'home' ? 'A Domicilio' : 'En la Barbería'}
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {appointment.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                  </div>
                </div>
              </div>

              <div className="lg:border-l lg:pl-6 flex flex-col justify-between">
                <div className="text-right mb-4">
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-primary-600">
                    ${appointment.totalPrice?.toLocaleString()}
                  </p>
                </div>

                {appointment.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(appointment.id)}
                    className="btn-secondary w-full"
                  >
                    Cancelar Cita
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredAppointments.length === 0 && (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No tienes citas {filter === 'upcoming' ? 'próximas' : 'completadas'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Appointments
