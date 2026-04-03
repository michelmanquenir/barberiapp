import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { user, clearMustChangePassword } = useAuth()

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, newPwd: false, confirm: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await api.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      clearMustChangePassword()
      // Redirigir según el rol
      const dest = user?.role === 'SUPER_ADMIN'    ? '/super-admin/dashboard'
                 : user?.role === 'BUSINESS_OWNER' ? '/admin'
                 : '/booking'
      navigate(dest, { replace: true })
    } catch (e) {
      setError(e.message || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Icon + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cambia tu contraseña</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Tu cuenta tiene una contraseña provisional. <br />
            Debes crear una contraseña personal para continuar.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Contraseña provisional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Contraseña provisional
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show.current ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                  required
                  placeholder="Contraseña que recibiste por email"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => toggle('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={show.newPwd ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
                <button type="button" onClick={() => toggle('newPwd')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {show.newPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength hint */}
              {form.newPassword.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      form.newPassword.length >= (i + 1) * 2
                        ? form.newPassword.length >= 8 ? 'bg-green-500' : 'bg-amber-400'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  ))}
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 whitespace-nowrap">
                    {form.newPassword.length < 6 ? 'Muy corta' : form.newPassword.length < 8 ? 'Aceptable' : 'Segura'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={show.confirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  placeholder="Repite la nueva contraseña"
                  className={`w-full px-4 pr-10 py-2.5 rounded-lg border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                    form.confirmPassword && form.newPassword !== form.confirmPassword
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500'
                  }`}
                />
                <button type="button" onClick={() => toggle('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-60 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                : <><ShieldCheck className="w-4 h-4" />Establecer nueva contraseña</>
              }
            </button>

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Una vez que cambies tu contraseña, accederás a la app normalmente.
        </p>
      </div>
    </div>
  )
}
