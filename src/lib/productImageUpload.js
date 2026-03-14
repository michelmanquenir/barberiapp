import { supabase } from './supabase'

const BUCKET  = 'products'
const MAX_SIDE = 1200   // px máximos por lado
const QUALITY  = 0.88   // calidad JPEG

/**
 * Comprime un archivo de imagen usando el Canvas del navegador.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (file.size < 200 * 1024) { resolve(file); return }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Error al comprimir')) },
        'image/jpeg',
        QUALITY,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('No se pudo leer la imagen')) }
    img.src = objectUrl
  })
}

/**
 * Comprime y sube una imagen de producto al bucket "products" en Supabase Storage.
 * Devuelve la URL pública de la imagen subida.
 *
 * @param {File}   file    Archivo de imagen
 * @param {string} shopId  ID de la barbería (para organizar carpetas)
 * @returns {Promise<string>} URL pública
 */
export async function uploadProductImage(file, shopId) {
  if (!file.type.startsWith('image/')) throw new Error('Solo se permiten imágenes')
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen no puede superar 10 MB')

  const compressed = await compressImage(file)
  const path = `${shopId}/product-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Elimina una imagen de producto del bucket dado su URL pública.
 * @param {string} publicUrl
 */
export async function deleteProductImageFromStorage(publicUrl) {
  try {
    const marker = `/object/public/${BUCKET}/`
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return
    const path = publicUrl.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([path])
  } catch { /* no crítico */ }
}
