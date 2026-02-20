import { User, Mail, Phone, Calendar } from 'lucide-react'

function Profile() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi Perfil</h1>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-32 h-32 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
            <User className="h-16 w-16 text-white" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Usuario de Ejemplo
            </h2>
            <p className="text-gray-600 mb-4">
              Miembro desde Enero 2024
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="h-5 w-5 text-gray-400" />
                <span>usuario@ejemplo.com</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Phone className="h-5 w-5 text-gray-400" />
                <span>+56 9 1234 5678</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">12</div>
          <p className="text-gray-600">Citas Completadas</p>
        </div>

        <div className="card text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">3</div>
          <p className="text-gray-600">Barberos Favoritos</p>
        </div>

        <div className="card text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">$50k</div>
          <p className="text-gray-600">Total Gastado</p>
        </div>
      </div>
    </div>
  )
}

export default Profile
