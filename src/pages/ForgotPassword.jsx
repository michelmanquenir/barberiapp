import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, Mail, KeyRound, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'

// ── Pasos ────────────────────────────────────────────────────────────────────
// 1. Ingresar email  →  2. Ingresar código + nueva contraseña  →  3. Éxito

function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // Paso 1
  const [email, setEmail]       = useState('')
  const [sending, setSending]   = useState(false)
  const [sendError, setSendError] = useState('')

  // Paso 2
  const [code, setCode]               = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [resetting, setResetting]     = useState(false)
  const [resetError, setResetError]   = useState('')

  // ── Paso 1: enviar código ────────────────────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault()
    setSendError('')
    setSending(true)
    try {
      await api.forgotPassword(email.trim().toLowerCase())
      setStep(2)
    } catch (err) {
      setSendError(err?.message || 'No se pudo enviar el código. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  // ── Paso 2: cambiar contraseña ───────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault()
    setResetError('')

    if (newPassword.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Las contraseñas no coinciden')
      return
    }

    setResetting(true)
    try {
      await api.resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), newPassword })
      setStep(3)
    } catch (err) {
      setResetError(err?.message || 'Código incorrecto o expirado. Verifica e intenta de nuevo.')
    } finally {
      setResetting(false)
    }
  }

  // ── Layout compartido ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">WeServ</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {step === 1 && 'Recupera tu contraseña'}
            {step === 2 && 'Ingresa el código recibido'}
            {step === 3 && '¡Contraseña actualizada!'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 transition-colors">

          {/* ── Paso 1: email ─────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Ingresa tu correo registrado y te enviaremos un código de 6 dígitos para restablecer tu contraseña.
                </p>
              </div>

              {sendError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                  {sendError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition dark:bg-gray-800"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {sending ? 'Enviando código...' : 'Enviar código'}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50 transition font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}

          {/* ── Paso 2: código + nueva contraseña ─────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-100 dark:border-green-900">
                <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p className="font-medium">Código enviado a:</p>
                  <p className="font-mono mt-0.5">{email}</p>
                  <p className="text-xs mt-1 text-green-600 dark:text-green-400">Revisa tu bandeja de entrada. El código expira en 15 minutos.</p>
                </div>
              </div>

              {resetError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3">
                  {resetError}
                </div>
              )}

              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Código de verificación
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition dark:bg-gray-800 font-mono text-center text-xl tracking-widest"
                />
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition dark:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition dark:bg-gray-800"
                />
              </div>

              <button
                type="submit"
                disabled={resetting || code.length < 6}
                className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {resetting ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep(1); setSendError(''); setCode(''); setNewPassword(''); setConfirmPassword('') }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cambiar email
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition font-medium disabled:opacity-50"
                >
                  {sending ? 'Reenviando...' : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}

          {/* ── Paso 3: éxito ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="text-center space-y-5">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
                  ¡Contraseña actualizada!
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
