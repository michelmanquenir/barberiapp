import { supabase } from './supabase'

const BUCKET = 'gallery'

// ─── Compresión de imagen via Canvas ──────────────────────────────────────────
// Reduce el peso del archivo manteniendo buena calidad visual.
// - Redimensiona si supera MAX_SIDE píxeles en cualquier dimensión.
// - Exporta como JPEG a QUALITY (0-1). Los PNG con transparencia se convierten a JPEG.
// - Si el archivo original ya es pequeño (<200 KB), lo sube directo sin recomprimir.

const MAX_SIDE = 1920   // px máximos por lado
const QUALITY  = 0.88   // calidad JPEG (0.88 = excelente relación calidad/peso)

/**
 * Comprime un archivo de imagen usando el Canvas del navegador.
 * @param {File} file
 * @returns {Promise<Blob>} Blob comprimido
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    // Si es muy pequeño, no tiene sentido recomprimir
    if (file.size < 200 * 1024) {
      resolve(file)
      return
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Escalar manteniendo proporción si supera el máximo
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      // Fondo blanco para PNGs con transparencia
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Error al comprimir la imagen'))
        },
        'image/jpeg',
        QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen'))
    }

    img.src = objectUrl
  })
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Comprime y sube una imagen al bucket de galería en Supabase Storage.
 * Devuelve la URL pública de la imagen subida.
 *
 * @param {File}   file      Archivo de imagen seleccionado por el usuario
 * @param {string} userId    ID del usuario (para organizar carpetas)
 * @returns {Promise<string>} URL pública
 */
export async function uploadGalleryImage(file, userId) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes')
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('La imagen no puede superar 20 MB')
  }

  // Comprimir antes de subir
  const compressed = await compressImage(file)

  const path = `${userId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Comprime y sube una foto del negocio al bucket de galería en Supabase Storage.
 * Usa la carpeta shops/{shopId}/ para separar imágenes de negocios de las de barberos.
 *
 * @param {File}   file    Archivo de imagen seleccionado por el usuario
 * @param {string} shopId  ID del negocio
 * @returns {Promise<string>} URL pública
 */
export async function uploadShopGalleryImage(file, shopId) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes')
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('La imagen no puede superar 20 MB')
  }

  const compressed = await compressImage(file)

  const path = `shops/${shopId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Elimina una imagen del bucket de galería dado su URL pública.
 * @param {string} publicUrl URL pública de la imagen
 */
export async function deleteGalleryImageFromStorage(publicUrl) {
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return
    const path = publicUrl.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // no crítico si falla el borrado del storage
  }
}
