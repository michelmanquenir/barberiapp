import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Images, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

function PublicGallery() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [shop, setShop]         = useState(null)
  const [gallery, setGallery]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    api.getShopBySlug(slug)
      .then(async (shopData) => {
        setShop(shopData)
        const galleryData = await api.getShopGallery(shopData.id).catch(() => [])
        setGallery(galleryData || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const handleBack = () => {
    if (window.history.length > 1) window.close()
    navigate(`/book/${slug}`)
  }

  const moveLightbox = (dir) => {
    setLightboxIndex(i => (i + dir + gallery.length) % gallery.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-3.5 px-6 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-gray-50 text-base leading-tight">Galería</h1>
            {shop?.name && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {shop.name} · {gallery.length} foto{gallery.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {gallery.length === 0 ? (
          <div className="text-center py-24">
            <Images className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">No hay fotos en la galería</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-2">
            {gallery.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(idx)}
                className="break-inside-avoid w-full mb-2 overflow-hidden rounded-xl block hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || ''}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightboxIndex(null) }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {gallery.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); moveLightbox(-1) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); moveLightbox(1) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={gallery[lightboxIndex].imageUrl}
              alt={gallery[lightboxIndex].caption || ''}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {gallery[lightboxIndex].caption && (
              <p className="text-center text-white/70 text-sm mt-3">{gallery[lightboxIndex].caption}</p>
            )}
            <p className="text-center text-white/40 text-xs mt-1.5">
              {lightboxIndex + 1} / {gallery.length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PublicGallery
