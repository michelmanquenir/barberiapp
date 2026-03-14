import { useEffect, useState } from 'react'
import { Tag, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'
import SuperAdminLayout from './SuperAdminLayout'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'

// ─── Estado inicial del formulario ────────────────────────────────────────────
const EMPTY_FORM = { name: '', slug: '', icon: '', description: '', sortOrder: 0 }

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ─── Componente modal de crear / editar ───────────────────────────────────────
function CategoryModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [slugEdited, setSlugEdited] = useState(Boolean(initial))

  const handleNameChange = (e) => {
    const name = e.target.value
    setForm(f => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('El nombre y el slug son requeridos')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
            {initial ? 'Editar categoría' : 'Nueva categoría'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Emoji + Nombre */}
          <div className="flex gap-3">
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Emoji</label>
              <input
                type="text"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="✂️"
                maxLength={4}
                className="w-full text-center text-xl border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleNameChange}
                placeholder="Barbería"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                required
              />
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: slugify(e.target.value) })) }}
              placeholder="barberia"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Breve descripción de esta categoría..."
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
            />
          </div>

          {/* Orden */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Orden</label>
            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (initial ? 'Guardar cambios' : 'Crear categoría')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
function SuperAdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null) // null | 'create' | category-object
  const [actionId, setActionId]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.superAdmin.listCategories()
      setCategories(data || [])
    } catch {
      toast.error('No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    try {
      const created = await api.superAdmin.createCategory(form)
      setCategories(prev => [...prev, created].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
      toast.success(`Categoría "${form.name}" creada`)
      setModal(null)
    } catch (err) {
      toast.error(err?.message || 'No se pudo crear la categoría')
      throw err
    }
  }

  const handleEdit = async (form) => {
    try {
      const updated = await api.superAdmin.updateCategory(modal.id, form)
      setCategories(prev =>
        prev.map(c => c.id === modal.id ? updated : c)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      )
      toast.success(`Categoría actualizada`)
      setModal(null)
    } catch (err) {
      toast.error(err?.message || 'No se pudo actualizar la categoría')
      throw err
    }
  }

  const handleToggle = async (cat) => {
    const newActive = !cat.active
    const label = newActive ? 'activar' : 'desactivar'
    const ok = await confirm(
      `¿${newActive ? 'Activar' : 'Desactivar'} "${cat.name}"?`,
      newActive
        ? 'La categoría volverá a estar disponible para los negocios.'
        : 'Los negocios no podrán seleccionar esta categoría.',
      { confirmText: `Sí, ${label}`, icon: 'question' }
    )
    if (!ok) return
    setActionId(cat.id)
    try {
      const updated = await api.superAdmin.updateCategory(cat.id, { active: newActive })
      setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))
      toast.success(`"${cat.name}" ${newActive ? 'activada' : 'desactivada'}`)
    } catch {
      toast.error('No se pudo actualizar la categoría')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (cat) => {
    const ok = await confirmDanger(
      `Eliminar "${cat.name}"`,
      'La categoría quedará inactiva y no será visible para nuevos negocios.'
    )
    if (!ok) return
    setActionId(cat.id)
    try {
      await api.superAdmin.deleteCategory(cat.id)
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: false } : c))
      toast.success(`"${cat.name}" desactivada`)
    } catch {
      toast.error('No se pudo eliminar la categoría')
    } finally {
      setActionId(null)
    }
  }

  return (
    <SuperAdminLayout>
      {/* Modal */}
      {modal && (
        <CategoryModal
          initial={modal === 'create' ? null : modal}
          onSave={modal === 'create' ? handleCreate : handleEdit}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Categorías de negocio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona los tipos de negocio disponibles en la plataforma.
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition"
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay categorías. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => {
            const isActing = actionId === cat.id
            return (
              <div
                key={cat.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border p-4 transition-all ${
                  cat.active
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-100 dark:border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0">
                    {cat.icon || <Tag className="w-5 h-5 text-gray-400" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-gray-50">{cat.name}</p>
                      <span className="text-xs text-gray-400 font-mono">/{cat.slug}</span>
                      {!cat.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          Inactiva
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{cat.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Orden: {cat.sortOrder ?? 0}</p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Toggle activo */}
                    <button
                      onClick={() => handleToggle(cat)}
                      disabled={isActing}
                      title={cat.active ? 'Desactivar' : 'Activar'}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
                    >
                      {cat.active
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft  className="w-5 h-5 text-gray-400" />
                      }
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => setModal(cat)}
                      title="Editar"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>

                    {/* Eliminar (soft delete) */}
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={isActing}
                      title="Desactivar"
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SuperAdminLayout>
  )
}

export default SuperAdminCategories
