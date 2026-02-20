import { Calendar, Clock, User, MapPin, CreditCard } from 'lucide-react'
import { useState } from 'react'

function Appointments() {
  const [filter, setFilter] = useState('upcoming')

  const appointments = [
    {
      id: 1,
      service: 'Corte de Pelo',
      barber: 'Carlos Martínez',
      date: '2024-12-20',
      time: '15:00',
      location: 'En la Barbería',
      payment: 'Efectivo',
      status: 'confirmed',
      price: 15000
    },
    {
      id: 2,
      service: 'Pack Completo',
      barber: 'Juan Pérez',
      date: '2024-12-15',
      time: '10:00',
      location: 'A Domicilio',
      payment: 'Transferencia',
      status: 'completed',
      price: 30000
    },
  ]

  const filteredAppointments = appointments.filter(apt =>
    filter === 'upcoming' ? apt.status === 'confirmed' : apt.status === 'completed'
  )

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
                      {appointment.service}
                    </h3>
                    <p className="text-gray-600 flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      {appointment.barber}
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
                    {appointment.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {appointment.payment}
                  </div>
                </div>
              </div>

              <div className="lg:border-l lg:pl-6 flex flex-col justify-between">
                <div className="text-right mb-4">
                  <p className="text-sm text-gray-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-primary-600">
                    ${appointment.price.toLocaleString()}
                  </p>
                </div>

                {appointment.status === 'confirmed' && (
                  <button className="btn-secondary w-full">
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
