import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { ScanLine, X, CameraOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// ── Beep compartido ───────────────────────────────────────────────────────────
const _beepAudio = new Audio('/sounds/beep.wav')
_beepAudio.preload = 'auto'

/**
 * Llama esto durante un gesto del usuario (ej. click al abrir el scanner).
 * iOS/Safari bloquea audio.play() en callbacks asíncronos hasta que el
 * AudioContext haya sido "desbloqueado" con un play() dentro de un evento
 * de usuario. Al hacer play+pause durante el click, el primer escaneo
 * ya tiene el audio desbloqueado.
 */
export function primeBeepAudio() {
  try {
    _beepAudio.currentTime = 0
    _beepAudio.play().then(() => {
      _beepAudio.pause()
      _beepAudio.currentTime = 0
    }).catch(() => {})
  } catch (_) {}
}

function playBeep() {
  try { _beepAudio.currentTime = 0; _beepAudio.play().catch(() => {}) } catch (_) {}
}

/**
 * Modal de escáner de código de barras con cámara trasera.
 * Funciona en iOS Safari y Android Chrome.
 *
 * Props:
 *   onDetected(code: string)  — llamado al detectar un código
 *   onClose()                 — llamado al pulsar "X" o "Volver"
 *   beep?                     — si debe sonar al detectar (default: true)
 *   feedback?                 — { type: 'success'|'error', message: string } | null
 *                               Muestra un banner en la parte inferior del visor
 *   processing?               — boolean, muestra spinner mientras se busca el producto
 */
function BarcodeScanner({ onDetected, onClose, beep = true, feedback = null, processing = false }) {
  const videoRef      = useRef(null)
  const readerRef     = useRef(null)
  const lastCodeRef   = useRef(null)
  const onDetectedRef = useRef(onDetected)
  const beepRef       = useRef(beep)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Mantener refs actualizadas sin reiniciar la cámara
  useEffect(() => { onDetectedRef.current = onDetected }, [onDetected])
  useEffect(() => { beepRef.current = beep }, [beep])

  // Iniciar cámara UNA SOLA VEZ al montar — no depende de props
  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    let stopped = false

    // Timeout de seguridad: si la cámara no arranca en 10s, mostrar error
    const timeout = setTimeout(() => {
      if (!stopped && !ready) {
        setInitializing(false)
        setError('La cámara tardó demasiado en responder. Intenta cerrar y volver a abrir el escáner.')
      }
    }, 10000)

    // En iOS Safari, primero pedir acceso explícito al stream para evitar
    // pantalla negra si el usuario demora en aceptar el permiso.
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    }).then((stream) => {
      if (stopped) { stream.getTracks().forEach(t => t.stop()); return }

      // Asignar stream al video manualmente para que iOS lo muestre de inmediato
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      // Ahora iniciar el decoder sobre el video que ya está corriendo
      reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        (result, err) => {
          if (stopped) return
          if (!ready) { setReady(true); setInitializing(false); clearTimeout(timeout) }
          if (result) {
            const text = result.getText()
            if (text === lastCodeRef.current) return
            lastCodeRef.current = text
            setTimeout(() => { lastCodeRef.current = null }, 1500)
            if (beepRef.current) playBeep()
            onDetectedRef.current(text)
          }
          if (err && !(err instanceof NotFoundException)) {
            // Errores de decode son normales — ignorar
          }
        }
      ).then(() => {
        if (!stopped) { setReady(true); setInitializing(false); clearTimeout(timeout) }
      }).catch(() => {
        if (!stopped) {
          setInitializing(false)
          clearTimeout(timeout)
          setError('No se pudo iniciar el escáner. Intenta cerrar y volver a abrir.')
        }
      })
    }).catch(() => {
      if (!stopped) {
        setInitializing(false)
        clearTimeout(timeout)
        setError('No se pudo acceder a la cámara. Verifica los permisos en Ajustes > Safari > Cámara.')
      }
    })

    return () => {
      stopped = true
      clearTimeout(timeout)
      try { reader.reset() } catch (_) {}
      // Detener todos los tracks de la cámara explícitamente (iOS necesita esto)
      try {
        const stream = videoRef.current?.srcObject
        if (stream) {
          stream.getTracks().forEach(t => t.stop())
          videoRef.current.srcObject = null
        }
      } catch (_) {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-top">
        <div className="flex items-center gap-2 text-white">
          <ScanLine className="w-5 h-5 text-green-400" />
          <span className="font-semibold">Escanear productos</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition text-sm font-medium"
        >
          <X className="w-4 h-4" />
          Cerrar
        </button>
      </div>

      {/* Cámara */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {error ? (
          <div className="text-center px-6">
            <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white text-sm mb-1">{error}</p>
            <p className="text-white/50 text-xs mb-4">Si estás en iPhone, ve a Ajustes → Safari → Cámara y asegúrate de que esté permitido.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-medium"
            >
              Volver
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ WebkitTransform: 'translateZ(0)' }}
              autoPlay
              playsInline
              muted
            />

            {/* Indicador de carga mientras la cámara inicializa */}
            {initializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10">
                <Loader2 className="w-10 h-10 text-green-400 animate-spin mb-3" />
                <p className="text-white text-sm font-medium">Iniciando cámara…</p>
                <p className="text-white/50 text-xs mt-1">Acepta el permiso si tu navegador lo solicita</p>
              </div>
            )}

            {/* Visor de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-44">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                {ready && (
                  <div className="absolute top-0 left-2 right-2 h-0.5 bg-green-400 animate-scan-line" />
                )}
              </div>
            </div>
            {/* Banner de feedback (éxito / error / procesando) */}
            <div className="absolute bottom-8 left-4 right-4 flex flex-col items-center gap-2 pointer-events-none">
              {processing && !feedback && (
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 text-white animate-spin flex-shrink-0" />
                  <span className="text-white text-sm font-medium">Buscando producto…</span>
                </div>
              )}
              {feedback && feedback.type === 'success' && (
                <div className="flex items-center gap-2 bg-green-500/90 backdrop-blur-sm rounded-xl px-4 py-2.5 w-full max-w-xs">
                  <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                  <span className="text-white text-sm font-semibold truncate">{feedback.message}</span>
                </div>
              )}
              {feedback && feedback.type === 'error' && (
                <div className="flex items-center gap-2 bg-red-500/90 backdrop-blur-sm rounded-xl px-4 py-2.5 w-full max-w-xs">
                  <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
                  <span className="text-white text-sm font-medium truncate">{feedback.message}</span>
                </div>
              )}
              {!initializing && !processing && !feedback && (
                <p className="text-white/60 text-sm">Apunta al código de barras</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BarcodeScanner
