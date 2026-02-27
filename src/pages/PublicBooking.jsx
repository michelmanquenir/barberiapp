import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Scissors,
  Calendar,
  Users,
  CreditCard,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft,
  LogIn,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function PublicBooking() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [shop, setShop] = useState(null)
  const [services, setServices] = useState([])
  const [loadingShop, setLoadingShop] = useState(true)
  const [shopError, setShopError] = useState(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [booking, setBooking] = useState({
    serviceId: null,
    date: '',
    time: '',
    barberId: null,
    paymentMethod: 'cash',
    locationType: 'barbershop',
  })
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const steps = [
    { number: 1, title: 'Servicio', icon: Scissors },
    { number: 2, title: 'Fecha y Hora', icon: Calendar },
    { number: 3, title: 'Barbero', icon: Users },
    { number: 4, title: 'Pago', icon: CreditCard },
    { number: 5, title: 'Ubicación', icon: MapPin },
  ]

  useEffect(() => {
    Promise.all([api.getShopBySlug(slug), api.getServices()])
      .then(([shopData, servicesData]) => {
        setShop(shopData)
        setServices(servicesData || [])
      })
      .catch(() => setShopError('No se encontró el negocio'))
      .finally(() => setLoadingShop(false))
  }, [slug])

  const barbers = shop?.barbers ?? []

  const canProceed = () => {
    switch (currentStep) {
      case 1: return booking.serviceId !== null
      case 2: return booking.date && booking.time
      case 3: return booking.barberId !== null
      case 4: return booking.paymentMethod
      case 5: return booking.locationType
      default: return false
    }
  }

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      // Guardamos el estado del booking para volver luego
      navigate('/login', { state: { from: `/book/${slug}` } })
      return
    }
    setConfirming(true)
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
      setConfirmed(true)
    } catch {
      alert('Error al confirmar la cita. Intenta de nuevo.')
    } finally {
      setConfirming(false)
    }
  }

  if (loadingShop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Negocio no encontrado</h2>
          <p className="text-gray-400 text-sm">
            El enlace puede ser incorrecto o el negocio ya no está disponible.
          </p>
        </div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cita confirmada!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Tu cita en <strong>{shop.name}</strong> fue agendada exitosamente.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/appointments')}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
            >
              Ver mis citas
            </button>
            <button
              onClick={() => {
                setConfirmed(false)
                setCurrentStep(1)
                setBooking({ serviceId: null, date: '', time: '', barberId: null, paymentMethod: 'cash', locationType: 'barbershop' })
              }}
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Agendar otra
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header público */}
      <header className="bg-gray-900 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{shop.name}</h1>
              {shop.description && (
                <p className="text-xs text-gray-400 line-clamp-1">{shop.description}</p>
              )}
            </div>
          </div>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login', { state: { from: `/book/${slug}` } })}
              className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stepper */}
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
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-gray-900 text-white'
                          : isActive
                          ? 'bg-gray-900 text-white ring-4 ring-gray-200'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-3 transition-all ${
                        currentStep > step.number ? 'bg-gray-900' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Contenido del paso */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {currentStep === 1 && (
            <ServiceStep services={services} booking={booking} setBooking={setBooking} />
          )}
          {currentStep === 2 && (
            <DateTimeStep booking={booking} setBooking={setBooking} />
          )}
          {currentStep === 3 && (
            <BarberStep barbers={barbers} booking={booking} setBooking={setBooking} />
          )}
          {currentStep === 4 && (
            <PaymentStep booking={booking} setBooking={setBooking} />
          )}
          {currentStep === 5 && (
            <LocationStep booking={booking} setBooking={setBooking} />
          )}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 1}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!canProceed() || confirming}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? (
                'Confirmando...'
              ) : !isAuthenticated ? (
                <>
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión para confirmar
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar cita
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

// --- Sub-componentes de pasos ---

function ServiceStep({ services, booking, setBooking }) {
  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay servicios disponibles en este momento.
      </div>
    )
  }
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Selecciona un servicio</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => setBooking({ ...booking, serviceId: service.id })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              booking.serviceId === service.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-gray-900">{service.name}</h3>
              {booking.serviceId === service.id && (
                <Check className="h-4 w-4 text-gray-900 flex-shrink-0" />
              )}
            </div>
            {service.description && (
              <p className="text-xs text-gray-500 mb-2">{service.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">
                ${service.price?.toLocaleString()}
              </span>
              {service.duration_minutes && (
                <span className="text-xs text-gray-400">{service.duration_minutes} min</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DateTimeStep({ booking, setBooking }) {
  const today = new Date().toISOString().split('T')[0]
  const times = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00']
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Fecha y hora</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
          <input
            type="date"
            min={today}
            value={booking.date}
            onChange={(e) => setBooking({ ...booking, date: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
          <div className="grid grid-cols-3 gap-2">
            {times.map((time) => (
              <button
                key={time}
                onClick={() => setBooking({ ...booking, time })}
                className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                  booking.time === time
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
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

function BarberStep({ barbers, booking, setBooking }) {
  if (barbers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay barberos disponibles en este negocio.
      </div>
    )
  }
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Elige tu barbero</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => setBooking({ ...booking, barberId: barber.id })}
            className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
              booking.barberId === barber.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            {barber.imageUrl ? (
              <img
                src={barber.imageUrl}
                alt={barber.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{barber.name}</p>
              {barber.bio && (
                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{barber.bio}</p>
              )}
            </div>
            {booking.barberId === barber.id && (
              <Check className="w-4 h-4 text-gray-900 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function PaymentStep({ booking, setBooking }) {
  const methods = [
    { id: 'cash', label: 'Efectivo', emoji: '💵', desc: 'Paga en la barbería' },
    { id: 'transfer', label: 'Transferencia', emoji: '💳', desc: 'Transferencia bancaria' },
  ]
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Método de pago</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => setBooking({ ...booking, paymentMethod: m.id })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              booking.paymentMethod === m.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{m.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
              </div>
              {booking.paymentMethod === m.id && (
                <Check className="w-4 h-4 text-gray-900" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function LocationStep({ booking, setBooking }) {
  const locations = [
    { id: 'barbershop', label: 'En la Barbería', emoji: '🏪', desc: 'Visita el local' },
    { id: 'home', label: 'A Domicilio', emoji: '🏠', desc: 'El barbero va a tu hogar' },
  ]
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">¿Dónde prefieres el servicio?</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {locations.map((l) => (
          <button
            key={l.id}
            onClick={() => setBooking({ ...booking, locationType: l.id })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              booking.locationType === l.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{l.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{l.label}</p>
                  <p className="text-xs text-gray-500">{l.desc}</p>
                </div>
              </div>
              {booking.locationType === l.id && (
                <Check className="w-4 h-4 text-gray-900" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PublicBooking
