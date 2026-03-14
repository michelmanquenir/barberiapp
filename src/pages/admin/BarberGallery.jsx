import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FolderPlus,
  Folder,
  FolderOpen,
  ImagePlus,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  Images,
  ChevronRight,
  ChevronLeft,
  Upload,
  ZoomIn,
  Store,
  Globe,
  EyeOff,
  Eye,
} from 'lucide-react'
import AdminNavbar from '../../components/AdminNavbar'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { uploadGalleryImage, deleteGalleryImageFromStorage } from '../../lib/galleryUpload'
import { toast, confirmDanger } from '../../lib/swal'

// ─── Constantes ──────────────────────────────────────────────────────────────

const EMPTY_GALLERY_FORM = { name: '', description: '', shopId: '', hidden: false }

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BarberGallery() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  // Mis barberías (para el selector de asociación)
  const [myShops, setMyShops] = useState([])

  // Galerías
  const [galleries,        setGalleries]        = useState([])
  const [loadingGalleries, setLoadingGalleries] = useState(true)

  // Galería abierta
  const [selectedGallery, setSelectedGallery] = useState(null)
  const [galleryImages,   setGalleryImages]   = useState([])
  const [loadingImages,   setLoadingImages]   = useState(false)

  // Formulario nueva galería
  const [showCreateForm,  setShowCreateForm]  = useState(false)
  const [createForm,      setCreateForm]      = useState(EMPTY_GALLERY_FORM)
  const [creatingGallery, setCreatingGallery] = useState(false)
  const [createError,     setCreateError]     = useState(null)

  // Edición inline
  const [editingGalleryId, setEditingGalleryId] = useState(null)
  const [editForm,         setEditForm]         = useState(EMPTY_GALLERY_FORM)
  const [savingEdit,       setSavingEdit]       = useState(false)

  // Upload
  const [uploadingImage,  setUploadingImage]  = useState(false)
  const [uploadProgress,  setUploadProgress]  = useState('')
  const [uploadError,     setUploadError]     = useState(null)
  const [uploadCaption,   setUploadCaption]   = useState('')
  const fileInputRef = useRef(null)

  // Carrusel
  const [carousel, setCarousel] = useState(null)

  // ── Datos iniciales ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoadingGalleries(true)
    try {
      const [galleriesData, shopsData] = await Promise.all([
        api.getMyGalleries(),
        api.getMyShops().catch(() => []),
      ])
      setGalleries(galleriesData)
      setMyShops(shopsData)
    } catch {
      /* silencioso */
    } finally {
      setLoadingGalleries(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Abrir galería ──────────────────────────────────────────────────────────

  const openGallery = async (gallery) => {
    setSelectedGallery(gallery)
    setGalleryImages([])
    setUploadError(null)
    setUploadCaption('')
    setLoadingImages(true)
    try {
      const data = await api.getMyGallery(gallery.id)
      setGalleryImages(data.images ?? [])
    } catch {
      setGalleryImages([])
    } finally {
      setLoadingImages(false)
    }
  }

  // ── Crear galería ──────────────────────────────────────────────────────────

  const handleCreateGallery = async (e) => {
    e.preventDefault()
    if (!createForm.name.trim()) return
    setCreatingGallery(true)
    setCreateError(null)
    const shop = myShops.find((s) => s.id === createForm.shopId)
    try {
      const created = await api.createGallery({
        name:        createForm.name.trim(),
        description: createForm.description.trim() || null,
        shopId:      createForm.shopId || null,
        shopName:    shop?.name || null,
        hidden:      createForm.hidden,
      })
      setGalleries((prev) => [created, ...prev])
      setCreateForm(EMPTY_GALLERY_FORM)
      setShowCreateForm(false)
    } catch {
      setCreateError('Error al crear la galería')
    } finally {
      setCreatingGallery(false)
    }
  }

  // ── Editar ─────────────────────────────────────────────────────────────────

  const startEdit = (gallery) => {
    setEditingGalleryId(gallery.id)
    setEditForm({
      name:        gallery.name,
      description: gallery.description ?? '',
      shopId:      gallery.shopId ?? '',
      hidden:      gallery.hidden ?? false,
    })
  }

  const cancelEdit = () => {
    setEditingGalleryId(null)
    setEditForm(EMPTY_GALLERY_FORM)
  }

  const saveEdit = async (galleryId) => {
    if (!editForm.name.trim()) return
    setSavingEdit(true)
    const shop = myShops.find((s) => s.id === editForm.shopId)
    try {
      const updated = await api.updateGallery(galleryId, {
        name:        editForm.name.trim(),
        description: editForm.description.trim() || null,
        shopId:      editForm.shopId || null,
        shopName:    shop?.name || null,
        hidden:      editForm.hidden,
      })
      setGalleries((prev) => prev.map((g) => (g.id === galleryId ? { ...g, ...updated } : g)))
      if (selectedGallery?.id === galleryId)
        setSelectedGallery((prev) => ({ ...prev, ...updated }))
      setEditingGalleryId(null)
    } catch { /* silencioso */ } finally {
      setSavingEdit(false)
    }
  }

  // ── Eliminar galería ───────────────────────────────────────────────────────

  const deleteGallery = async (galleryId) => {
    if (!(await confirmDanger('Eliminar galería', '¿Eliminar esta galería y todas sus imágenes? Esta acción no se puede deshacer.'))) return
    try {
      await api.deleteGallery(galleryId)
      setGalleries((prev) => prev.filter((g) => g.id !== galleryId))
      if (selectedGallery?.id === galleryId) setSelectedGallery(null)
    } catch { toast.error('Error al eliminar la galería') }
  }

  // ── Toggle visibilidad rápido ──────────────────────────────────────────────

  const toggleHidden = async (gallery) => {
    try {
      const updated = await api.updateGallery(gallery.id, { hidden: !gallery.hidden })
      setGalleries((prev) => prev.map((g) => (g.id === gallery.id ? { ...g, ...updated } : g)))
    } catch { /* silencioso */ }
  }

  // ── Subir imagen ───────────────────────────────────────────────────────────

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedGallery) return
    setUploadError(null)
    setUploadingImage(true)
    setUploadProgress('Comprimiendo imagen…')
    try {
      const url = await uploadGalleryImage(file, user.userId)
      setUploadProgress('Guardando…')
      const imgDto = await api.addGalleryImage(selectedGallery.id, {
        imageUrl: url,
        caption:  uploadCaption.trim() || null,
      })
      setGalleryImages((prev) => [imgDto, ...prev])
      setUploadCaption('')
      setGalleries((prev) =>
        prev.map((g) =>
          g.id === selectedGallery.id
            ? { ...g, imageCount: (g.imageCount ?? 0) + 1, coverUrl: g.coverUrl ?? url }
            : g,
        ),
      )
    } catch (err) {
      setUploadError(err.message ?? 'Error al subir la imagen')
    } finally {
      setUploadingImage(false)
      setUploadProgress('')
      e.target.value = ''
    }
  }

  // ── Eliminar imagen ────────────────────────────────────────────────────────

  const deleteImage = async (image) => {
    if (!(await confirmDanger('Eliminar imagen', '¿Eliminar esta imagen? Esta acción no se puede deshacer.'))) return
    try {
      await api.deleteGalleryImage(selectedGallery.id, image.id)
      deleteGalleryImageFromStorage(image.imageUrl)
      setGalleryImages((prev) => prev.filter((i) => i.id !== image.id))
      setGalleries((prev) =>
        prev.map((g) =>
          g.id === selectedGallery.id
            ? { ...g, imageCount: Math.max(0, (g.imageCount ?? 1) - 1) }
            : g,
        ),
      )
      if (carousel !== null) {
        const newImages = galleryImages.filter((i) => i.id !== image.id)
        if (newImages.length === 0) setCarousel(null)
        else setCarousel((c) => ({ index: Math.min(c.index, newImages.length - 1) }))
      }
    } catch { toast.error('Error al eliminar la imagen') }
  }

  // ── Carrusel ───────────────────────────────────────────────────────────────

  const openCarousel  = (index) => setCarousel({ index })
  const carouselPrev  = () => setCarousel((c) => ({ index: (c.index - 1 + galleryImages.length) % galleryImages.length }))
  const carouselNext  = () => setCarousel((c) => ({ index: (c.index + 1) % galleryImages.length }))

  useEffect(() => {
    if (carousel === null) return
    const h = (e) => {
      if (e.key === 'ArrowLeft')  carouselPrev()
      if (e.key === 'ArrowRight') carouselNext()
      if (e.key === 'Escape')     setCarousel(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [carousel, galleryImages.length])

  // ─── Render ───────────────────────────────────────────────────────────────

  const currentImg = carousel !== null ? galleryImages[carousel.index] : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => selectedGallery ? setSelectedGallery(null) : navigate('/admin')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {selectedGallery ? selectedGallery.name : 'Mi Portafolio'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedGallery
                  ? `${galleryImages.length} imagen${galleryImages.length !== 1 ? 'es' : ''}`
                  : 'Gestiona tus galerías de trabajos'}
              </p>
            </div>
          </div>

          {/* ══ Lista de galerías ═══════════════════════════════════════════════ */}
          {!selectedGallery && (
            <>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mb-6 flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition"
                >
                  <FolderPlus className="w-4 h-4" />
                  Nueva galería
                </button>
              )}

              {showCreateForm && (
                <form
                  onSubmit={handleCreateGallery}
                  className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Nueva galería</h3>

                  <input
                    autoFocus required
                    placeholder="Nombre (ej: Degradados, Barba, Afro…)"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-200"
                  />
                  <textarea
                    placeholder="Descripción opcional"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-200 resize-none"
                  />

                  {/* Selector de barbería */}
                  <GalleryShopSelector
                    shops={myShops}
                    value={createForm.shopId}
                    onChange={(v) => setCreateForm((f) => ({ ...f, shopId: v }))}
                  />

                  {/* Toggle ocultar */}
                  <GalleryHiddenToggle
                    value={createForm.hidden}
                    onChange={(v) => setCreateForm((f) => ({ ...f, hidden: v }))}
                  />

                  {createError && <p className="text-xs text-red-500">{createError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={creatingGallery}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:opacity-50">
                      {creatingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Crear
                    </button>
                    <button type="button"
                      onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_GALLERY_FORM) }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                  </div>
                </form>
              )}

              {loadingGalleries && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}

              {!loadingGalleries && galleries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                    <Images className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">Sin galerías aún</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Crea tu primera galería para mostrar tu trabajo</p>
                </div>
              )}

              {!loadingGalleries && galleries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleries.map((gallery) => (
                    <GalleryCard
                      key={gallery.id}
                      gallery={gallery}
                      shops={myShops}
                      editing={editingGalleryId === gallery.id}
                      editForm={editForm}
                      savingEdit={savingEdit}
                      onOpen={() => openGallery(gallery)}
                      onStartEdit={() => startEdit(gallery)}
                      onCancelEdit={cancelEdit}
                      onSaveEdit={() => saveEdit(gallery.id)}
                      onDelete={() => deleteGallery(gallery.id)}
                      onToggleHidden={() => toggleHidden(gallery)}
                      onEditFormChange={setEditForm}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ Imágenes de la galería ══════════════════════════════════════════ */}
          {selectedGallery && (
            <>
              {/* Zona de subida */}
              <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Subir imagen</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    compresión automática
                  </span>
                  {/* Indicadores de la galería actual */}
                  {selectedGallery.shopName && (
                    <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Store className="w-3 h-3" />{selectedGallery.shopName}
                    </span>
                  )}
                  {selectedGallery.hidden && (
                    <span className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="w-3 h-3" />Oculta
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    placeholder="Pie de foto (opcional)"
                    value={uploadCaption}
                    onChange={(e) => setUploadCaption(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-200"
                  />
                  <button
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingImage ? uploadProgress || 'Procesando…' : 'Subir foto'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
                {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
              </div>

              {loadingImages && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}

              {!loadingImages && galleryImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                    <ImagePlus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">Sin fotos aún</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Sube tu primera foto a esta galería</p>
                </div>
              )}

              {!loadingImages && galleryImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {galleryImages.map((img, idx) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      onDelete={() => deleteImage(img)}
                      onOpen={() => openCarousel(idx)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ══ Carrusel ════════════════════════════════════════════════════════════ */}
      {carousel !== null && currentImg && (
        <Carousel
          images={galleryImages}
          index={carousel.index}
          onClose={() => setCarousel(null)}
          onPrev={carouselPrev}
          onNext={carouselNext}
          onSelect={(i) => setCarousel({ index: i })}
          onDelete={() => deleteImage(currentImg)}
        />
      )}
    </div>
  )
}

// ─── Sub-componente: selector de barbería ────────────────────────────────────

function GalleryShopSelector({ shops, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Asociar a barbería</label>
      <div className="flex flex-wrap gap-2">
        {/* Opción General */}
        <button
          type="button"
          onClick={() => onChange('')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            value === ''
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          General
        </button>

        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            onClick={() => onChange(shop.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              value === shop.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            {shop.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-componente: toggle de visibilidad ────────────────────────────────────

function GalleryHiddenToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition w-full ${
        value
          ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
      }`}
    >
      {value
        ? <><EyeOff className="w-4 h-4" /> Oculta — los clientes no pueden verla</>
        : <><Eye className="w-4 h-4" /> Visible — los clientes pueden verla</>
      }
    </button>
  )
}

// ─── Componente: tarjeta de galería ──────────────────────────────────────────

function GalleryCard({
  gallery, shops, editing, editForm, savingEdit,
  onOpen, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onToggleHidden, onEditFormChange,
}) {
  return (
    <div className={`group bg-white dark:bg-gray-900 rounded-xl border overflow-hidden hover:shadow-md transition ${
      gallery.hidden
        ? 'border-amber-200 dark:border-amber-800 opacity-80'
        : 'border-gray-200 dark:border-gray-700'
    }`}>

      {/* Portada */}
      <div className="relative h-44 bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden" onClick={onOpen}>
        {gallery.coverUrl
          ? <img src={gallery.coverUrl} alt={gallery.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              <span className="text-xs text-gray-400 dark:text-gray-500">Sin portada</span>
            </div>
          )
        }
        {/* Badges superiores */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {gallery.hidden && (
            <span className="bg-amber-500/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Oculta
            </span>
          )}
          {gallery.shopName && (
            <span className="bg-blue-600/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 max-w-[120px] truncate">
              <Store className="w-3 h-3 shrink-0" />
              <span className="truncate">{gallery.shopName}</span>
            </span>
          )}
        </div>
        <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {gallery.imageCount ?? 0} foto{gallery.imageCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        {editing ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={editForm.name}
              onChange={(e) => onEditFormChange((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-200"
            />
            <input
              value={editForm.description}
              onChange={(e) => onEditFormChange((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción"
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-200"
            />
            <GalleryShopSelector
              shops={shops}
              value={editForm.shopId}
              onChange={(v) => onEditFormChange((f) => ({ ...f, shopId: v }))}
            />
            <GalleryHiddenToggle
              value={editForm.hidden}
              onChange={(v) => onEditFormChange((f) => ({ ...f, hidden: v }))}
            />
            <div className="flex gap-2 pt-1">
              <button onClick={onSaveEdit} disabled={savingEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-xs font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:opacity-50">
                {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Guardar
              </button>
              <button onClick={onCancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                <X className="w-3 h-3" /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3
                className="font-semibold text-gray-900 dark:text-gray-50 text-sm cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1.5"
                onClick={onOpen}
              >
                <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                {gallery.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {/* Toggle rápido de visibilidad */}
                <button onClick={onToggleHidden} title={gallery.hidden ? 'Hacer visible' : 'Ocultar'}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  {gallery.hidden
                    ? <Eye className="w-3.5 h-3.5 text-amber-500 hover:text-green-500" />
                    : <EyeOff className="w-3.5 h-3.5 text-gray-400 hover:text-amber-500" />
                  }
                </button>
                <button onClick={onStartEdit} title="Editar"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" />
                </button>
                <button onClick={onDelete} title="Eliminar"
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 transition">
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </div>
            {gallery.description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 line-clamp-2">{gallery.description}</p>
            )}
            <button onClick={onOpen}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Ver fotos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Componente: tarjeta de imagen (grid) ─────────────────────────────────────

function ImageCard({ image, onDelete, onOpen }) {
  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer">
      <img
        src={image.imageUrl}
        alt={image.caption ?? 'Trabajo'}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onClick={onOpen}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" onClick={onOpen} />
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onOpen} title="Ver"
          className="p-1.5 bg-white/90 rounded-full hover:bg-white transition shadow">
          <ZoomIn className="w-3.5 h-3.5 text-gray-800" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} title="Eliminar"
          className="p-1.5 bg-white/90 rounded-full hover:bg-red-50 transition shadow">
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>
      {image.caption && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs truncate">{image.caption}</p>
        </div>
      )}
    </div>
  )
}

// ─── Componente: Carrusel ─────────────────────────────────────────────────────

function Carousel({ images, index, onClose, onPrev, onNext, onSelect, onDelete }) {
  const img      = images[index]
  const total    = images.length
  const thumbsRef = useRef(null)

  useEffect(() => {
    const container = thumbsRef.current
    if (!container) return
    const thumb = container.children[index]
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [index])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>

      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-white/70 text-sm font-medium tabular-nums">{index + 1} / {total}</span>
        <div className="flex items-center gap-2">
          <button onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
          <button onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Imagen principal */}
      <div className="flex-1 flex items-center justify-center gap-3 px-4 min-h-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={onPrev} disabled={total <= 1}
          className="shrink-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition disabled:opacity-30">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="relative flex items-center justify-center" style={{ maxWidth: '75vw', maxHeight: '65vh' }}>
          <img
            key={img.id}
            src={img.imageUrl}
            alt={img.caption ?? 'Trabajo'}
            className="rounded-xl shadow-2xl object-contain"
            style={{ maxWidth: '75vw', maxHeight: '65vh', width: 'auto', height: 'auto' }}
          />
          {img.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl px-4 py-3">
              <p className="text-white text-sm text-center">{img.caption}</p>
            </div>
          )}
        </div>

        <button onClick={onNext} disabled={total <= 1}
          className="shrink-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition disabled:opacity-30">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Miniaturas */}
      {total > 1 && (
        <div
          ref={thumbsRef}
          className="flex items-center gap-2 px-4 pb-4 pt-3 overflow-x-auto shrink-0"
          style={{ scrollbarWidth: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((im, i) => (
            <button key={im.id} onClick={() => onSelect(i)}
              className={`shrink-0 rounded-lg overflow-hidden transition-all ${
                i === index ? 'ring-2 ring-white opacity-100 scale-105' : 'opacity-50 hover:opacity-80'
              }`}
              style={{ width: 60, height: 60 }}>
              <img src={im.imageUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
