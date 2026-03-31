import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import StarRating from './StarRating'

/**
 * Modal para dejar una reseña.
 *
 * Props:
 *   isOpen      {boolean}
 *   onClose     {function}
 *   onSubmit    {function}  async (rating, comment) → debe lanzar error si falla
 *   targetName  {string}    nombre del objetivo (barbero, barbería, cliente)
 *   targetType  {string}    'barber' | 'shop' | 'client' (para el mensaje)
 */
function ReviewModal({ isOpen, onClose, onSubmit, targetName, targetType = 'barber' }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  if (!isOpen) return null

  const typeLabel = {
    barber: 'al profesional',
    shop: 'el negocio',
    client: 'al cliente',
  }[targetType] ?? 'el servicio'

  const handleClose = () => {
    // Reset state
    setRating(0)
    setComment('')
    setError(null)
    setDone(false)
    setLoading(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Selecciona al menos 1 estrella')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onSubmit(rating, comment.trim() || null)
      setDone(true)
    } catch (err) {
      setError(err.message ?? 'Error al enviar la reseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200 transition-colors">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {done ? (
          /* ── Estado de éxito ── */
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">¡Reseña enviada!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Gracias por evaluar {typeLabel}.
            </p>
            <button
              onClick={handleClose}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition"
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* ── Formulario ── */
          <>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-0.5">Calificar {typeLabel}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              <span className="font-medium text-gray-700 dark:text-gray-200">{targetName}</span>
            </p>

            {/* Estrellas */}
            <div className="flex flex-col items-center gap-2 mb-5">
              <StarRating value={rating} onChange={setRating} size="lg" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {rating === 0 ? 'Selecciona una calificación' : ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}
              </p>
            </div>

            {/* Comentario */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                Comentario <span className="text-gray-500 dark:text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 300))}
                placeholder="Cuéntanos tu experiencia..."
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-0.5">{comment.length}/300</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || loading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar reseña'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ReviewModal
