import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Loader2, ZoomIn, Images } from 'lucide-react'
import { api } from '../lib/api'

function PublicGallery() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [shop, setShop]       = useState(null)
  const [gallery, setGallery] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    api.getShopBySlug(slug)
      .then(async (shopData) => {
        setShop(shopData)
        const data = await api.getShopGallery(shopData.id).catch(() => [])
        setGallery(data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const moveLightbox = useCallback((dir) => {
    setLightboxIndex(i => (i + dir + gallery.length) % gallery.length)
  }, [gallery.length])

  // Keyboard nav
  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  moveLightbox(-1)
      if (e.key === 'ArrowRight') moveLightbox(1)
      if (e.key === 'Escape')     setLightboxIndex(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, moveLightbox])

  const handleBack = () => {
    try { window.close() } catch {}
    navigate(`/book/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Cargando galería...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          <div className="flex-1 min-w-0">
            {shop?.name && (
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">
                {shop.name}
              </p>
            )}
            <h1 className="font-bold text-gray-900 dark:text-gray-50 text-lg leading-none mt-0.5">
              Galería
            </h1>
          </div>

          {gallery.length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 flex-shrink-0">
              <Images className="w-4 h-4" />
              {gallery.length}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-6">
        {gallery.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center mx-auto mb-4">
              <Images className="w-9 h-9 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-semibold text-gray-600 dark:text-gray-300">Sin fotos aún</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Este negocio todavía no subió fotos.</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
            {gallery.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(idx)}
                className="break-inside-avoid w-full mb-3 group relative overflow-hidden rounded-2xl block
                           bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl
                           transition-all duration-300 focus:outline-none
                           focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || ''}
                  className="w-full h-auto object-cover block group-hover:scale-[1.04] transition-transform duration-500"
                  loading="lazy"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md">
                      <ZoomIn className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-medium line-clamp-2 text-left leading-snug">
                        {img.caption}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-white/50 text-sm tabular-nums">
              {lightboxIndex + 1} / {gallery.length}
            </span>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image area */}
          <div
            className="flex-1 flex items-center justify-center min-h-0 relative px-14"
            onClick={() => setLightboxIndex(null)}
          >
            {gallery.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); moveLightbox(-1) }}
                  className="absolute left-3 sm:left-5 p-3 rounded-full bg-white/10 text-white hover:bg-white/25 transition z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); moveLightbox(1) }}
                  className="absolute right-3 sm:right-5 p-3 rounded-full bg-white/10 text-white hover:bg-white/25 transition z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
              <img
                src={gallery[lightboxIndex].imageUrl}
                alt={gallery[lightboxIndex].caption || ''}
                className="w-full max-h-[68vh] object-contain rounded-2xl"
              />
              {gallery[lightboxIndex].caption && (
                <p className="text-center text-white/65 text-sm mt-3 px-4">
                  {gallery[lightboxIndex].caption}
                </p>
              )}
            </div>
          </div>

          {/* Thumbnail strip */}
          {gallery.length > 1 && (
            <div
              className="flex-shrink-0 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide"
              onClick={e => e.stopPropagation()}
            >
              {gallery.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setLightboxIndex(idx)}
                  className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 ${
                    lightboxIndex === idx
                      ? 'ring-2 ring-white opacity-100 scale-110'
                      : 'opacity-35 hover:opacity-65'
                  }`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PublicGallery
