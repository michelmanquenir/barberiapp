import { supabase } from './supabase'

const BUCKET = 'documents'
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/**
 * Sube (o reemplaza) el documento de identidad (DNI) de un usuario.
 * - Acepta imágenes (JPEG, PNG, WebP) y PDF.
 * - Si `oldUrl` está presente, borra el archivo anterior del bucket.
 * - Devuelve la URL pública del nuevo documento.
 *
 * @param {File}   file     Archivo seleccionado por el usuario
 * @param {string} userId   ID del usuario
 * @param {string} [oldUrl] URL pública anterior (para borrarla)
 * @returns {Promise<string>} URL pública del documento subido
 */
export async function uploadDni(file, userId, oldUrl) {
  // Validar tipo de archivo
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Solo se aceptan imágenes (JPEG, PNG, WebP) o PDF')
  }

  // Validar tamaño
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`El archivo no puede superar los ${MAX_SIZE_MB} MB`)
  }

  // Borrar documento anterior si existe
  if (oldUrl) {
    const oldPath = extractStoragePath(oldUrl)
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath])
    }
  }

  // Ruta única dentro del bucket
  const ext = file.name.split('.').pop()
  const path = `${userId}/dni-${Date.now()}.${ext}`

  // Subir archivo
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  // Obtener URL pública
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Extrae el path relativo dentro del bucket a partir de la URL pública.
 * Ej: https://xxx.supabase.co/storage/v1/object/public/documents/uuid/dni-123.pdf
 *     → "uuid/dni-123.pdf"
 */
function extractStoragePath(publicUrl) {
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return null
    return publicUrl.slice(idx + marker.length)
  } catch {
    return null
  }
}
