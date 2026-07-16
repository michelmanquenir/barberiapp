import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Loader2, Dumbbell,
  Calendar, Activity, Clock, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

export default function GymCheckIn() {
  const { shopId }        = useParams()
  const { isAuthenticated } = useAuth()
  const navigate           = useNavigate()

  const [phase, setPhase]   = useState('loading') // 'loading' | 'success' | 'error'
  const [data,  setData]    = useState(null)
  const [error, setError]   = useState('')
  const [time,  setTime]    = useState(fmtTime())

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=/gym-checkin/${shopId}`, { replace: true })
      return
    }

    api.selfGymCheckIn(shopId)
      .then(res => { setData(res); setTime(fmtTime()); setPhase('success') })
      .catch(err => { setError(err.message ?? 'Error al registrar ingreso'); setPhase('error') })
  }, [shopId, isAuthenticated, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900 p-4">

      {/* Loading */}
      {phase === 'loading' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-400" />
          </div>
          <p className="text-gray-400 text-sm">Registrando ingreso…</p>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && data && (
        <div className="w-full max-w-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-white font-bold text-xl leading-tight">¡Ingreso registrado!</h1>
              <p className="text-emerald-100/80 text-sm mt-1">Bienvenido/a de vuelta</p>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Nombre */}
              <div className="text-center pb-3 border-b border-gray-800">
                <p className="text-white font-semibold text-lg">{data.memberName}</p>
                <p className="text-gray-400 text-sm">{data.shopName}</p>
              </div>

              {/* Plan */}
              {data.planName && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Plan</p>
                    <p className="text-sm font-medium text-white">{data.planName}</p>
                  </div>
                </div>
              )}

              {/* Visitas */}
              {data.visitsAllowed != null && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Clases</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (data.visitsUsed / data.visitsAllowed) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white whitespace-nowrap">
                        {data.visitsUsed} / {data.visitsAllowed}
                      </span>
                    </div>
                    {data.visitsAllowed - data.visitsUsed === 1 && (
                      <p className="text-xs text-amber-400 mt-0.5">Última clase disponible</p>
                    )}
                  </div>
                </div>
              )}

              {/* Vencimiento */}
              {data.endDate && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vence</p>
                    <p className="text-sm font-medium text-white">{fmtDate(data.endDate)}</p>
                  </div>
                </div>
              )}

              {/* Hora */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Hora de ingreso</p>
                  <p className="text-sm font-medium text-white">{time} hrs</p>
                </div>
              </div>

              {/* Alerta si la membresía se agotó */}
              {data.membershipJustExpired && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Has usado todas tus clases disponibles. Contacta al administrador para renovar tu membresía.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                onClick={() => navigate('/memberships')}
                className="w-full py-2.5 text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl transition-colors"
              >
                Ver mis membresías →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="w-full max-w-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-red-700 to-red-900 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-white font-bold text-xl">No se pudo registrar</h1>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-300 text-center leading-relaxed">{error}</p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => navigate('/memberships')}
                  className="w-full py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                >
                  Ver mis membresías
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-xl transition-colors"
                >
                  Ir al inicio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
