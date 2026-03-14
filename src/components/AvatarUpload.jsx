import { useRef, useState } from 'react'
import { Camera, Loader2, User } from 'lucide-react'
import { uploadAvatar } from '../lib/avatarUpload'

/**
 * AvatarUpload — componente reutilizable para subir/reemplazar imagen de perfil.
 *
 * Props:
 *   currentUrl   {string}               URL actual del avatar (opcional)
 *   userId       {string}               ID del usuario (para nombrar el archivo en Storage)
 *   onUploaded   {(url: string) => void} Callback con la nueva URL pública
 *   size         {'sm'|'md'|'lg'}       Tamaño del círculo (default 'lg')
 *   name         {string}               Nombre para mostrar en el fallback (inicial)
 */
export default function AvatarUpload({
  currentUrl,
  userId,
  onUploaded,
  size = 'lg',
  name = '',
}) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const sizes = {
    sm: 'w-16 h-16 text-xl',
    md: 'w-24 h-24 text-3xl',
    lg: 'w-32 h-32 text-4xl',
  }

  const camSizes = {
    sm: 'w-5 h-5 bottom-0 right-0 p-1',
    md: 'w-6 h-6 bottom-1 right-1 p-1',
    lg: 'w-8 h-8 bottom-1 right-1 p-1.5',
  }

  const initial = name?.trim()?.[0]?.toUpperCase() || ''

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validaciones básicas
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB')
      return
    }

    setError(null)

    // Preview local inmediato
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    try {
      setUploading(true)
      const publicUrl = await uploadAvatar(file, userId, currentUrl)
      onUploaded(publicUrl)
    } catch (err) {
      setError('Error al subir la imagen. Intenta de nuevo.')
      setPreview(currentUrl || null)
    } finally {
      setUploading(false)
      // Limpiar input para permitir re-subir el mismo archivo
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Círculo del avatar */}
      <div className="relative group cursor-pointer" onClick={() => !uploading && inputRef.current?.click()}>
        <div
          className={`${sizes[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-md transition-colors`}
        >
          {preview ? (
            <img
              src={preview}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-bold text-gray-500 dark:text-gray-400 select-none">
              {initial || <User className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />}
            </span>
          )}

          {/* Overlay oscuro al hover */}
          {!uploading && (
            <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Botón cámara */}
        <button
          type="button"
          disabled={uploading}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          className={`absolute ${camSizes[size]} bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-700 transition disabled:opacity-50`}
        >
          {uploading
            ? <Loader2 className="w-full h-full animate-spin" />
            : <Camera className="w-full h-full" />
          }
        </button>
      </div>

      {/* Texto de ayuda */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {uploading ? 'Subiendo imagen...' : 'Haz clic para cambiar foto'}
      </p>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
