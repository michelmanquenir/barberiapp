import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, Plus, Pencil, Search, X,
  ToggleLeft, ToggleRight, ShoppingBag,
  Barcode, Tag, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
  Image as ImageIcon, Loader2, ScanLine, Trash2,
} from 'lucide-react'
import SuperAdminLayout from './SuperAdminLayout'
import { api } from '../../lib/api'
import { toast, confirm } from '../../lib/swal'
import { uploadProductImage } from '../../lib/productImageUpload'
import BarcodeScanner from '../../components/BarcodeScanner'

const PAGE_SIZE = 20

// ─── Empty form ───────────────────────────────────────────────────────────────
const EMPTY = {
  name: '', description: '', category: '',
  imageUrl: '', barcode: '', sku: '', active: true,
}

// ─── Pill de estado ───────────────────────────────────────────────────────────
function StatusPill({ active }) {
  return active
    ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium">Activo</span>
    : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-medium">Inactivo</span>
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function CatalogModal({ initial, onSave, onClose, productCategories = [] }) {
  const [form, setForm] = useState(initial ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const fileRef = useRef(null)
  const isEditing = !!initial

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadProductImage(file, 'catalog')
      set('imageUrl', url)
    } catch (err) {
      toast.error(err?.message || 'Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">
              {isEditing ? 'Editar producto del catálogo' : 'Nuevo producto en el catálogo'}
            </h3>
            {isEditing && initial?.id && (
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                ID: {initial.id}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Imagen */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Imagen</label>
            <div className="flex items-center gap-3">
              <div
                onClick={() => !uploading && fileRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition overflow-hidden flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={e => set('imageUrl', e.target.value)}
                  placeholder="O pega una URL de imagen..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sube un archivo o pega una URL</p>
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Monster Energy Mango Loco 500ml"
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Bebida energética sabor mango..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
            />
          </div>

          {/* Categoría + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Categoría</label>
              {productCategories.length > 0 ? (
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 appearance-none"
                >
                  <option value="">Sin categoría</option>
                  {productCategories.flatMap(parent =>
                    parent.children && parent.children.length > 0
                      ? parent.children.map(child => (
                          <option
                            key={child.id}
                            value={`${parent.icon ? parent.icon + ' ' : ''}${child.name}`}
                          >
                            {parent.icon ? parent.icon + ' ' : ''}{child.name}
                          </option>
                        ))
                      : [<option key={parent.id} value={`${parent.icon ? parent.icon + ' ' : ''}${parent.name}`}>
                          {parent.icon ? parent.icon + ' ' : ''}{parent.name}
                        </option>]
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="Bebidas"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="MON-MGL-500"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
            </div>
          </div>

          {/* Código de barras */}
          {scannerOpen && (
            <BarcodeScanner
              onDetected={(code) => { set('barcode', code); setScannerOpen(false) }}
              onClose={() => setScannerOpen(false)}
            />
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Código de barras
              <span className="text-gray-400 ml-1">(debe ser único)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                placeholder="7501234567890"
                className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 font-mono"
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Escanear código de barras"
                className="flex-shrink-0 px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Activo toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Activo en el catálogo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Los negocios pueden vincular este producto</p>
            </div>
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className="flex-shrink-0"
            >
              {form.active
                ? <ToggleRight className="w-8 h-8 text-green-500" />
                : <ToggleLeft  className="w-8 h-8 text-gray-400" />}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear producto')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
function SuperAdminCatalog() {
  const [data, setData]               = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 })
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(0)
  const [pageBeforeSearch, setPageBeforeSearch] = useState(0)  // página a restaurar al limpiar búsqueda
  const [goToInput, setGoToInput]     = useState('')
  const [modal, setModal]             = useState(null)   // null | 'create' | { ...product }
  const [actionId, setActionId]       = useState(null)
  const [productCategories, setProductCategories] = useState([])
  const searchTimer = useRef(null)

  useEffect(() => {
    api.getProductCategories().then(setProductCategories).catch(() => setProductCategories([]))
  }, [])

  const load = async (q = search, p = page) => {
    setLoading(true)
    try {
      const result = await api.superAdmin.listGlobalProducts(q, p, PAGE_SIZE)
      setData(result)
    } catch {
      toast.error('No se pudo cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search — guarda la página actual al empezar a buscar y la restaura al limpiar
  const handleSearch = (val) => {
    const startingSearch = search === '' && val !== ''
    const clearingSearch = search !== '' && val === ''

    if (startingSearch) setPageBeforeSearch(page)

    const targetPage = clearingSearch ? pageBeforeSearch : 0
    setSearch(val)
    if (!clearingSearch) setPage(0)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (clearingSearch) setPage(pageBeforeSearch)
      load(val, targetPage)
    }, 300)
  }

  const goToPage = (p) => {
    setPage(p)
    setGoToInput('')
    load(search, p)
  }

  const handleGoToSubmit = (e) => {
    e.preventDefault()
    const n = parseInt(goToInput, 10)
    if (!isNaN(n)) {
      const clamped = Math.min(Math.max(n - 1, 0), (data.totalPages ?? 1) - 1)
      goToPage(clamped)
    }
    setGoToInput('')
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    try {
      await api.createGlobalProduct(form)
      toast.success(`"${form.name}" añadido al catálogo`)
      setModal(null)
      load(search, 0)
      setPage(0)
    } catch (err) {
      toast.error(err?.message || 'No se pudo crear el producto')
      throw err
    }
  }

  const handleEdit = async (form) => {
    try {
      await api.updateGlobalProduct(modal.id, form)
      toast.success('Producto actualizado')
      setModal(null)
      load(search, page)
    } catch (err) {
      toast.error(err?.message || 'No se pudo actualizar el producto')
      throw err
    }
  }

  const handleToggle = async (product) => {
    const newActive = !product.active
    const ok = await confirm(
      `¿${newActive ? 'Activar' : 'Desactivar'} "${product.name}"?`,
      newActive
        ? 'Los negocios podrán vincular este producto nuevamente.'
        : 'Los negocios no podrán vincular este producto.',
      { confirmText: `Sí, ${newActive ? 'activar' : 'desactivar'}`, icon: 'question' }
    )
    if (!ok) return
    setActionId(product.id)
    try {
      await api.updateGlobalProduct(product.id, { active: newActive })
      toast.success(`"${product.name}" ${newActive ? 'activado' : 'desactivado'}`)
      load(search, page)
    } catch {
      toast.error('No se pudo actualizar el producto')
    } finally {
      setActionId(null)
    }
  }

  const openEdit = (product) => setModal({
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    category: product.category ?? '',
    imageUrl: product.imageUrl ?? '',
    barcode: product.barcode ?? '',
    sku: product.sku ?? '',
    active: product.active,
  })

  const handleDelete = async (product) => {
    setActionId(product.id)
    let linkedProducts = 0
    try {
      const usage = await api.superAdmin.getGlobalProductUsage(product.id)
      linkedProducts = usage.linkedProducts ?? 0
    } catch {
      toast.error('No se pudo verificar el uso del producto')
      setActionId(null)
      return
    } finally {
      setActionId(null)
    }

    const hasUsage = linkedProducts > 0
    const ok = await confirm(
      `¿Eliminar "${product.name}" del catálogo?`,
      hasUsage
        ? `Este producto está vinculado en ${linkedProducts} ${linkedProducts === 1 ? 'negocio' : 'negocios'}. Al eliminarlo se desvinculará de todos ellos (los negocios conservarán su propio stock e historial).`
        : 'Esta acción no se puede deshacer.',
      {
        confirmText: 'Sí, eliminar',
        icon: hasUsage ? 'warning' : 'question',
        confirmButtonColor: '#dc2626',
      }
    )
    if (!ok) return

    setActionId(product.id)
    try {
      await api.superAdmin.deleteGlobalProduct(product.id)
      toast.success(`"${product.name}" eliminado del catálogo`)
      load(search, page)
    } catch {
      toast.error('No se pudo eliminar el producto')
    } finally {
      setActionId(null)
    }
  }

  const products    = data.content ?? []
  const totalPages  = data.totalPages ?? 0
  const totalItems  = data.totalElements ?? 0
  const activeCount = products.filter(p => p.active).length

  return (
    <SuperAdminLayout>
      {modal && (
        <CatalogModal
          initial={modal === 'create' ? null : modal}
          onSave={modal === 'create' ? handleCreate : handleEdit}
          onClose={() => setModal(null)}
          productCategories={productCategories}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Catálogo Global</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Productos compartidos que los negocios pueden vincular a su inventario.
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      {/* Stats chips */}
      {!loading && totalItems > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-50">{totalItems}</span> productos en total
            </span>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <ToggleRight className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-50">{activeCount}</span> activos en esta página
            </span>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o código de barras..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 dark:bg-gray-800 dark:text-gray-100"
        />
        {search && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {search ? 'No se encontraron productos para esa búsqueda' : 'El catálogo está vacío. Agrega el primer producto.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-16">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Producto</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Barcode / SKU</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map(p => {
                  const isActing = actionId === p.id
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition ${!p.active ? 'opacity-50' : ''}`}>
                      {/* ID */}
                      <td className="px-3 py-3">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {p.id}
                        </span>
                      </td>

                      {/* Producto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-50 truncate max-w-[180px] sm:max-w-xs">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px] sm:max-w-xs">{p.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="px-3 py-3 hidden sm:table-cell">
                        {p.category ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            <Tag className="w-3 h-3" />
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Barcode / SKU */}
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="space-y-0.5">
                          {p.barcode && (
                            <p className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 font-mono">
                              <Barcode className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              {p.barcode}
                            </p>
                          )}
                          {p.sku && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">SKU: {p.sku}</p>
                          )}
                          {!p.barcode && !p.sku && <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-3">
                        <StatusPill active={p.active} />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(p)}
                            disabled={isActing}
                            title={p.active ? 'Desactivar' : 'Activar'}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
                          >
                            {p.active
                              ? <ToggleRight className="w-5 h-5 text-green-500" />
                              : <ToggleLeft  className="w-5 h-5 text-gray-400" />}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            title="Editar"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          >
                            <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={isActing}
                            title="Eliminar del catálogo"
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          {totalPages > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              {/* Info de rango */}
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {totalItems === 0 ? 'Sin resultados' : (
                  <>
                    Mostrando{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalItems)}
                    </span>{' '}
                    de{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{totalItems}</span>
                    {search && <span className="text-gray-400"> (filtrado)</span>}
                  </>
                )}
              </p>

              <div className="flex items-center gap-1 flex-wrap">
                {/* Primera página */}
                <button
                  onClick={() => goToPage(0)}
                  disabled={page === 0}
                  title="Primera página"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Anterior */}
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 0}
                  title="Página anterior"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Números de página */}
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
                  .reduce((acc, i, idx, arr) => {
                    if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...' + i)
                    acc.push(i)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="w-7 text-center text-gray-400 text-xs select-none">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                          item === page
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {item + 1}
                      </button>
                    )
                  )}

                {/* Siguiente */}
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  title="Página siguiente"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Última página */}
                <button
                  onClick={() => goToPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  title="Última página"
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>

                {/* Ir a página */}
                {totalPages > 5 && (
                  <form onSubmit={handleGoToSubmit} className="flex items-center gap-1.5 ml-2 border-l border-gray-200 dark:border-gray-700 pl-2">
                    <label className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Ir a</label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={goToInput}
                      onChange={e => setGoToInput(e.target.value)}
                      placeholder={page + 1}
                      className="w-14 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs text-center bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition"
                    >
                      Ir
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </SuperAdminLayout>
  )
}

export default SuperAdminCatalog
