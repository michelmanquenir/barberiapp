import { useRef, useState } from 'react'
import { Upload, FileText, Image, X, CheckCircle, Loader2, ShieldCheck } from 'lucide-react'
import { uploadDni } from '../lib/dniUpload'

/**
 * Componente para subir el documento de identidad (DNI).
 * Acepta imágenes (JPEG, PNG, WebP) y PDF.
 *
 * Props:
 *   currentUrl  {string|null} – URL actual del documento
 *   userId      {string}      – ID del usuario
 *   onUploaded  {(url: string) => void} – callback al terminar la subida
 */
function DniUpload({ currentUrl, userId, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)   // data URL para preview de imagen
  const [isPdf, setIsPdf] = useState(() => currentUrl?.toLowerCase().includes('.pdf') ?? false)

  const isImage = (file) => file.type.startsWith('image/')

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Preview local para imágenes
    if (isImage(file)) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target.result)
      reader.readAsDataURL(file)
      setIsPdf(false)
    } else {
      // PDF — sin preview, mostramos ícono
      setPreview(null)
      setIsPdf(true)
    }

    setUploading(true)
    try {
      const url = await uploadDni(file, userId, currentUrl)
      onUploaded(url)
    } catch (err) {
      setError(err.message ?? 'Error al subir el documento')
      setPreview(null)
      setIsPdf(currentUrl?.toLowerCase().includes('.pdf') ?? false)
    } finally {
      setUploading(false)
      // Limpiar el input para permitir re-subir el mismo archivo
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const effectiveUrl = preview || currentUrl

  return (
    <div className="w-full">
      {/* Zona principal */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors
          ${uploading
            ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 cursor-wait'
            : effectiveUrl
              ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
      >
        {/* Spinner de carga */}
        {uploading && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-gray-500 dark:text-gray-400 animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Subiendo documento...</span>
          </div>
        )}

        {/* Preview imagen */}
        {!uploading && effectiveUrl && !isPdf && (
          <div className="relative w-full">
            <img
              src={effectiveUrl}
              alt="DNI"
              className="w-full max-h-48 object-contain rounded-lg"
            />
            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-0.5">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Estado PDF subido */}
        {!uploading && effectiveUrl && isPdf && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FileText className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">PDF subido correctamente</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Haz clic para reemplazar</span>
          </div>
        )}

        {/* Estado vacío */}
        {!uploading && !effectiveUrl && (
          <>
            <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Upload className="w-7 h-7 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Subir documento de identidad
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                JPEG, PNG, WebP o PDF · Máx. 10 MB
              </p>
            </div>
          </>
        )}

        {/* Botón de reemplazar (solo cuando ya hay algo cargado y no está subiendo) */}
        {!uploading && effectiveUrl && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
            className="text-xs text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Reemplazar documento
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

export default DniUpload
