import { supabase } from './supabase'

const BUCKET = 'avatars'

/**
 * Sube (o reemplaza) la imagen de avatar de un usuario.
 * - Si `oldUrl` está presente, borra el archivo anterior del bucket.
 * - Devuelve la URL pública de la nueva imagen.
 *
 * @param {File}   file        Archivo seleccionado por el usuario
 * @param {string} userId      ID del usuario (para nombrar el archivo)
 * @param {string} [oldUrl]    URL pública anterior (para borrarla)
 * @returns {Promise<string>}  URL pública de la imagen subida
 */
export async function uploadAvatar(file, userId, oldUrl) {
  // 1. Borrar imagen anterior si existe
  if (oldUrl) {
    const oldPath = extractStoragePath(oldUrl)
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath])
    }
  }

  // 2. Definir ruta única en el bucket (evitar cache con timestamp)
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar-${Date.now()}.${ext}`

  // 3. Subir archivo
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  // 4. Obtener URL pública
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Extrae el path relativo dentro del bucket a partir de la URL pública.
 * Ej: https://xxx.supabase.co/storage/v1/object/public/avatars/uuid/avatar-123.jpg
 *     → "uuid/avatar-123.jpg"
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
