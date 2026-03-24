import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { ScanLine, X, CameraOff } from 'lucide-react'

// ── Beep compartido ───────────────────────────────────────────────────────────
const _beepAudio = new Audio('/sounds/beep.wav')
_beepAudio.preload = 'auto'

function playBeep() {
  try { _beepAudio.currentTime = 0; _beepAudio.play().catch(() => {}) } catch (_) {}
}

/**
 * Modal de escáner de código de barras con cámara trasera.
 * Funciona en iOS Safari y Android Chrome.
 *
 * Props:
 *   onDetected(code: string) — llamado al detectar un código
 *   onClose()                — llamado al pulsar "X" o "Volver"
 *   beep?                    — si debe sonar al detectar (default: true)
 */
function BarcodeScanner({ onDetected, onClose, beep = true }) {
  const videoRef    = useRef(null)
  const readerRef   = useRef(null)
  const lastCodeRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    let stopped = false

    reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoRef.current,
      (result, err) => {
        if (stopped) return
        if (!ready) setReady(true)
        if (result) {
          const text = result.getText()
          if (text === lastCodeRef.current) return
          lastCodeRef.current = text
          setTimeout(() => { lastCodeRef.current = null }, 1500)
          if (beep) playBeep()
          onDetected(text)
        }
        if (err && !(err instanceof NotFoundException)) {
          // Errores de decode son normales — ignorar
        }
      }
    ).then(() => {
      if (!stopped) setReady(true)
    }).catch(() => {
      if (!stopped) setError('No se pudo acceder a la cámara. Verifica los permisos en tu navegador.')
    })

    return () => {
      stopped = true
      try { reader.reset() } catch (_) {}
    }
  }, [onDetected, beep, ready])

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-top">
        <div className="flex items-center gap-2 text-white">
          <ScanLine className="w-5 h-5 text-green-400" />
          <span className="font-semibold">Escanear código de barras</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cámara */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {error ? (
          <div className="text-center px-6">
            <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-white text-gray-900 rounded-xl text-sm font-medium"
            >
              Volver
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
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
            <p className="absolute bottom-10 left-0 right-0 text-center text-white/70 text-sm">
              Apunta al código de barras del producto
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default BarcodeScanner
