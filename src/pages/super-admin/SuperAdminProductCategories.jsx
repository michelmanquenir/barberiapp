import { useEffect, useState } from 'react'
import {
  Tag, Plus, Pencil, Trash2, X,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Layers,
} from 'lucide-react'
import SuperAdminLayout from './SuperAdminLayout'
import { api } from '../../lib/api'
import { toast, confirm, confirmDanger } from '../../lib/swal'

// ─── Formulario vacío ─────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', icon: '', parentId: null, sortOrder: 0 }

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function ProductCategoryModal({ initial, parents, onSave, onClose }) {
  const [form, setForm] = useState(
    initial
      ? { name: initial.name, icon: initial.icon || '', parentId: initial.parentId || null, sortOrder: initial.sortOrder ?? 0 }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setSaving(true)
    try {
      await onSave({ ...form, parentId: form.parentId || null })
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!initial

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">
            {isEditing ? 'Editar categoría' : 'Nueva categoría de producto'}
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
                placeholder="🧴"
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
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Cuidado del cabello"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                required
              />
            </div>
          </div>

          {/* Categoría padre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Categoría padre <span className="text-gray-400">(opcional — dejar vacío para categoría raíz)</span>
            </label>
            <select
              value={form.parentId || ''}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value || null }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            >
              <option value="">— Categoría raíz —</option>
              {parents.map(p => (
                <option key={p.id} value={p.id}>
                  {p.icon ? `${p.icon} ` : ''}{p.name}
                </option>
              ))}
            </select>
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
              {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear categoría')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Fila de categoría ─────────────────────────────────────────────────────────
function CategoryRow({ cat, isChild, actionId, onToggle, onEdit, onDelete, onAddChild }) {
  const isActing = actionId === cat.id
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border flex items-center gap-4 transition-all ${
        isChild ? 'ml-6 px-3 py-2.5' : 'px-4 py-3'
      } ${cat.active
        ? 'border-gray-200 dark:border-gray-700'
        : 'border-gray-100 dark:border-gray-800 opacity-55'
      }`}
    >
      {/* Indent indicator */}
      {isChild && (
        <div className="w-3 h-3 rounded-sm border-l-2 border-b-2 border-gray-300 dark:border-gray-600 flex-shrink-0 -ml-1" />
      )}

      {/* Emoji */}
      <div className={`rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-base flex-shrink-0 ${isChild ? 'w-8 h-8' : 'w-10 h-10 text-xl'}`}>
        {cat.icon || <Tag className="w-3.5 h-3.5 text-gray-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-gray-900 dark:text-gray-50 ${isChild ? 'text-xs' : 'text-sm'}`}>
            {cat.name}
          </p>
          {!cat.active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Inactiva
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Orden: {cat.sortOrder ?? 0}</p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isChild && (
          <button
            onClick={() => onAddChild(cat)}
            title="Nueva subcategoría"
            className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition text-blue-500 dark:text-blue-400"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onToggle(cat)}
          disabled={isActing}
          title={cat.active ? 'Desactivar' : 'Activar'}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          {cat.active
            ? <ToggleRight className="w-5 h-5 text-green-500" />
            : <ToggleLeft  className="w-5 h-5 text-gray-400" />}
        </button>
        <button
          onClick={() => onEdit(cat)}
          title="Editar"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <button
          onClick={() => onDelete(cat)}
          disabled={isActing}
          title="Desactivar"
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  )
}

// ─── Bloque de categoría padre con hijos ──────────────────────────────────────
function ParentBlock({ parent, actionId, onToggle, onEdit, onDelete, onAddChild }) {
  const [expanded, setExpanded] = useState(true)
  const children = parent.children || []

  return (
    <div className="space-y-1.5">
      {/* Parent row wrapper with toggle */}
      <div className="flex items-stretch gap-1">
        {children.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center justify-center w-6 flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
        {children.length === 0 && <div className="w-6 flex-shrink-0" />}
        <div className="flex-1">
          <CategoryRow
            cat={parent}
            isChild={false}
            actionId={actionId}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        </div>
      </div>

      {/* Children */}
      {expanded && children.length > 0 && (
        <div className="space-y-1 pl-7">
          {children.map(child => (
            <CategoryRow
              key={child.id}
              cat={child}
              isChild
              actionId={actionId}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Construye el árbol padre→hijos desde la lista plana del super admin
// (incluye activas e inactivas, ordenado por sortOrder)
function buildTree(flat) {
  const sorted = [...flat].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  return sorted
    .filter(c => !c.parentId)
    .map(parent => ({
      ...parent,
      children: sorted
        .filter(c => c.parentId === parent.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
}

// ─── Página principal ─────────────────────────────────────────────────────────
function SuperAdminProductCategories() {
  // Una sola fuente de verdad: lista plana del super-admin (incluye inactivas)
  const [flat, setFlat]         = useState([])
  const [loading, setLoading]   = useState(true)
  // modal: null | 'create' | { ...category } for editing | { parentId } for new child
  const [modal, setModal]       = useState(null)
  const [actionId, setActionId] = useState(null)

  // Árbol derivado del flat (incluye activas e inactivas)
  const tree = buildTree(flat)

  // Parent list para el selector del modal (solo raíces activas)
  const parents = flat.filter(c => !c.parentId && c.active)

  const load = async () => {
    setLoading(true)
    try {
      const flatData = await api.superAdmin.listProductCategories()
      setFlat(flatData || [])
    } catch {
      toast.error('No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Helpers to sync local state after mutations ───────────────────────────
  const reload = () => load()

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    try {
      await api.superAdmin.createProductCategory(form)
      toast.success(`Categoría "${form.name}" creada`)
      setModal(null)
      reload()
    } catch (err) {
      toast.error(err?.message || 'No se pudo crear la categoría')
      throw err
    }
  }

  const handleEdit = async (form) => {
    try {
      await api.superAdmin.updateProductCategory(modal.id, form)
      toast.success('Categoría actualizada')
      setModal(null)
      reload()
    } catch (err) {
      toast.error(err?.message || 'No se pudo actualizar la categoría')
      throw err
    }
  }

  const handleToggle = async (cat) => {
    const newActive = !cat.active
    const ok = await confirm(
      `¿${newActive ? 'Activar' : 'Desactivar'} "${cat.name}"?`,
      newActive
        ? 'La categoría volverá a estar disponible.'
        : 'No aparecerá en el listado de categorías.',
      { confirmText: `Sí, ${newActive ? 'activar' : 'desactivar'}`, icon: 'question' }
    )
    if (!ok) return
    setActionId(cat.id)
    try {
      await api.superAdmin.updateProductCategory(cat.id, { active: newActive })
      toast.success(`"${cat.name}" ${newActive ? 'activada' : 'desactivada'}`)
      reload()
    } catch {
      toast.error('No se pudo actualizar la categoría')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (cat) => {
    const hasChildren = (cat.children || []).length > 0
    const ok = await confirmDanger(
      `Eliminar "${cat.name}"`,
      hasChildren
        ? `Esta categoría tiene ${cat.children.length} subcategoría(s) que también quedarán inactivas.`
        : 'La categoría quedará inactiva y no aparecerá en el formulario de productos.'
    )
    if (!ok) return
    setActionId(cat.id)
    try {
      await api.superAdmin.deleteProductCategory(cat.id)
      toast.success(`"${cat.name}" desactivada`)
      reload()
    } catch {
      toast.error('No se pudo eliminar la categoría')
    } finally {
      setActionId(null)
    }
  }

  const openCreateModal = () => setModal({ _type: 'create', parentId: null })
  const openAddChildModal = (parent) => setModal({ _type: 'create', parentId: parent.id })
  const openEditModal = (cat) => setModal({ ...cat, _type: 'edit' })

  const isCreating = modal && modal._type === 'create'
  const isEditing  = modal && modal._type === 'edit'

  return (
    <SuperAdminLayout>
      {modal && (
        <ProductCategoryModal
          initial={isEditing ? modal : (modal.parentId ? { parentId: modal.parentId } : null)}
          parents={parents}
          onSave={isEditing ? handleEdit : handleCreate}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Categorías de productos</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Estructura de categorías padre e hijos para clasificar productos. Aparecen en el formulario de creación de productos.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva categoría
        </button>
      </div>

      {/* Stats */}
      {!loading && tree.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-50">{tree.length}</span> categorías raíz
            </span>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-50">
                {tree.reduce((acc, p) => acc + (p.children?.length || 0), 0)}
              </span> subcategorías
            </span>
          </div>
        </div>
      )}

      {/* Lista árbol */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay categorías de producto. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map(parent => (
            <ParentBlock
              key={parent.id}
              parent={parent}
              actionId={actionId}
              onToggle={handleToggle}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onAddChild={openAddChildModal}
            />
          ))}
        </div>
      )}
    </SuperAdminLayout>
  )
}

export default SuperAdminProductCategories
