import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Scissors,
  Calendar,
  Users,
  CreditCard,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'

function BookingFlow() {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState({
    serviceId: null,
    date: '',
    time: '',
    barberId: null,
    paymentMethod: 'cash',
    locationType: 'barbershop'
  })

  const steps = [
    { number: 1, title: 'Servicio', icon: Scissors },
    { number: 2, title: 'Fecha y Hora', icon: Calendar },
    { number: 3, title: 'Barbero', icon: Users },
    { number: 4, title: 'Pago', icon: CreditCard },
    { number: 5, title: 'Ubicación', icon: MapPin },
  ]



  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [servicesData, barbersData] = await Promise.all([
          api.getServices(),
          api.getBarbers(),
        ])
        setServices(servicesData || [])
        setBarbers(barbersData || [])
      } catch (err) {
        console.error('Error al conectar con el backend:', err)
        setError('Error de conexión. Verifica que el servidor esté activo.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return booking.serviceId !== null
      case 2:
        return booking.date && booking.time
      case 3:
        return booking.barberId !== null
      case 4:
        return booking.paymentMethod
      case 5:
        return booking.locationType
      default:
        return false
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ServiceSelection services={services} booking={booking} setBooking={setBooking} loading={loading} error={error} />
      case 2:
        return <DateTimeSelection booking={booking} setBooking={setBooking} />
      case 3:
        return <BarberSelection barbers={barbers} booking={booking} setBooking={setBooking} />
      case 4:
        return <PaymentSelection booking={booking} setBooking={setBooking} />
      case 5:
        return <LocationSelection booking={booking} setBooking={setBooking} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reserva tu Cita
        </h1>
        <p className="text-gray-600">
          Completa los siguientes pasos para agendar tu visita
        </p>
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max px-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStep === step.number
            const isCompleted = currentStep > step.number

            return (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all
                      ${isCompleted
                        ? 'bg-primary-600 text-white'
                        : isActive
                          ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                          : 'bg-gray-200 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <span
                    className={`
                      mt-2 text-sm font-medium
                      ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'}
                    `}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      w-24 h-1 mx-4 transition-all
                      ${currentStep > step.number ? 'bg-primary-600' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card mb-6">
        {renderStepContent()}
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft className="h-5 w-5" />
          Anterior
        </button>

        {currentStep < 5 ? (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Siguiente
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={async () => {
              try {
                await api.createAppointment({
                  userId: user.userId,
                  serviceId: booking.serviceId,
                  barberId: booking.barberId,
                  date: booking.date,
                  time: booking.time,
                  locationType: booking.locationType,
                  paymentMethod: booking.paymentMethod,
                })
                alert('¡Cita confirmada exitosamente!')
              } catch (err) {
                alert('Error al confirmar la cita. Intenta de nuevo.')
                console.error(err)
              }
            }}
            disabled={!canProceed()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Confirmar Cita
            <Check className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

function ServiceSelection({ services, booking, setBooking, loading, error }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Cargando servicios...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-5xl mb-4">✂️</div>
        <h2 className="text-xl font-bold text-gray-600 mb-2">Sin servicios disponibles</h2>
        <p className="text-gray-500">No hay servicios disponibles en este momento.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Selecciona un Servicio</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => setBooking({ ...booking, serviceId: service.id })}
            className={`
              p-6 rounded-lg border-2 transition-all text-left
              ${booking.serviceId === service.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{service.name}</h3>
              {booking.serviceId === service.id && (
                <Check className="h-5 w-5 text-primary-600" />
              )}
            </div>
            <p className="text-gray-600 text-sm mb-3">{service.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary-600">
                ${service.price.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">
                {service.duration_minutes} min
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DateTimeSelection({ booking, setBooking }) {
  const today = new Date().toISOString().split('T')[0]
  const times = [
    '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Selecciona Fecha y Hora</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha
          </label>
          <input
            type="date"
            min={today}
            value={booking.date}
            onChange={(e) => setBooking({ ...booking, date: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hora Disponible
          </label>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {times.map((time) => (
              <button
                key={time}
                onClick={() => setBooking({ ...booking, time })}
                className={`
                  py-2 px-3 rounded-lg border transition-all text-sm font-medium
                  ${booking.time === time
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-gray-300 hover:border-primary-400'
                  }
                `}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BarberSelection({ barbers, booking, setBooking }) {
  const parseSpecialties = (specialties) => {
    if (!specialties) return []
    if (Array.isArray(specialties)) return specialties
    try { return JSON.parse(specialties) } catch { return [] }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Selecciona tu Barbero</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {barbers.map((barber) => {
          const specialties = parseSpecialties(barber.specialties)
          return (
            <button
              key={barber.id}
              onClick={() => setBooking({ ...booking, barberId: barber.id })}
              className={`
                p-6 rounded-lg border-2 transition-all text-left
                ${booking.barberId === barber.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300'
                }
              `}
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {barber.imageUrl ? (
                    <img
                      src={barber.imageUrl}
                      alt={barber.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Users className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{barber.name}</h3>
                    {booking.barberId === barber.id && (
                      <Check className="h-5 w-5 text-primary-600" />
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{barber.bio}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">{barber.rating}</span>
                  </div>
                  {specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {specialties.slice(0, 2).map((specialty, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PaymentSelection({ booking, setBooking }) {
  const paymentMethods = [
    { id: 'cash', label: 'Efectivo', icon: '💵', description: 'Paga en la barbería' },
    { id: 'transfer', label: 'Transferencia', icon: '💳', description: 'Transferencia bancaria' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Método de Pago</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => setBooking({ ...booking, paymentMethod: method.id })}
            className={`
              p-6 rounded-lg border-2 transition-all text-left
              ${booking.paymentMethod === method.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{method.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{method.label}</h3>
                  <p className="text-gray-600 text-sm">{method.description}</p>
                </div>
              </div>
              {booking.paymentMethod === method.id && (
                <Check className="h-5 w-5 text-primary-600" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function LocationSelection({ booking, setBooking }) {
  const locations = [
    {
      id: 'barbershop',
      label: 'En la Barbería',
      icon: '🏪',
      description: 'Visita nuestra barbería'
    },
    {
      id: 'home',
      label: 'A Domicilio',
      icon: '🏠',
      description: 'El barbero va a tu hogar'
    },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">¿Dónde prefieres tu servicio?</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((location) => (
          <button
            key={location.id}
            onClick={() => setBooking({ ...booking, locationType: location.id })}
            className={`
              p-6 rounded-lg border-2 transition-all text-left
              ${booking.locationType === location.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{location.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{location.label}</h3>
                  <p className="text-gray-600 text-sm">{location.description}</p>
                </div>
              </div>
              {booking.locationType === location.id && (
                <Check className="h-5 w-5 text-primary-600" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default BookingFlow
