import { supabase } from './supabase'

const BUCKET = 'transfers'
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * Sube un comprobante de transferencia (imagen o PDF) al bucket "transfers".
 * Devuelve la URL pública del archivo subido.
 */
export async function uploadTransferProof(file, shopId) {
  const isImage = file.type.startsWith('image/')
  const isPdf   = file.type === 'application/pdf'
  if (!isImage && !isPdf) throw new Error('Solo se permiten imágenes (JPG, PNG, WEBP) o PDF')
  if (file.size > MAX_SIZE) throw new Error('El archivo no puede superar 20 MB')

  const ext  = file.name.split('.').pop().toLowerCase() || (isPdf ? 'pdf' : 'jpg')
  const path = `${shopId}/proof-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
