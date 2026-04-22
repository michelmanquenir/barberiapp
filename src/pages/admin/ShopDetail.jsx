import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { uploadProductImage, deleteProductImageFromStorage } from '../../lib/productImageUpload'
import { uploadShopGalleryImage, deleteGalleryImageFromStorage } from '../../lib/galleryUpload'
import {
  Scissors,
  ArrowLeft,
  UserMinus,
  Link2,
  Copy,
  Check,
  Search,
  UserPlus,
  X,
  Pencil,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Tag,
  Loader2,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Crown,
  Users,
  Repeat2,
  EyeOff,
  Eye,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Minus,
  Package,
  BookOpen,
  Unlink,
  ScanLine,
  Camera,
  Images,
  ImagePlus,
  Mail,
  UserCheck,
  KeyRound,
  Archive,
  MapPin,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import AdminNavbar from '../../components/AdminNavbar'
import { toast, confirm, confirmDanger } from '../../lib/swal'
import BarcodeScanner, { primeBeepAudio } from '../../components/BarcodeScanner'

// ─── constantes ───────────────────────────────────────────────────────────────

const EMPTY_SERVICE_FORM = { name: '', description: '', price: '', durationMinutes: '' }
const EMPTY_PLAN_FORM    = { name: '', description: '', price: '', cutsPerPeriod: '', active: true }
const EMPTY_PRODUCT_FORM = { name: '', description: '', category: '', purchasePrice: '', salePrice: '', stock: '0', imageUrl: '', active: true, barcode: '', sku: '', shelfSlotId: null }

const DAYS = [
  { key: 'MONDAY',    label: 'Lunes'     },
  { key: 'TUESDAY',   label: 'Martes'    },
  { key: 'WEDNESDAY', label: 'Miércoles' },
  { key: 'THURSDAY',  label: 'Jueves'    },
  { key: 'FRIDAY',    label: 'Viernes'   },
  { key: 'SATURDAY',  label: 'Sábado'    },
  { key: 'SUNDAY',    label: 'Domingo'   },
]

const DAY_LABEL = Object.fromEntries(DAYS.map(d => [d.key, d.label]))

const EMPTY_SCHED = { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '18:00' }

// ─── Componente principal ──────────────────────────────────────────────────────

function ShopDetail() {
  const { shopId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // ── Barberos ────────────────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const [myBarberProfile, setMyBarberProfile] = useState(null)

  // Cuentas de empleados
  const [accountModal, setAccountModal]     = useState(null)   // { barber } | null
  const [accountEmail, setAccountEmail]     = useState('')
  const [accountRut, setAccountRut]         = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [unlinkingId, setUnlinkingId]       = useState(null)

  // Panel de horarios expandido por barbero
  const [expandedSchedule, setExpandedSchedule] = useState(null) // barberId | null
  const [schedules, setSchedules] = useState({})                  // { [barberId]: BarberSchedule[] }
  const [loadingSchedules, setLoadingSchedules] = useState({})
  const [schedForm, setSchedForm] = useState(EMPTY_SCHED)
  const [savingSched, setSavingSched] = useState(false)
  const [deletingSchedId, setDeletingSchedId] = useState(null)

  // ── Servicios ───────────────────────────────────────────────────────────────
  const [services, setServices] = useState([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM)
  const [editingServiceId, setEditingServiceId] = useState(null)
  const [savingService, setSavingService] = useState(false)
  const [deletingServiceId, setDeletingServiceId] = useState(null)
  const [serviceError, setServiceError] = useState(null)

  // ── Planes de suscripción ────────────────────────────────────────────────────
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [togglingPlanId, setTogglingPlanId] = useState(null)
  const [planError, setPlanError] = useState(null)
  const [showSubscribers, setShowSubscribers] = useState(false)
  const [subscribers, setSubscribers] = useState([])
  const [loadingSubscribers, setLoadingSubscribers] = useState(false)

  // ── Inventario / Productos ───────────────────────────────────────────────────
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM)
  const [editingProductId, setEditingProductId] = useState(null)
  const [savingProduct, setSavingProduct] = useState(false)
  const [productError, setProductError] = useState(null)

  // ── Validación de duplicados en tiempo real ──────────────────────────────────
  const productDupes = useMemo(() => {
    // Comparar contra todos los productos excepto el que se está editando
    const others = products.filter(p => p.id !== editingProductId)
    const name    = productForm.name.trim().toLowerCase()
    const barcode = productForm.barcode.trim()
    const sku     = productForm.sku.trim()
    return {
      name:    name    ? others.some(p => (p.name    || '').toLowerCase() === name)    : false,
      barcode: barcode ? others.some(p => (p.barcode || '') === barcode)               : false,
      sku:     sku     ? others.some(p => (p.sku     || '') === sku)                   : false,
    }
  }, [productForm.name, productForm.barcode, productForm.sku, products, editingProductId])
  const [adjustingStockId, setAdjustingStockId] = useState(null)
  // búsqueda / filtros / paginación
  const [productSearch, setProductSearch] = useState('')
  const [productStatusFilter, setProductStatusFilter] = useState('all')   // 'all' | 'active' | 'inactive'
  const [productCategoryFilter, setProductCategoryFilter] = useState('')   // '' = todas
  const PRODUCTS_PER_PAGE = 20
  const [productPage, setProductPage] = useState(1)
  // catálogo global
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogResults, setCatalogResults] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [selectedGlobalProduct, setSelectedGlobalProduct] = useState(null) // objeto del catálogo vinculado
  const [productScannerOpen, setProductScannerOpen] = useState(false)

  // ── Consulta de precios por código de barras ─────────────────────────────────
  const [priceLookupOpen, setPriceLookupOpen] = useState(false)
  const [priceLookupResult, setPriceLookupResult] = useState(null)
  const [priceLookupFeedback, setPriceLookupFeedback] = useState(null)
  const [priceLookupProcessing, setPriceLookupProcessing] = useState(false)

  // ── Bodega / Estanterías ──────────────────────────────────────────────────────
  const [shelves, setShelves] = useState([])
  const [shelvesLoading, setShelvesLoading] = useState(false)
  const [expandedShelfId, setExpandedShelfId] = useState(null)
  const [shelfGrids, setShelfGrids] = useState({}) // { [shelfId]: ShelfGridResponse }
  const [shelfGridLoading, setShelfGridLoading] = useState(null)
  const [showShelfForm, setShowShelfForm] = useState(false)
  const [editingShelf, setEditingShelf] = useState(null)
  const [shelfForm, setShelfForm] = useState({ name: '', description: '', rows: 4, columns: 5 })
  const [shelfFormSaving, setShelfFormSaving] = useState(false)
  const [editingLabelSlotId, setEditingLabelSlotId] = useState(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [slotPickerShelfId, setSlotPickerShelfId] = useState(null) // shelf seleccionada en picker del form
  // Asignación de producto a slot desde la grilla
  const [assigningSlotId, setAssigningSlotId] = useState(null)    // slot que está siendo asignado
  const [slotAssignSearch, setSlotAssignSearch] = useState('')     // filtro búsqueda en dropdown
  const [slotAssigning, setSlotAssigning] = useState(false)        // spinner de guardado
  // Modal de detalle de slot
  const [slotModal, setSlotModal] = useState(null)                 // { slotId, shelfId, shelfName, code } | null
  const [slotModalAssigning, setSlotModalAssigning] = useState(false)
  const [slotModalSearch, setSlotModalSearch] = useState('')

  // ── Categorías de negocio (para detectar tipo de negocio) ────────────────────
  const [categories, setCategories] = useState([])

  // ── Categorías de producto (para el dropdown del formulario) ─────────────────
  const [productCategories, setProductCategories] = useState([])

  // ── Galería del negocio ───────────────────────────────────────────────────────
  const [shopImages, setShopImages]               = useState([])
  const [loadingShopGallery, setLoadingShopGallery] = useState(false)
  const [uploadingShopImage, setUploadingShopImage] = useState(false)
  const [editingCaptionId, setEditingCaptionId]   = useState(null)
  const [captionDraft, setCaptionDraft]           = useState('')
  const shopGalleryInputRef = useRef(null)

  // ── Carga del negocio ───────────────────────────────────────────────────────
  const loadShop = useCallback(async () => {
    const shops = await api.getMyShops()
    const found = shops.find((s) => s.id === shopId)
    if (!found) throw new Error('Negocio no encontrado')
    setShop(found)
  }, [shopId])

  const loadServices = useCallback(async () => {
    setLoadingServices(true)
    try {
      const data = await api.getShopServices(shopId)
      setServices(data || [])
    } catch {
      setServices([])
    } finally {
      setLoadingServices(false)
    }
  }, [shopId])

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true)
    try {
      const data = await api.getAdminSubscriptionPlans(shopId)
      setPlans(data || [])
    } catch {
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [shopId])

  const loadSubscribers = useCallback(async () => {
    setLoadingSubscribers(true)
    try {
      const data = await api.getShopSubscribers(shopId)
      setSubscribers(data || [])
    } catch {
      setSubscribers([])
    } finally {
      setLoadingSubscribers(false)
    }
  }, [shopId])

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const data = await api.getAdminProducts(shopId)
      setProducts(data || [])
    } catch {
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [shopId])

  useEffect(() => {
    loadShop()
      .catch(() => setError('No se pudo cargar la información del negocio'))
      .finally(() => setLoading(false))
  }, [loadShop])

  const loadShopGallery = useCallback(async () => {
    setLoadingShopGallery(true)
    try {
      const data = await api.getShopGallery(shopId)
      setShopImages(data || [])
    } catch {
      setShopImages([])
    } finally {
      setLoadingShopGallery(false)
    }
  }, [shopId])

  useEffect(() => { loadServices() }, [loadServices])
  useEffect(() => { loadPlans() }, [loadPlans])
  useEffect(() => { loadProducts() }, [loadProducts])
  useEffect(() => { loadShopGallery() }, [loadShopGallery])
  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
    api.getProductCategories().then(setProductCategories).catch(() => setProductCategories([]))
  }, [])

  useEffect(() => {
    api.getMyBarberProfile()
      .then((profile) => setMyBarberProfile(profile))
      .catch(() => setMyBarberProfile(null))
  }, [])

  // ── Búsqueda de barberos con debounce ───────────────────────────────────────
  useEffect(() => {
    if (!showSearch) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await api.searchBarbers(query)
        const memberIds = new Set((shop?.barbers ?? []).map((b) => b.id))
        setSearchResults(results.filter((b) => !memberIds.has(b.id)))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, showSearch, shop])

  // ── Handlers galería del negocio ─────────────────────────────────────────────
  const handleShopImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (shopImages.length >= 20) {
      toast.warning('Máximo 20 fotos por negocio')
      return
    }
    setUploadingShopImage(true)
    try {
      const url = await uploadShopGalleryImage(file, shopId)
      const image = await api.addShopGalleryImage(shopId, { imageUrl: url })
      setShopImages(prev => [...prev, image])
    } catch (err) {
      toast.error(err.message || 'Error al subir la foto')
    } finally {
      setUploadingShopImage(false)
    }
  }

  const handleDeleteShopImage = async (image) => {
    const ok = await confirmDanger('¿Eliminar esta foto del negocio?')
    if (!ok) return
    try {
      await deleteGalleryImageFromStorage(image.imageUrl)
      await api.deleteShopGalleryImage(shopId, image.id)
      setShopImages(prev => prev.filter(i => i.id !== image.id))
    } catch (err) {
      toast.error(err.message || 'Error al eliminar la foto')
    }
  }

  const handleSaveCaption = async (image) => {
    try {
      const updated = await api.updateShopGalleryImageCaption(shopId, image.id, captionDraft)
      setShopImages(prev => prev.map(i => i.id === updated.id ? updated : i))
      setEditingCaptionId(null)
    } catch (err) {
      toast.error(err.message || 'Error al guardar el pie de foto')
    }
  }

  // ── Handlers barberos ───────────────────────────────────────────────────────
  const handleCopyLink = () => {
    if (!shop) return
    navigator.clipboard.writeText(`${window.location.origin}/book/${shop.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddBarber = async (barberId) => {
    setAddingId(barberId)
    try {
      await api.addBarberToShop(shopId, barberId)
      await loadShop()
      setSearchResults((prev) => prev.filter((b) => b.id !== barberId))
    } catch {
      toast.error('No se pudo agregar el profesional')
    } finally {
      setAddingId(null)
    }
  }

  const handleRemoveBarber = async (barberId) => {
    if (!(await confirm('Quitar profesional', '¿Quitar este profesional del negocio?', { confirmText: 'Sí, quitar', icon: 'warning' }))) return
    try {
      await api.removeBarberFromShop(shopId, barberId)
      await loadShop()
    } catch {
      toast.error('No se pudo quitar el profesional')
    }
  }

  // ── Cuentas de empleados ─────────────────────────────────────────────────────

  const openAccountModal = (barber) => {
    setAccountModal({ barber })
    setAccountEmail('')
    setAccountRut('')
  }

  const closeAccountModal = () => {
    setAccountModal(null)
    setAccountEmail('')
    setAccountRut('')
  }

  const handleCreateBarberAccount = async () => {
    if (!accountEmail.trim()) {
      toast.error('Ingresa el email del profesional')
      return
    }
    setCreatingAccount(true)
    try {
      const updated = await api.createBarberAccount(shopId, accountModal.barber.id, accountEmail.trim(), accountRut.trim() || null)
      await loadShop()
      closeAccountModal()
      toast.success(`Cuenta creada y vinculada para ${updated.name}. Se envió un email con la contraseña provisional.`)
    } catch (e) {
      toast.error(e.message || 'No se pudo crear la cuenta')
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleUnlinkBarberAccount = async (barberId, barberName) => {
    if (!(await confirm('Desvincular cuenta', `¿Desvincular la cuenta de app de ${barberName}? El profesional perderá acceso a su panel de empleado, pero su cuenta de usuario no será eliminada.`, { confirmText: 'Sí, desvincular', icon: 'warning' }))) return
    setUnlinkingId(barberId)
    try {
      await api.unlinkBarberAccount(shopId, barberId)
      await loadShop()
      toast.success('Cuenta desvinculada correctamente')
    } catch (e) {
      toast.error(e.message || 'No se pudo desvincular la cuenta')
    } finally {
      setUnlinkingId(null)
    }
  }

  // ── Horarios ────────────────────────────────────────────────────────────────

  const loadBarberSchedules = async (barberId) => {
    setLoadingSchedules(prev => ({ ...prev, [barberId]: true }))
    try {
      const data = await api.getBarberSchedules({ barberId, shopId })
      setSchedules(prev => ({ ...prev, [barberId]: data || [] }))
    } catch {
      setSchedules(prev => ({ ...prev, [barberId]: [] }))
    } finally {
      setLoadingSchedules(prev => ({ ...prev, [barberId]: false }))
    }
  }

  const toggleSchedule = (barberId) => {
    if (expandedSchedule === barberId) {
      setExpandedSchedule(null)
    } else {
      setExpandedSchedule(barberId)
      setSchedForm(EMPTY_SCHED)
      if (!schedules[barberId]) {
        loadBarberSchedules(barberId)
      }
    }
  }

  const handleAddSchedule = async (barberId) => {
    setSavingSched(true)
    try {
      await api.createBarberSchedule({
        barberId: String(barberId),
        shopId,
        dayOfWeek:  schedForm.dayOfWeek,
        startTime:  schedForm.startTime,
        endTime:    schedForm.endTime,
      })
      await loadBarberSchedules(barberId)
      setSchedForm(EMPTY_SCHED)
    } catch (e) {
      toast.error(e.message ?? 'No se pudo guardar el horario')
    } finally {
      setSavingSched(false)
    }
  }

  const handleDeleteSchedule = async (barberId, schedId) => {
    setDeletingSchedId(schedId)
    try {
      await api.deleteBarberSchedule(schedId)
      setSchedules(prev => ({
        ...prev,
        [barberId]: (prev[barberId] ?? []).filter(s => s.id !== schedId),
      }))
    } catch {
      toast.error('No se pudo eliminar el horario')
    } finally {
      setDeletingSchedId(null)
    }
  }

  // ── Handlers servicios ──────────────────────────────────────────────────────
  const openCreateService = () => {
    setEditingServiceId(null)
    setServiceForm(EMPTY_SERVICE_FORM)
    setServiceError(null)
    setShowServiceForm(true)
  }

  const openEditService = (service) => {
    setEditingServiceId(service.id)
    setServiceForm({
      name: service.name,
      description: service.description ?? '',
      price: String(service.price),
      durationMinutes: String(service.durationMinutes),
    })
    setServiceError(null)
    setShowServiceForm(true)
  }

  const closeServiceForm = () => {
    setShowServiceForm(false)
    setEditingServiceId(null)
    setServiceForm(EMPTY_SERVICE_FORM)
    setServiceError(null)
  }

  const handleSaveService = async (e) => {
    e.preventDefault()
    if (!serviceForm.name.trim() || !serviceForm.price || !serviceForm.durationMinutes) {
      setServiceError('Completa nombre, precio y duración')
      return
    }
    setSavingService(true)
    setServiceError(null)
    const payload = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || null,
      price: parseInt(serviceForm.price, 10),
      durationMinutes: parseInt(serviceForm.durationMinutes, 10),
    }
    try {
      if (editingServiceId) {
        await api.updateShopService(shopId, editingServiceId, payload)
      } else {
        await api.createShopService(shopId, payload)
      }
      await loadServices()
      closeServiceForm()
    } catch {
      setServiceError('No se pudo guardar el servicio. Intenta de nuevo.')
    } finally {
      setSavingService(false)
    }
  }

  const handleDeleteService = async (serviceId) => {
    if (!(await confirmDanger('Eliminar servicio', '¿Eliminar este servicio? Esta acción no se puede deshacer.'))) return
    setDeletingServiceId(serviceId)
    try {
      await api.deleteShopService(shopId, serviceId)
      await loadServices()
    } catch {
      toast.error('No se pudo eliminar el servicio')
    } finally {
      setDeletingServiceId(null)
    }
  }

  // ── Handlers planes de suscripción ──────────────────────────────────────────
  const openCreatePlan = () => {
    setEditingPlanId(null)
    setPlanForm(EMPTY_PLAN_FORM)
    setPlanError(null)
    setShowPlanForm(true)
  }

  const openEditPlan = (plan) => {
    setEditingPlanId(plan.id)
    setPlanForm({
      name: plan.name,
      description: plan.description ?? '',
      price: String(plan.price),
      cutsPerPeriod: String(plan.cutsPerPeriod),
      active: plan.active,
    })
    setPlanError(null)
    setShowPlanForm(true)
  }

  const closePlanForm = () => {
    setShowPlanForm(false)
    setEditingPlanId(null)
    setPlanForm(EMPTY_PLAN_FORM)
    setPlanError(null)
  }

  const handleSavePlan = async (e) => {
    e.preventDefault()
    if (!planForm.name.trim() || !planForm.price || !planForm.cutsPerPeriod) {
      setPlanError(`Completa nombre, precio y cantidad de ${serviceUnit}`)
      return
    }
    setSavingPlan(true)
    setPlanError(null)
    const payload = {
      name: planForm.name.trim(),
      description: planForm.description.trim() || null,
      price: parseInt(planForm.price, 10),
      cutsPerPeriod: parseInt(planForm.cutsPerPeriod, 10),
      active: planForm.active,
    }
    try {
      if (editingPlanId) {
        await api.updateSubscriptionPlan(editingPlanId, payload)
      } else {
        await api.createSubscriptionPlan(shopId, payload)
      }
      await loadPlans()
      closePlanForm()
    } catch {
      setPlanError('No se pudo guardar el plan. Intenta de nuevo.')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleTogglePlan = async (plan) => {
    setTogglingPlanId(plan.id)
    try {
      await api.updateSubscriptionPlan(plan.id, { active: !plan.active })
      await loadPlans()
    } catch {
      toast.error('No se pudo actualizar el plan')
    } finally {
      setTogglingPlanId(null)
    }
  }

  const handleToggleSubscribers = async () => {
    if (!showSubscribers) {
      await loadSubscribers()
    }
    setShowSubscribers(s => !s)
  }

  // ── Búsqueda en catálogo global (debounce) ───────────────────────────────────
  useEffect(() => {
    if (!showProductForm || selectedGlobalProduct) return
    if (catalogQuery.trim().length < 2) { setCatalogResults([]); return }
    setCatalogLoading(true)
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchGlobalProducts(catalogQuery.trim(), 10)
        setCatalogResults(results || [])
      } catch { setCatalogResults([]) }
      finally { setCatalogLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [catalogQuery, showProductForm, selectedGlobalProduct])

  // ── Imagen de producto ───────────────────────────────────────────────────────
  const productImageInputRef = useRef(null)
  const [productImagePreview, setProductImagePreview] = useState(null)
  const [uploadingProductImage, setUploadingProductImage] = useState(false)

  const handleProductImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Preview local inmediato
    const localUrl = URL.createObjectURL(file)
    setProductImagePreview(localUrl)
    setUploadingProductImage(true)
    try {
      const publicUrl = await uploadProductImage(file, shopId)
      setProductForm(f => ({ ...f, imageUrl: publicUrl }))
    } catch (err) {
      toast.error(err.message ?? 'No se pudo subir la imagen')
      setProductImagePreview(null)
    } finally {
      setUploadingProductImage(false)
    }
  }

  // ── Handlers productos / inventario ─────────────────────────────────────────
  const openCreateProduct = () => {
    setEditingProductId(null)
    setProductForm(EMPTY_PRODUCT_FORM)
    setProductError(null)
    setProductImagePreview(null)
    setSelectedGlobalProduct(null)
    setCatalogQuery('')
    setCatalogResults([])
    setShowProductForm(true)
  }

  const openEditProduct = (p) => {
    setEditingProductId(p.id)
    // Si está vinculado al catálogo global, reconstruir el objeto selectedGlobalProduct
    if (p.globalProductId) {
      setSelectedGlobalProduct({
        id: p.globalProductId,
        name: p.name,
        description: p.description,
        category: p.category,
        imageUrl: p.imageUrl,
        barcode: p.barcode,
        sku: p.sku,
      })
    } else {
      setSelectedGlobalProduct(null)
    }
    setProductForm({
      name: p.globalProductId ? '' : (p.name ?? ''),
      description: p.globalProductId ? '' : (p.description ?? ''),
      category: p.globalProductId ? '' : (p.category ?? ''),
      purchasePrice: p.purchasePrice != null ? String(p.purchasePrice) : '',
      salePrice: String(p.salePrice),
      stock: String(p.stock ?? 0),
      imageUrl: p.globalProductId ? '' : (p.imageUrl ?? ''),
      active: p.active,
      barcode: p.globalProductId ? '' : (p.barcode ?? ''),
      sku: p.globalProductId ? '' : (p.sku ?? ''),
      shelfSlotId: p.shelfSlotId ?? null,
    })
    setSlotPickerShelfId(p.shelfId ?? null)
    if (p.shelfId && !shelfGrids[p.shelfId]) loadShelfGrid(p.shelfId)
    setProductError(null)
    setProductImagePreview(p.globalProductId ? null : (p.imageUrl ?? null))
    setCatalogQuery('')
    setCatalogResults([])
    setShowProductForm(true)
  }

  const closeProductForm = () => {
    setShowProductForm(false)
    setEditingProductId(null)
    setProductForm(EMPTY_PRODUCT_FORM)
    setProductError(null)
    setProductImagePreview(null)
    setSelectedGlobalProduct(null)
    setCatalogQuery('')
    setCatalogResults([])
    setSlotPickerShelfId(null)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!selectedGlobalProduct && !productForm.name.trim()) {
      setProductError('El nombre es obligatorio (o selecciona un producto del catálogo)')
      return
    }
    if (!productForm.salePrice) {
      setProductError('El precio de venta es obligatorio')
      return
    }
    if (productDupes.barcode) {
      setProductError(`El código de barras "${productForm.barcode.trim()}" ya está asignado a otro producto.`)
      return
    }
    if (productDupes.sku) {
      setProductError(`El SKU "${productForm.sku.trim()}" ya está en uso por otro producto.`)
      return
    }
    setSavingProduct(true)
    setProductError(null)
    const payload = selectedGlobalProduct
      ? {
          // Producto vinculado al catálogo: solo precio, stock y estado
          globalProductId: selectedGlobalProduct.id,
          purchasePrice: productForm.purchasePrice ? parseInt(productForm.purchasePrice, 10) : null,
          salePrice: parseInt(productForm.salePrice, 10),
          stock: parseInt(productForm.stock, 10) || 0,
          active: productForm.active,
          shelfSlotId: productForm.shelfSlotId ?? null,
        }
      : {
          // Producto local: todos los campos
          name: productForm.name.trim(),
          description: productForm.description.trim() || null,
          category: productForm.category.trim() || null,
          imageUrl: productForm.imageUrl.trim() || null,
          barcode: productForm.barcode.trim() || null,
          sku: productForm.sku.trim() || null,
          purchasePrice: productForm.purchasePrice ? parseInt(productForm.purchasePrice, 10) : null,
          salePrice: parseInt(productForm.salePrice, 10),
          stock: parseInt(productForm.stock, 10) || 0,
          active: productForm.active,
          shelfSlotId: productForm.shelfSlotId ?? null,
        }
    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload)
      } else {
        await api.createProduct(shopId, payload)
      }
      await loadProducts()
      closeProductForm()
    } catch {
      setProductError('No se pudo guardar el producto. Intenta de nuevo.')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleAdjustStock = async (productId, delta) => {
    setAdjustingStockId(productId)
    try {
      const updated = await api.adjustStock(productId, delta)
      setProducts(prev => prev.map(p => p.id === productId ? updated : p))
    } catch {
      toast.error('No se pudo ajustar el stock')
    } finally {
      setAdjustingStockId(null)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!(await confirm('Desactivar producto', '¿Desactivar este producto? Dejará de ser visible para los clientes.', { confirmText: 'Sí, desactivar', icon: 'warning' }))) return
    try {
      await api.deleteProduct(productId)
      await loadProducts()
    } catch {
      toast.error('No se pudo desactivar el producto')
    }
  }

  // ── Consulta de precios por barcode ─────────────────────────────────────────
  const handlePriceLookup = async (barcode) => {
    if (priceLookupProcessing) return
    setPriceLookupProcessing(true)
    setPriceLookupResult(null)
    setPriceLookupFeedback(null)
    try {
      const product = await api.getProductByBarcode(shopId, barcode)
      setPriceLookupResult(product)
      const price = product.salePrice != null
        ? `$${Number(product.salePrice).toLocaleString('es-CL')}`
        : 'Sin precio'
      setPriceLookupFeedback({ type: 'success', message: `${product.name} — ${price}` })
    } catch {
      setPriceLookupFeedback({ type: 'error', message: 'Producto no encontrado en este negocio' })
      setPriceLookupResult(null)
    } finally {
      setPriceLookupProcessing(false)
      setTimeout(() => setPriceLookupFeedback(null), 3500)
    }
  }

  // ── Bodega / Estanterías ─────────────────────────────────────────────────────
  const loadShelves = useCallback(async () => {
    setShelvesLoading(true)
    try {
      const data = await api.getShelves(shopId)
      setShelves(data)
    } catch { /* ignore */ } finally {
      setShelvesLoading(false)
    }
  }, [shopId])

  const loadShelfGrid = async (shelfId) => {
    setShelfGridLoading(shelfId)
    try {
      const grid = await api.getShelfGrid(shopId, shelfId)
      setShelfGrids(prev => ({ ...prev, [shelfId]: grid }))
    } catch {
      toast.error('No se pudo cargar la grilla')
    } finally {
      setShelfGridLoading(null)
    }
  }

  const toggleShelfExpand = (shelfId) => {
    if (expandedShelfId === shelfId) {
      setExpandedShelfId(null)
    } else {
      setExpandedShelfId(shelfId)
      if (!shelfGrids[shelfId]) loadShelfGrid(shelfId)
    }
  }

  const openCreateShelf = () => {
    setEditingShelf(null)
    setShelfForm({ name: '', description: '', rows: 4, columns: 5 })
    setShowShelfForm(true)
  }

  const openEditShelf = (shelf) => {
    setEditingShelf(shelf)
    setShelfForm({ name: shelf.name, description: shelf.description || '', rows: shelf.rows, columns: shelf.columns })
    setShowShelfForm(true)
  }

  const handleSaveShelf = async (e) => {
    e.preventDefault()
    if (!shelfForm.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setShelfFormSaving(true)
    try {
      if (editingShelf) {
        const updated = await api.updateShelf(shopId, editingShelf.id, { name: shelfForm.name, description: shelfForm.description })
        setShelves(prev => prev.map(s => s.id === updated.id ? updated : s))
        toast.success('Estantería actualizada')
      } else {
        const created = await api.createShelf(shopId, shelfForm)
        setShelves(prev => [...prev, created])
        toast.success('Estantería creada')
      }
      setShowShelfForm(false)
    } catch {
      toast.error('Error al guardar la estantería')
    } finally {
      setShelfFormSaving(false)
    }
  }

  const handleDeleteShelf = async (shelf) => {
    if (!(await confirm('Eliminar estantería', `¿Eliminar "${shelf.name}"? Los productos asignados quedarán sin ubicación.`, { confirmText: 'Sí, eliminar', icon: 'warning' }))) return
    try {
      await api.deleteShelf(shopId, shelf.id)
      setShelves(prev => prev.filter(s => s.id !== shelf.id))
      setShelfGrids(prev => { const n = { ...prev }; delete n[shelf.id]; return n })
      if (expandedShelfId === shelf.id) setExpandedShelfId(null)
      // Limpiar referencias en la lista de productos
      setProducts(prev => prev.map(p => p.shelfId === shelf.id ? { ...p, shelfSlotId: null, shelfSlotCode: null, shelfId: null, shelfName: null } : p))
      toast.success('Estantería eliminada')
    } catch {
      toast.error('No se pudo eliminar la estantería')
    }
  }

  const handleSaveSlotLabel = async (slotId) => {
    try {
      await api.updateSlotLabel(shopId, slotId, labelDraft)
      setShelfGrids(prev => {
        const updated = {}
        for (const sid in prev) {
          const grid = prev[sid]
          updated[sid] = grid?.slots?.some(s => s.id === slotId)
            ? { ...grid, slots: grid.slots.map(s => s.id === slotId ? { ...s, label: labelDraft.trim() || null } : s) }
            : grid
        }
        return updated
      })
      setEditingLabelSlotId(null)
    } catch {
      toast.error('No se pudo actualizar la etiqueta')
    }
  }

  /** Asigna un producto a un slot desde la grilla de bodega */
  const handleAssignToSlot = async (slotId, productId, shelfId) => {
    setSlotAssigning(true)
    // Capturar info antes del reload para el mensaje
    const slotCode = shelfGrids[shelfId]?.slots?.find(s => s.id === slotId)?.code ?? ''
    const productName = products.find(p => p.id === productId)?.name ?? 'Producto'
    try {
      await api.assignProductSlot(productId, slotId)
      await Promise.all([loadShelfGrid(shelfId), loadProducts()])
      setAssigningSlotId(null)
      setSlotAssignSearch('')
      toast.success(`"${productName}" guardado en ${slotCode}`)
    } catch {
      toast.error('No se pudo asignar el producto')
    } finally {
      setSlotAssigning(false)
    }
  }

  /** Quita el producto de un slot desde la grilla */
  const handleRemoveFromSlot = async (productId, shelfId) => {
    setSlotAssigning(true)
    try {
      await api.assignProductSlot(productId, -1)
      await Promise.all([loadShelfGrid(shelfId), loadProducts()])
      toast.success('Producto removido de la posición')
    } catch {
      toast.error('No se pudo quitar el producto')
    } finally {
      setSlotAssigning(false)
    }
  }

  /** Abre el modal de detalle de un slot */
  const openSlotModal = (slot, shelf) => {
    setSlotModal({ slotId: slot.id, shelfId: shelf.id, shelfName: shelf.name, code: slot.code })
    setSlotModalAssigning(false)
    setSlotModalSearch('')
  }

  /** Cierra el modal de detalle */
  const closeSlotModal = () => {
    setSlotModal(null)
    setSlotModalAssigning(false)
    setSlotModalSearch('')
  }

  /** Asigna un producto al slot desde el modal */
  const handleModalAssign = async (productId) => {
    if (!slotModal) return
    setSlotAssigning(true)
    const productName = products.find(p => p.id === productId)?.name ?? 'Producto'
    try {
      await api.assignProductSlot(productId, slotModal.slotId)
      await Promise.all([loadShelfGrid(slotModal.shelfId), loadProducts()])
      setSlotModalAssigning(false)
      setSlotModalSearch('')
      toast.success(`"${productName}" guardado en ${slotModal.code}`)
    } catch {
      toast.error('No se pudo asignar el producto')
    } finally {
      setSlotAssigning(false)
    }
  }

  /** Quita un producto del slot desde el modal */
  const handleModalRemove = async (productId) => {
    if (!slotModal) return
    setSlotAssigning(true)
    try {
      await api.assignProductSlot(productId, -1)
      await Promise.all([loadShelfGrid(slotModal.shelfId), loadProducts()])
      toast.success('Producto removido de la posición')
    } catch {
      toast.error('No se pudo quitar el producto')
    } finally {
      setSlotAssigning(false)
    }
  }

  // ── Tipo de negocio ─────────────────────────────────────────────────────────
  const shopCategory = categories.find(c => c.id === shop?.categoryId)
  const isProductShop = shopCategory?.slug?.includes('bazar') ?? false
  const isTransportShop = shopCategory?.slug?.includes('transport') ?? false
  const isGymShop = (shopCategory?.slug?.includes('gym') || shopCategory?.slug?.includes('box')) ?? false

  // Término que se usa para las "unidades" de servicio en los planes según el tipo de negocio
  const serviceUnit = (() => {
    const slug = shopCategory?.slug ?? ''
    if (slug.includes('gym') || slug.includes('box'))   return 'clases'
    if (slug.includes('transport'))                      return 'viajes'
    if (slug.includes('bazar') || slug.includes('shop')) return 'compras'
    if (slug.includes('salon') || slug.includes('spa'))  return 'sesiones'
    return 'cortes' // barbería por defecto
  })()

  useEffect(() => { if (isProductShop) loadShelves() }, [loadShelves, isProductShop])

  // ── Variables del modal de slot (calculadas aquí para evitar IIFE en JSX) ──
  const modalSlot = slotModal
    ? (shelfGrids[slotModal.shelfId]?.slots?.find(s => s.id === slotModal.slotId) ?? null)
    : null
  const modalProducts = modalSlot?.products ?? []
  const modalSlotProductIds = new Set(modalProducts.map(sp => sp.productId))
  const modalAvailable = slotModal
    ? products.filter(p =>
        p.active &&
        !modalSlotProductIds.has(p.id) &&
        (!slotModalSearch || p.name?.toLowerCase().includes(slotModalSearch.toLowerCase()))
      )
    : []

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <AdminNavbar />

      <main className="pt-16">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/admin/shops')}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Mis negocios
          </button>

          {loading && !shop && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-4 text-sm">{error}</div>
          )}

          {shop && (
            <div className="space-y-6">

              {/* ── Banner negocio pendiente de aprobación ── */}
              {shop.approvalStatus === 'PENDING' && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg p-4 text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Negocio pendiente de aprobación</p>
                    <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                      Un administrador debe aprobar este negocio antes de que puedas agregar servicios, productos o recibir reservas públicas.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Banner negocio rechazado ── */}
              {shop.approvalStatus === 'REJECTED' && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg p-4 text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Negocio rechazado</p>
                    <p className="mt-0.5 text-red-700 dark:text-red-400">
                      Este negocio fue rechazado. No puedes agregar servicios ni productos. Contacta al administrador para más información.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Info del negocio ── */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 truncate">{shop.name}</h2>
                    {shop.description && <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">{shop.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${shop.active ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        {shop.active ? 'Activo' : 'Inactivo'}
                      </span>
                      {shop.approvalStatus === 'PENDING' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                          En revisión
                        </span>
                      )}
                      {shop.approvalStatus === 'REJECTED' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                          Rechazado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    {isProductShop ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/admin/shops/${shopId}/pos`)}
                          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition">
                          <TrendingUp className="w-3.5 h-3.5" />Caja / POS
                        </button>
                        <button onClick={() => navigate(`/admin/shops/${shopId}/orders`)}
                          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                          <ShoppingBag className="w-3.5 h-3.5" />Ver pedidos
                        </button>
                        <button
                          onClick={() => { primeBeepAudio(); setPriceLookupOpen(true); setPriceLookupResult(null); setPriceLookupFeedback(null) }}
                          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                          <Tag className="w-3.5 h-3.5" />Consultar precios
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => navigate(`/admin/shops/${shopId}/book`)}
                          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                          <CalendarPlus className="w-3.5 h-3.5" />Agendar cita
                        </button>
                        <button onClick={() => navigate(`/admin/shops/${shopId}/appointments`)}
                          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition">
                          <CalendarDays className="w-3.5 h-3.5" />Ver citas
                        </button>
                      </>
                    )}
                    {isTransportShop && (
                      <button onClick={() => navigate(`/admin/shops/${shopId}/transport`)}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                        🚌 Transporte
                      </button>
                    )}
                    {isGymShop && (
                      <button onClick={() => navigate(`/admin/shops/${shopId}/gym`)}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                        🥊 Gestionar Gym
                      </button>
                    )}
                    <button onClick={() => navigate(`/admin/shops/${shopId}/stats`)}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <TrendingUp className="w-3.5 h-3.5" />Estadísticas
                    </button>
                    <button onClick={() => navigate(`/admin/shops/${shopId}/edit`)}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <Pencil className="w-3.5 h-3.5" />Editar
                    </button>
                  </div>
                </div>

                <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Link público de reservas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-mono text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 truncate">
                      {window.location.origin}/book/{shop.slug}
                    </span>
                    <button onClick={handleCopyLink}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition whitespace-nowrap">
                      {copied ? <><Check className="w-3.5 h-3.5" />Copiado</> : <><Copy className="w-3.5 h-3.5" />Copiar</>}
                    </button>
                    <button onClick={() => navigate(`/book/${shop.slug}`)}
                      className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition whitespace-nowrap">
                      Ver
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Servicios ── */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Servicios ({services.length})</h3>
                  <button onClick={showServiceForm ? closeServiceForm : openCreateService}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${showServiceForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'}`}>
                    {showServiceForm ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Agregar servicio</>}
                  </button>
                </div>

                {showServiceForm && (
                  <form onSubmit={handleSaveService} className="mb-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{editingServiceId ? 'Editar servicio' : 'Nuevo servicio'}</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre *</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          <input type="text" value={serviceForm.name}
                            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                            placeholder="Ej: Corte clásico, Barba completa..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descripción <span className="text-gray-400 dark:text-gray-500">(opcional)</span></label>
                        <textarea value={serviceForm.description}
                          onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                          placeholder="Describe brevemente el servicio..." rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Precio *</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="number" min="0" value={serviceForm.price}
                              onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                              placeholder="0"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Duración (min) *</label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="number" min="1" value={serviceForm.durationMinutes}
                              onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })}
                              placeholder="30"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                          </div>
                        </div>
                      </div>
                      {serviceError && <p className="text-xs text-red-500">{serviceError}</p>}
                    </div>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                      <button type="button" onClick={closeServiceForm}
                        className="text-sm px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        Cancelar
                      </button>
                      <button type="submit" disabled={savingService}
                        className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50">
                        {savingService
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando...</>
                          : <><Check className="w-3.5 h-3.5" />{editingServiceId ? 'Guardar cambios' : 'Crear servicio'}</>}
                      </button>
                    </div>
                  </form>
                )}

                {loadingServices ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Este negocio no tiene servicios aún.
                    <br /><span className="text-xs">Agrega servicios usando el botón de arriba.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between py-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{service.name}</p>
                            <span className="text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 rounded-full font-medium">${service.price?.toLocaleString()}</span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />{service.durationMinutes} min
                            </span>
                          </div>
                          {service.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{service.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                          <button onClick={() => openEditService(service)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                            <Pencil className="w-3.5 h-3.5" />Editar
                          </button>
                          <button onClick={() => handleDeleteService(service.id)} disabled={deletingServiceId === service.id}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50">
                            {deletingServiceId === service.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Planes de suscripción ── */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Planes de suscripción</h3>
                    <span className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                      {plans.filter(p => p.active).length} activo{plans.filter(p => p.active).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleToggleSubscribers}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <Users className="w-3.5 h-3.5" />Suscriptores
                    </button>
                    <button onClick={showPlanForm ? closePlanForm : openCreatePlan}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${showPlanForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'}`}>
                      {showPlanForm ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Nuevo plan</>}
                    </button>
                  </div>
                </div>

                {/* Lista de suscriptores */}
                {showSubscribers && (
                  <div className="mb-5 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-purple-50 dark:bg-purple-950 border-b border-purple-200 dark:border-purple-800">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />Suscriptores activos ({subscribers.length})
                      </p>
                    </div>
                    {loadingSubscribers ? (
                      <div className="flex justify-center py-6">
                        <div className="w-5 h-5 border-2 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
                      </div>
                    ) : subscribers.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                        <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
                        No hay suscriptores activos aún.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {subscribers.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{sub.userName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{sub.planName} · vence {sub.endDate}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                {sub.cutsUsed}/{sub.cutsAllowed} {serviceUnit}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{sub.daysRemaining} días restantes</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Formulario nuevo/editar plan */}
                {showPlanForm && (
                  <form onSubmit={handleSavePlan} className="mb-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {editingPlanId ? 'Editar plan' : 'Nuevo plan de suscripción'}
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre del plan *</label>
                        <div className="relative">
                          <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          <input type="text" value={planForm.name}
                            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                            placeholder="Ej: Plan Básico, Plan Premium..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descripción <span className="text-gray-400">(opcional)</span></label>
                        <textarea value={planForm.description}
                          onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                          placeholder="Describe qué incluye el plan..." rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Precio mensual *</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="number" min="0" value={planForm.price}
                              onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                              placeholder="0"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 capitalize">{serviceUnit.charAt(0).toUpperCase() + serviceUnit.slice(1)} incluidos *</label>
                          <div className="relative">
                            <Repeat2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="number" min="1" value={planForm.cutsPerPeriod}
                              onChange={(e) => setPlanForm({ ...planForm, cutsPerPeriod: e.target.value })}
                              placeholder="4"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPlanForm(f => ({ ...f, active: !f.active }))}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${planForm.active ? 'border-green-400 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                          {planForm.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {planForm.active ? 'Activo (visible a clientes)' : 'Inactivo (oculto)'}
                        </button>
                      </div>
                      {planError && <p className="text-xs text-red-500">{planError}</p>}
                    </div>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                      <button type="button" onClick={closePlanForm}
                        className="text-sm px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        Cancelar
                      </button>
                      <button type="submit" disabled={savingPlan}
                        className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50">
                        {savingPlan
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando...</>
                          : <><Check className="w-3.5 h-3.5" />{editingPlanId ? 'Guardar cambios' : 'Crear plan'}</>}
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista de planes */}
                {loadingPlans ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
                  </div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    <Crown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No hay planes de suscripción aún.
                    <br /><span className="text-xs">Crea planes para que tus clientes se suscriban mensualmente.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {plans.map((plan) => (
                      <div key={plan.id} className={`flex items-center justify-between py-3.5 ${!plan.active ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{plan.name}</p>
                            <span className="text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 rounded-full font-medium">${plan.price?.toLocaleString()}/mes</span>
                            <span className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Repeat2 className="w-3 h-3" />{plan.cutsPerPeriod} {serviceUnit}
                            </span>
                            {!plan.active && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
                            )}
                          </div>
                          {plan.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{plan.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                          <button onClick={() => openEditPlan(plan)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                            <Pencil className="w-3.5 h-3.5" />Editar
                          </button>
                          <button onClick={() => handleTogglePlan(plan)} disabled={togglingPlanId === plan.id}
                            className={`flex items-center gap-1 text-xs transition px-2 py-1 rounded disabled:opacity-50 ${plan.active ? 'text-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950' : 'text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950'}`}>
                            {togglingPlanId === plan.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : plan.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {plan.active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Galería del negocio ── */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Images className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                      Galería del negocio
                    </h3>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                      {shopImages.length}/20
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={shopGalleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleShopImageUpload}
                    />
                    <button
                      onClick={() => shopGalleryInputRef.current?.click()}
                      disabled={uploadingShopImage || shopImages.length >= 20}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50"
                    >
                      {uploadingShopImage
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Subiendo...</>
                        : <><ImagePlus className="w-3.5 h-3.5" />Agregar foto</>
                      }
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  Sube fotos de tu negocio para que los clientes las vean en tu página pública. Máximo 20 fotos.
                </p>

                {loadingShopGallery ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Cargando fotos...</span>
                  </div>
                ) : shopImages.length === 0 ? (
                  <button
                    onClick={() => shopGalleryInputRef.current?.click()}
                    className="w-full py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition"
                  >
                    <Camera className="w-8 h-8" />
                    <span className="text-sm font-medium">Agrega la primera foto de tu negocio</span>
                    <span className="text-xs">JPG, PNG, WEBP · máx. 20 MB</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {shopImages.map(img => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square">
                        <img
                          src={img.imageUrl}
                          alt={img.caption || 'Foto del negocio'}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay al hacer hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          {/* Botón eliminar */}
                          <button
                            onClick={() => handleDeleteShopImage(img)}
                            className="self-end p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Editar caption */}
                          {editingCaptionId === img.id ? (
                            <div className="flex gap-1">
                              <input
                                value={captionDraft}
                                onChange={e => setCaptionDraft(e.target.value)}
                                placeholder="Pie de foto..."
                                className="flex-1 text-xs px-2 py-1 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 focus:outline-none"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveCaption(img)
                                  if (e.key === 'Escape') setEditingCaptionId(null)
                                }}
                              />
                              <button
                                onClick={() => handleSaveCaption(img)}
                                className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition"
                              >✓</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingCaptionId(img.id); setCaptionDraft(img.caption || '') }}
                              className="text-left text-xs text-white/80 hover:text-white truncate transition"
                              title="Editar pie de foto"
                            >
                              {img.caption || <span className="italic opacity-60">+ pie de foto</span>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Tarjeta para agregar más fotos */}
                    {shopImages.length < 20 && (
                      <button
                        onClick={() => shopGalleryInputRef.current?.click()}
                        disabled={uploadingShopImage}
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1.5 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition disabled:opacity-50"
                      >
                        {uploadingShopImage
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <><ImagePlus className="w-5 h-5" /><span className="text-xs">Agregar</span></>
                        }
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Inventario / Productos ── */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Inventario</h3>
                    <span className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                      {products.filter(p => p.active).length} activo{products.filter(p => p.active).length !== 1 ? 's' : ''}
                    </span>
                    {products.some(p => p.active && (p.stock ?? 0) < 5) && (
                      <span className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />Stock bajo
                      </span>
                    )}
                  </div>
                  <button onClick={showProductForm ? closeProductForm : openCreateProduct}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${showProductForm ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'}`}>
                    {showProductForm ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Nuevo producto</>}
                  </button>
                </div>

                {/* Scanner de barcode para formulario de producto */}
                {productScannerOpen && (
                  <BarcodeScanner
                    onDetected={(code) => {
                      setProductForm(f => ({ ...f, barcode: code }))
                      setProductScannerOpen(false)
                    }}
                    onClose={() => setProductScannerOpen(false)}
                  />
                )}

                {/* Scanner de consulta de precios */}
                {priceLookupOpen && (
                  <>
                    <BarcodeScanner
                      onDetected={handlePriceLookup}
                      onClose={() => { setPriceLookupOpen(false); setPriceLookupResult(null); setPriceLookupFeedback(null) }}
                      feedback={priceLookupFeedback}
                      processing={priceLookupProcessing}
                    />
                    {/* Panel de resultado — se muestra encima del scanner */}
                    {priceLookupResult && (
                      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-full max-w-sm px-4">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          {/* Header verde */}
                          <div className="bg-emerald-600 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-white uppercase tracking-wide">Resultado</span>
                            <button
                              onClick={() => setPriceLookupResult(null)}
                              className="text-white/80 hover:text-white transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-4 flex items-start gap-3">
                            {/* Imagen */}
                            {priceLookupResult.imageUrl
                              ? <img src={priceLookupResult.imageUrl} alt={priceLookupResult.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
                              : <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><Package className="w-7 h-7 text-gray-400" /></div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm leading-tight truncate">{priceLookupResult.name}</p>
                              {priceLookupResult.category && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{priceLookupResult.category}</p>
                              )}
                              <div className="mt-2 flex items-center gap-3 flex-wrap">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Precio venta</span>
                                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {priceLookupResult.salePrice != null
                                      ? `$${Number(priceLookupResult.salePrice).toLocaleString('es-CL')}`
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Stock</span>
                                  <span className={`text-sm font-medium ${(priceLookupResult.stock ?? 0) < 5 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {priceLookupResult.stock ?? 0} uds.
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 pb-4">
                            <button
                              onClick={() => setPriceLookupResult(null)}
                              className="w-full text-sm py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
                            >
                              Escanear otro
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Formulario nuevo/editar producto */}
                {showProductForm && (
                  <form onSubmit={handleSaveProduct} className="mb-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {editingProductId ? 'Editar producto' : 'Nuevo producto'}
                      </p>
                      {selectedGlobalProduct && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                          <BookOpen className="w-3 h-3" />Catálogo global
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-3">

                      {/* ── Búsqueda en catálogo global ── */}
                      {!selectedGlobalProduct ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Buscar en catálogo global <span className="text-gray-400">(opcional)</span>
                          </label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              value={catalogQuery}
                              onChange={e => setCatalogQuery(e.target.value)}
                              placeholder="Ej: Monster, Pomada, código de barras..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
                            />
                            {catalogLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />}
                          </div>
                          {/* Resultados del catálogo */}
                          {catalogResults.length > 0 && (
                            <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                              {catalogResults.map(gp => (
                                <button key={gp.id} type="button"
                                  onClick={() => { setSelectedGlobalProduct(gp); setCatalogQuery(''); setCatalogResults([]) }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition text-left border-b border-gray-100 dark:border-gray-800 last:border-0 bg-white dark:bg-gray-900">
                                  {gp.imageUrl
                                    ? <img src={gp.imageUrl} alt={gp.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
                                    : <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-gray-400" /></div>}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{gp.name}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                      {gp.category && <span className="mr-2">{gp.category}</span>}
                                      {gp.barcode && <span className="font-mono">{gp.barcode}</span>}
                                    </p>
                                  </div>
                                  <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">Usar →</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {catalogQuery.trim().length >= 2 && !catalogLoading && catalogResults.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">
                              Sin coincidencias en el catálogo — completa los campos de abajo para crear un producto nuevo.
                            </p>
                          )}
                        </div>
                      ) : (
                        /* ── Producto vinculado al catálogo ── */
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                          {selectedGlobalProduct.imageUrl
                            ? <img src={selectedGlobalProduct.imageUrl} alt={selectedGlobalProduct.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-blue-200 dark:border-blue-800" />
                            : <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-blue-500" /></div>}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate">{selectedGlobalProduct.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {selectedGlobalProduct.category && <span className="mr-2">{selectedGlobalProduct.category}</span>}
                              {selectedGlobalProduct.barcode && <span className="font-mono">{selectedGlobalProduct.barcode}</span>}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Nombre e imagen del catálogo global</p>
                          </div>
                          <button type="button" onClick={() => setSelectedGlobalProduct(null)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0">
                            <Unlink className="w-3.5 h-3.5" />Desvincular
                          </button>
                        </div>
                      )}

                      {/* ── Campos del formulario ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Nombre: solo cuando NO está vinculado al catálogo */}
                        {!selectedGlobalProduct && <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre *</label>
                          <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="text" value={productForm.name}
                              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                              placeholder="Ej: Pomada fijadora, Aceite de barba..."
                              className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent ${
                                productDupes.name
                                  ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-400'
                                  : 'border-gray-200 dark:border-gray-600 focus:ring-gray-900 dark:focus:ring-gray-100'
                              }`} />
                          </div>
                          {productDupes.name && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              Ya existe un producto con este nombre en tu tienda
                            </p>
                          )}
                        </div>}
                        {/* Categoría: solo cuando NO está vinculado al catálogo */}
                        {!selectedGlobalProduct && <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Categoría <span className="text-gray-400">(opcional)</span></label>
                          <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                            <select
                              value={productForm.category}
                              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent appearance-none"
                            >
                              <option value="">Selecciona categoría...</option>
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
                          </div>
                        </div>}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Stock inicial</label>
                          <input type="number" min="0" value={productForm.stock}
                            onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                            placeholder="0"
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Precio compra <span className="text-gray-400">(opcional)</span></label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="number" min="0" value={productForm.purchasePrice}
                              onChange={(e) => setProductForm({ ...productForm, purchasePrice: e.target.value })}
                              placeholder="0"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Precio venta *</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                            <input type="number" min="0" value={productForm.salePrice}
                              onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                              placeholder="0"
                              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent" />
                          </div>
                        </div>
                      </div>
                      {/* Descripción: solo local */}
                      {!selectedGlobalProduct && <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descripción <span className="text-gray-400">(opcional)</span></label>
                        <textarea value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          placeholder="Describe brevemente el producto..." rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none" />
                      </div>}
                      {/* Código de barras + SKU: solo local */}
                      {!selectedGlobalProduct && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            Código de barras <span className="text-gray-400">(opcional)</span>
                          </label>
                          <div className="flex gap-2">
                            <input type="text" value={productForm.barcode}
                              onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                              placeholder="Ej: 7802900000000"
                              className={`flex-1 min-w-0 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent font-mono ${
                                productDupes.barcode
                                  ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
                                  : 'border-gray-200 dark:border-gray-600 focus:ring-gray-900 dark:focus:ring-gray-100'
                              }`} />
                            <button
                              type="button"
                              onClick={() => { primeBeepAudio(); setProductScannerOpen(true) }}
                              title="Escanear código de barras"
                              className="flex-shrink-0 px-2.5 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
                            >
                              <ScanLine className="w-4 h-4" />
                            </button>
                          </div>
                          {productDupes.barcode && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              Este código de barras ya está asignado a otro producto
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            SKU <span className="text-gray-400">(opcional)</span>
                          </label>
                          <input type="text" value={productForm.sku}
                            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                            placeholder="Código interno"
                            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:border-transparent ${
                              productDupes.sku
                                ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
                                : 'border-gray-200 dark:border-gray-600 focus:ring-gray-900 dark:focus:ring-gray-100'
                            }`} />
                          {productDupes.sku && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              Este SKU ya está en uso por otro producto
                            </p>
                          )}
                        </div>
                      </div>}
                      {/* Imagen del producto: solo local */}
                      {!selectedGlobalProduct && <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          Imagen <span className="text-gray-400">(opcional)</span>
                        </label>
                        <input
                          ref={productImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProductImageChange}
                        />
                        <div className="flex items-center gap-3">
                          {productImagePreview ? (
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <img src={productImagePreview} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                              {uploadingProductImage && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => { setProductImagePreview(null); setProductForm(f => ({ ...f, imageUrl: '' })) }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 flex-shrink-0 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                              <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={uploadingProductImage}
                            onClick={() => productImageInputRef.current?.click()}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
                            {uploadingProductImage
                              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Subiendo...</>
                              : <><ShoppingBag className="w-3.5 h-3.5" />{productImagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}</>}
                          </button>
                        </div>
                      </div>}

                      {/* ── Ubicación en bodega (opcional) ── */}
                      {shelves.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Ubicación en bodega <span className="text-gray-400">(opcional)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {/* Selector de estantería */}
                            <select
                              value={slotPickerShelfId ?? ''}
                              onChange={e => {
                                const val = e.target.value ? Number(e.target.value) : null
                                setSlotPickerShelfId(val)
                                setProductForm(f => ({ ...f, shelfSlotId: null }))
                                if (val && !shelfGrids[val]) loadShelfGrid(val)
                              }}
                              className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                            >
                              <option value="">Sin estantería</option>
                              {shelves.map(s => (
                                <option key={s.id} value={s.id}>{s.name} (A–{String.fromCharCode(64 + s.rows)}{s.columns})</option>
                              ))}
                            </select>
                            {/* Selector de posición */}
                            {slotPickerShelfId && (
                              <select
                                value={productForm.shelfSlotId ?? ''}
                                onChange={e => setProductForm(f => ({ ...f, shelfSlotId: e.target.value ? Number(e.target.value) : null }))}
                                className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                              >
                                <option value="">Sin posición</option>
                                {shelfGridLoading === slotPickerShelfId
                                  ? <option disabled>Cargando...</option>
                                  : (shelfGrids[slotPickerShelfId]?.slots ?? []).map(slot => (
                                      <option key={slot.id} value={slot.id}>
                                        {slot.code}{slot.label ? ` — ${slot.label}` : ''}{slot.productId && slot.productId !== editingProductId ? ` (ocupado: ${slot.productName})` : ''}
                                      </option>
                                    ))
                                }
                              </select>
                            )}
                            {/* Quitar ubicación */}
                            {(slotPickerShelfId || productForm.shelfSlotId) && (
                              <button type="button"
                                onClick={() => { setSlotPickerShelfId(null); setProductForm(f => ({ ...f, shelfSlotId: -1 })) }}
                                className="text-xs text-gray-400 hover:text-red-500 transition px-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setProductForm(f => ({ ...f, active: !f.active }))}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${productForm.active ? 'border-green-400 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                          {productForm.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {productForm.active ? 'Activo (visible)' : 'Inactivo (oculto)'}
                        </button>
                      </div>
                      {productError && <p className="text-xs text-red-500">{productError}</p>}

                      {/* Preview ganancia */}
                      {productForm.salePrice && productForm.purchasePrice && Number(productForm.salePrice) > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-xs">
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-green-700 dark:text-green-300">
                            Ganancia estimada: <strong>${(Number(productForm.salePrice) - Number(productForm.purchasePrice)).toLocaleString()}</strong>
                            {' '}({Math.round(((Number(productForm.salePrice) - Number(productForm.purchasePrice)) / Number(productForm.salePrice)) * 100)}% margen)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                      <button type="button" onClick={closeProductForm}
                        className="text-sm px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        Cancelar
                      </button>
                      <button type="submit" disabled={savingProduct}
                        className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50">
                        {savingProduct
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando...</>
                          : <><Check className="w-3.5 h-3.5" />{editingProductId ? 'Guardar cambios' : 'Crear producto'}</>}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── Buscador + filtros ── */}
                {!showProductForm && products.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* buscador */}
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setProductPage(1) }}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                      />
                    </div>
                    {/* filtro categoría */}
                    <select
                      value={productCategoryFilter}
                      onChange={e => { setProductCategoryFilter(e.target.value); setProductPage(1) }}
                      className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600">
                      <option value="">Todas las categorías</option>
                      {[...new Set(products.map(p => p.category).filter(Boolean))].sort().map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {/* filtro estado */}
                    <select
                      value={productStatusFilter}
                      onChange={e => { setProductStatusFilter(e.target.value); setProductPage(1) }}
                      className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600">
                      <option value="all">Todos</option>
                      <option value="active">Activos</option>
                      <option value="inactive">Inactivos</option>
                    </select>
                  </div>
                )}

                {/* ── Tabla de productos ── */}
                {loadingProducts ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No hay productos en el inventario.
                    <br /><span className="text-xs">Agrega productos para gestionar tu stock y precios.</span>
                  </div>
                ) : (() => {
                  // filtrado
                  const q = productSearch.toLowerCase().trim()
                  const filtered = products.filter(p => {
                    if (productStatusFilter === 'active'   && !p.active) return false
                    if (productStatusFilter === 'inactive' &&  p.active) return false
                    if (productCategoryFilter && p.category !== productCategoryFilter) return false
                    if (q && !p.name.toLowerCase().includes(q) && !(p.barcode || '').toLowerCase().includes(q) && !(p.sku || '').toLowerCase().includes(q)) return false
                    return true
                  })
                  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE))
                  const safePage  = Math.min(productPage, totalPages)
                  const paginated = filtered.slice((safePage - 1) * PRODUCTS_PER_PAGE, safePage * PRODUCTS_PER_PAGE)

                  return (
                    <>
                      {filtered.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                          <Search className="w-7 h-7 mx-auto mb-2 opacity-30" />
                          Sin resultados para esa búsqueda.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              <tr>
                                <th className="px-2 sm:px-3 py-2.5 text-left w-10"></th>
                                <th className="px-2 sm:px-3 py-2.5 text-left">Producto</th>
                                <th className="px-2 sm:px-3 py-2.5 text-left hidden sm:table-cell">Categoría</th>
                                <th className="px-2 sm:px-3 py-2.5 text-center">Stock</th>
                                <th className="px-2 sm:px-3 py-2.5 text-right hidden md:table-cell">Compra</th>
                                <th className="px-2 sm:px-3 py-2.5 text-right">Venta</th>
                                <th className="px-2 sm:px-3 py-2.5 text-right hidden md:table-cell">Margen</th>
                                <th className="px-2 sm:px-3 py-2.5 text-center hidden sm:table-cell">Estado</th>
                                <th className="px-2 sm:px-3 py-2.5 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                              {paginated.map(product => (
                                <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition ${!product.active ? 'opacity-50' : ''}`}>
                                  {/* Miniatura */}
                                  <td className="px-2 sm:px-3 py-2.5">
                                    {product.imageUrl
                                      ? <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                                      : <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>}
                                  </td>
                                  {/* Nombre */}
                                  <td className="px-3 py-2.5 max-w-[180px]">
                                    <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">{product.name}</p>
                                    {product.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{product.description}</p>}
                                    {(product.barcode || product.sku) && (
                                      <p className="text-xs text-gray-300 dark:text-gray-600 truncate mt-0.5">
                                        {product.barcode && <span>#{product.barcode}</span>}
                                        {product.barcode && product.sku && ' · '}
                                        {product.sku && <span>SKU {product.sku}</span>}
                                      </p>
                                    )}
                                    {product.shelfSlotCode && (
                                      <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                                        <MapPin className="w-2.5 h-2.5" />{product.shelfName} {product.shelfSlotCode}
                                      </span>
                                    )}
                                  </td>
                                  {/* Categoría */}
                                  <td className="px-3 py-2.5 hidden sm:table-cell">
                                    {product.category
                                      ? <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{product.category}</span>
                                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                  </td>
                                  {/* Stock */}
                                  <td className="px-3 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {(product.stock ?? 0) < 5 && product.active && (
                                        <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                      )}
                                      <button
                                        onClick={() => handleAdjustStock(product.id, -1)}
                                        disabled={adjustingStockId === product.id || (product.stock ?? 0) <= 0}
                                        className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-30">
                                        <Minus className="w-2.5 h-2.5" />
                                      </button>
                                      <span className={`text-sm font-bold w-7 text-center ${(product.stock ?? 0) < 5 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-50'}`}>
                                        {adjustingStockId === product.id
                                          ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                                          : (product.stock ?? 0)}
                                      </span>
                                      <button
                                        onClick={() => handleAdjustStock(product.id, 1)}
                                        disabled={adjustingStockId === product.id}
                                        className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-30">
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </td>
                                  {/* Precio compra */}
                                  <td className="px-3 py-2.5 text-right hidden md:table-cell text-gray-500 dark:text-gray-400">
                                    {product.purchasePrice != null ? `$${product.purchasePrice.toLocaleString()}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                  </td>
                                  {/* Precio venta */}
                                  <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-50">
                                    ${product.salePrice?.toLocaleString()}
                                  </td>
                                  {/* Margen */}
                                  <td className="px-3 py-2.5 text-right hidden md:table-cell">
                                    {product.profit != null
                                      ? <span className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                          {product.profitMarginPct}%
                                        </span>
                                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                  </td>
                                  {/* Estado */}
                                  <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                                    {product.active
                                      ? <span className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Activo</span>
                                      : <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                                  </td>
                                  {/* Acciones */}
                                  <td className="px-3 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => openEditProduct(product)}
                                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <Pencil className="w-3.5 h-3.5" /><span className="hidden sm:inline">Editar</span>
                                      </button>
                                      <button onClick={() => handleDeleteProduct(product.id)}
                                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950">
                                        <Trash2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">{product.active ? 'Desactivar' : 'Activar'}</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* ── Paginador ── */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {filtered.length} productos · página {safePage} de {totalPages}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setProductPage(p => Math.max(1, p - 1))}
                              disabled={safePage === 1}
                              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition">
                              ‹ Anterior
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p =>
                              p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                            ).reduce((acc, p, idx, arr) => {
                              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                              acc.push(p)
                              return acc
                            }, []).map((item, idx) =>
                              item === '...'
                                ? <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-400">…</span>
                                : <button key={item}
                                    onClick={() => setProductPage(item)}
                                    className={`w-7 h-7 text-xs rounded-lg border transition ${safePage === item ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                    {item}
                                  </button>
                            )}
                            <button
                              onClick={() => setProductPage(p => Math.min(totalPages, p + 1))}
                              disabled={safePage === totalPages}
                              className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition">
                              Siguiente ›
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* ── Bodega / Estanterías ── */}
              {isProductShop && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  {/* Encabezado */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Archive className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Bodega / Estanterías</h3>
                      {shelves.length > 0 && (
                        <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                          {shelves.length} {shelves.length === 1 ? 'estantería' : 'estanterías'}
                        </span>
                      )}
                    </div>
                    <button onClick={openCreateShelf}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                      <Plus className="w-3.5 h-3.5" />Nueva estantería
                    </button>
                  </div>

                  {/* Formulario nueva / editar estantería */}
                  {showShelfForm && (
                    <form onSubmit={handleSaveShelf} className="mb-5 border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950 border-b border-indigo-100 dark:border-indigo-900">
                        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                          {editingShelf ? 'Editar estantería' : 'Nueva estantería'}
                        </p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre *</label>
                          <input
                            type="text"
                            value={shelfForm.name}
                            onChange={e => setShelfForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Ej: Estantería Principal, Bodega B"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Descripción <span className="text-gray-400">(opcional)</span></label>
                          <input
                            type="text"
                            value={shelfForm.description}
                            onChange={e => setShelfForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Ej: Cerca de la entrada, segundo piso"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                        {!editingShelf && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Filas (A → {String.fromCharCode(64 + Math.min(26, Math.max(1, shelfForm.rows)))})
                              </label>
                              <input
                                type="number" min={1} max={26}
                                value={shelfForm.rows}
                                onChange={e => setShelfForm(f => ({ ...f, rows: Math.min(26, Math.max(1, parseInt(e.target.value) || 1)) }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                Columnas (1 → {Math.min(50, Math.max(1, shelfForm.columns))})
                              </label>
                              <input
                                type="number" min={1} max={50}
                                value={shelfForm.columns}
                                onChange={e => setShelfForm(f => ({ ...f, columns: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                            </div>
                          </div>
                        )}
                        {!editingShelf && (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg px-3 py-2">
                            Se crearán <strong>{shelfForm.rows * shelfForm.columns}</strong> posiciones: A1 → {String.fromCharCode(64 + Math.min(26, shelfForm.rows))}{shelfForm.columns}
                          </p>
                        )}
                      </div>
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                        <button type="button" onClick={() => setShowShelfForm(false)}
                          className="text-sm px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                          Cancelar
                        </button>
                        <button type="submit" disabled={shelfFormSaving}
                          className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                          {shelfFormSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando...</> : <><Check className="w-3.5 h-3.5" />{editingShelf ? 'Guardar cambios' : 'Crear estantería'}</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Lista vacía */}
                  {!shelvesLoading && shelves.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                      <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Sin estanterías configuradas.
                      <br /><span className="text-xs">Crea una estantería para organizar tu bodega.</span>
                    </div>
                  )}

                  {/* Estanterías */}
                  <div className="space-y-3">
                    {shelves.map(shelf => {
                      const isExpanded = expandedShelfId === shelf.id
                      const grid = shelfGrids[shelf.id]
                      const isLoadingGrid = shelfGridLoading === shelf.id
                      // Generar encabezados de columnas: 1..columns
                      const colHeaders = Array.from({ length: shelf.columns }, (_, i) => i + 1)
                      // Generar filas: A, B, C...
                      const rowLetters = Array.from({ length: shelf.rows }, (_, i) => String.fromCharCode(65 + i))

                      return (
                        <div key={shelf.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          {/* Cabecera de la estantería */}
                          <div
                            className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition"
                            onClick={() => toggleShelfExpand(shelf.id)}
                          >
                            <div className="flex items-center gap-3">
                              <LayoutGrid className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{shelf.name}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {shelf.rows} filas × {shelf.columns} col · {shelf.occupiedSlots}/{shelf.totalSlots} ocupadas
                                  {shelf.description && ` · ${shelf.description}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Barra de ocupación */}
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                    style={{ width: `${shelf.totalSlots > 0 ? Math.round((shelf.occupiedSlots / shelf.totalSlots) * 100) : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">{shelf.totalSlots > 0 ? Math.round((shelf.occupiedSlots / shelf.totalSlots) * 100) : 0}%</span>
                              </div>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); openEditShelf(shelf) }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleDeleteShelf(shelf) }}
                                className="text-gray-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50 dark:hover:bg-red-950">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                          </div>

                          {/* Grilla expandida */}
                          {isExpanded && (
                            <div className="p-5">
                              {isLoadingGrid ? (
                                <div className="flex justify-center py-10">
                                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                </div>
                              ) : grid ? (
                                <div className="space-y-7">
                                  {rowLetters.map(rowLetter => (
                                    <div key={rowLetter}>
                                      {/* Encabezado de fila */}
                                      <div className="flex items-center gap-3 mb-3">
                                        <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-bold text-sm text-indigo-700 dark:text-indigo-300 flex-shrink-0 shadow-sm">
                                          {rowLetter}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                      </div>

                                      {/* Tarjetas de slots */}
                                      <div className="flex flex-wrap gap-3">
                                        {colHeaders.map(c => {
                                          const code = `${rowLetter}${c}`
                                          const slot = grid.slots.find(s => s.code === code)
                                          if (!slot) return null
                                          const slotProducts = slot.products ?? []
                                          const isEmpty = slotProducts.length === 0
                                          return (
                                            <div
                                              key={c}
                                              onClick={() => openSlotModal(slot, shelf)}
                                              className={`relative rounded-xl border-2 flex flex-col cursor-pointer transition-all duration-200 select-none ${
                                                isEmpty
                                                  ? 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 w-40 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:shadow-md'
                                                  : 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 w-40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:scale-[1.02]'
                                              }`}
                                              style={{ minHeight: '140px' }}
                                            >
                                              {/* Cabecera */}
                                              <div className={`flex items-center justify-between px-3 py-2 rounded-t-[10px] ${isEmpty ? 'bg-gray-100 dark:bg-gray-800' : 'bg-indigo-100 dark:bg-indigo-900/70'}`}>
                                                <span className={`font-mono font-bold text-xs tracking-wide ${isEmpty ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-700 dark:text-indigo-300'}`}>{code}</span>
                                                {!isEmpty && (
                                                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">{slotProducts.length} prod.</span>
                                                )}
                                              </div>

                                              {/* Cuerpo */}
                                              <div className="flex-1 flex flex-col p-2.5">
                                                {isEmpty ? (
                                                  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-gray-300 dark:text-gray-600 p-2">
                                                    <Plus className="w-6 h-6" />
                                                    <span className="text-xs font-medium text-center leading-tight">Agregar<br/>producto</span>
                                                  </div>
                                                ) : (
                                                  /* Vista previa compacta de productos */
                                                  <div className="flex flex-col gap-1.5">
                                                    {slotProducts.slice(0, 3).map(sp => (
                                                      <div key={sp.productId} className="flex items-center gap-1.5">
                                                        {sp.productImageUrl
                                                          ? <img src={sp.productImageUrl} alt={sp.productName} className="w-7 h-7 rounded-lg object-cover border border-indigo-200 dark:border-indigo-700 flex-shrink-0" />
                                                          : <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center border border-indigo-200 dark:border-indigo-700 flex-shrink-0"><Package className="w-3.5 h-3.5 text-indigo-400" /></div>
                                                        }
                                                        <p className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate leading-tight flex-1">{sp.productName}</p>
                                                      </div>
                                                    ))}
                                                    {slotProducts.length > 3 && (
                                                      <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-medium pl-0.5">+{slotProducts.length - 3} más</p>
                                                    )}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Etiqueta editable (clic no propaga al modal) */}
                                              <div className="px-2.5 pb-2" onClick={e => e.stopPropagation()}>
                                                {editingLabelSlotId === slot.id ? (
                                                  <div className="flex gap-1">
                                                    <input
                                                      autoFocus
                                                      type="text"
                                                      value={labelDraft}
                                                      onChange={e => setLabelDraft(e.target.value)}
                                                      onKeyDown={e => { if (e.key === 'Enter') handleSaveSlotLabel(slot.id); if (e.key === 'Escape') setEditingLabelSlotId(null) }}
                                                      placeholder="Etiqueta..."
                                                      className="flex-1 text-xs px-2 py-1 border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none min-w-0"
                                                    />
                                                    <button onClick={() => handleSaveSlotLabel(slot.id)} className="text-green-600 hover:text-green-700 transition p-1"><Check className="w-3 h-3" /></button>
                                                    <button onClick={() => setEditingLabelSlotId(null)} className="text-gray-400 hover:text-gray-600 transition p-1"><X className="w-3 h-3" /></button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => { setEditingLabelSlotId(slot.id); setLabelDraft(slot.label || '') }}
                                                    className="w-full text-left text-[10px] text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition truncate border-t border-gray-100 dark:border-gray-800 pt-1.5 mt-0.5"
                                                  >
                                                    {slot.label ? slot.label : <span className="italic opacity-50">+ etiqueta</span>}
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Barberos ── */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Profesionales ({shop.barbers?.length ?? 0})</h3>
                  <div className="flex items-center gap-2">
                    {myBarberProfile && !(shop.barbers ?? []).some((b) => b.id === myBarberProfile.id) && (
                      <button onClick={() => handleAddBarber(myBarberProfile.id)} disabled={addingId === myBarberProfile.id}
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50">
                        <UserPlus className="w-3.5 h-3.5" />
                        {addingId === myBarberProfile.id ? 'Agregando...' : 'Agregarme'}
                      </button>
                    )}
                    <button
                      onClick={() => { setShowSearch(!showSearch); setQuery(''); setSearchResults([]) }}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${showSearch ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'}`}>
                      {showSearch ? <><X className="w-3.5 h-3.5" />Cerrar</> : <><UserPlus className="w-3.5 h-3.5" />Agregar profesional</>}
                    </button>
                  </div>
                </div>

                {/* Buscador */}
                {showSearch && (
                  <div className="mb-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <input type="text" autoFocus value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar profesional por nombre..."
                        className="flex-1 bg-transparent text-sm dark:text-gray-100 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500" />
                      {searching && <div className="w-4 h-4 border-2 border-gray-200 dark:border-gray-700 border-t-gray-500 dark:border-t-gray-300 rounded-full animate-spin flex-shrink-0" />}
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {!searching && searchResults.length === 0 && (
                        <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
                          {query.trim() ? 'No se encontraron profesionales con ese nombre' : 'Escribe un nombre para buscar profesionales registrados'}
                        </div>
                      )}
                      {searchResults.map((barber) => (
                        <div key={barber.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-3">
                            {barber.imageUrl
                              ? <img src={barber.imageUrl} alt={barber.name} className="w-9 h-9 rounded-full object-cover" />
                              : <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Users className="w-4 h-4 text-gray-400 dark:text-gray-500" /></div>}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{barber.name}</p>
                              {barber.bio && <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{barber.bio}</p>}
                            </div>
                          </div>
                          <button onClick={() => handleAddBarber(barber.id)} disabled={addingId === barber.id}
                            className="text-xs px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition disabled:opacity-50 whitespace-nowrap">
                            {addingId === barber.id ? 'Agregando...' : 'Agregar'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400">Solo aparecen profesionales registrados en la plataforma.</p>
                    </div>
                  </div>
                )}

                {/* Lista de barberos con panel de horarios */}
                {(shop.barbers?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Aún no hay profesionales en este negocio.
                    <br /><span className="text-xs">Agrega profesionales registrados usando el buscador.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {shop.barbers.map((barber) => (
                      <div key={barber.id}>
                        {/* Fila principal del barbero */}
                        <div className="flex items-center justify-between py-3.5">
                          <div className="flex items-center gap-3">
                            {barber.imageUrl
                              ? <img src={barber.imageUrl} alt={barber.name} className="w-10 h-10 rounded-full object-cover" />
                              : <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Users className="w-4 h-4 text-gray-500 dark:text-gray-400" /></div>}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{barber.name}</p>
                                {myBarberProfile && barber.id === myBarberProfile.id && (
                                  <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">Tú</span>
                                )}
                                {barber.userId ? (
                                  <span className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                    <UserCheck className="w-3 h-3" />Cuenta vinculada
                                  </span>
                                ) : (
                                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                                    Sin cuenta
                                  </span>
                                )}
                              </div>
                              {barber.bio && <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">{barber.bio}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                            {/* Botón crear/desvincular cuenta */}
                            {!barber.userId ? (
                              <button
                                onClick={() => openAccountModal(barber)}
                                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                title="Crear cuenta de app para este profesional"
                              >
                                <KeyRound className="w-3.5 h-3.5" />Crear cuenta
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnlinkBarberAccount(barber.id, barber.name)}
                                disabled={unlinkingId === barber.id}
                                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition px-2 py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-950 disabled:opacity-50"
                                title="Desvincular cuenta de app"
                              >
                                {unlinkingId === barber.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Unlink className="w-3.5 h-3.5" />}
                                Desvincular
                              </button>
                            )}
                            {/* Botón horarios */}
                            <button
                              onClick={() => toggleSchedule(barber.id)}
                              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                                expandedSchedule === barber.id
                                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Horarios
                              {expandedSchedule === barber.id
                                ? <ChevronUp className="w-3 h-3" />
                                : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button onClick={() => handleRemoveBarber(barber.id)}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950">
                              <UserMinus className="w-3.5 h-3.5" />Quitar
                            </button>
                          </div>
                        </div>

                        {/* Panel de horarios expandible */}
                        {expandedSchedule === barber.id && (
                          <SchedulePanel
                            schedules={schedules[barber.id] ?? []}
                            loading={loadingSchedules[barber.id] ?? false}
                            schedForm={schedForm}
                            setSchedForm={setSchedForm}
                            saving={savingSched}
                            deletingId={deletingSchedId}
                            onAdd={() => handleAddSchedule(barber.id)}
                            onDelete={(sid) => handleDeleteSchedule(barber.id, sid)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal: crear cuenta para profesional ── */}
      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-950 border-b border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                  Crear cuenta para {accountModal.barber.name}
                </h3>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                Se generará una contraseña temporal y se enviará por email al profesional.
              </p>
            </div>

            {/* Cuerpo */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                  Email del profesional *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBarberAccount()}
                    placeholder="email@ejemplo.com"
                    autoFocus
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                  RUT <span className="text-gray-400 dark:text-gray-500">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={accountRut}
                  onChange={(e) => setAccountRut(e.target.value)}
                  placeholder="12345678-9"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ El profesional recibirá un email con sus credenciales provisionales y deberá cambiar la contraseña al primer inicio de sesión.
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={closeAccountModal}
                disabled={creatingAccount}
                className="text-sm px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateBarberAccount}
                disabled={creatingAccount || !accountEmail.trim()}
                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {creatingAccount
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</>
                  : <><KeyRound className="w-4 h-4" />Crear cuenta</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel de horarios ─────────────────────────────────────────────────────────

function SchedulePanel({ schedules, loading, schedForm, setSchedForm, saving, deletingId, onAdd, onDelete }) {
  return (
    <div className="mb-4 ml-0 sm:ml-[52px] bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Horario en este negocio
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Si tiene citas en otro negocio con menos de 30 min de diferencia, el sistema mostrará un aviso al reservar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-5">
          <div className="w-5 h-5 border-2 border-amber-200 dark:border-amber-800 border-t-amber-600 dark:border-t-amber-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {/* Entradas existentes */}
          {schedules.length === 0 ? (
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 text-center py-1">
              Sin horario configurado aún. Agrega los turnos de abajo.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...schedules]
                .sort((a, b) => {
                  const order = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
                  return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek)
                })
                .map((s) => (
                  <div key={s.id}
                    className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5 text-xs shadow-sm">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{DAY_LABEL[s.dayOfWeek] ?? s.dayOfWeek}</span>
                    <span className="text-gray-400 dark:text-gray-500">·</span>
                    <span className="text-gray-600 dark:text-gray-300 font-mono tabular-nums">
                      {String(s.startTime).substring(0, 5)} – {String(s.endTime).substring(0, 5)}
                    </span>
                    <button onClick={() => onDelete(s.id)} disabled={deletingId === s.id}
                      className="ml-1 text-red-300 hover:text-red-500 transition disabled:opacity-40">
                      {deletingId === s.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <X className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Formulario agregar turno */}
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="flex-1 min-w-28">
              <label className="block text-xs text-amber-800 dark:text-amber-300 mb-1 font-medium">Día</label>
              <select
                value={schedForm.dayOfWeek}
                onChange={(e) => setSchedForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                className="w-full text-xs border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-amber-800 dark:text-amber-300 mb-1 font-medium">Desde</label>
              <input type="time" value={schedForm.startTime}
                onChange={(e) => setSchedForm(f => ({ ...f, startTime: e.target.value }))}
                className="text-xs border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs text-amber-800 dark:text-amber-300 mb-1 font-medium">Hasta</label>
              <input type="time" value={schedForm.endTime}
                onChange={(e) => setSchedForm(f => ({ ...f, endTime: e.target.value }))}
                className="text-xs border border-amber-200 dark:border-amber-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <button onClick={onAdd} disabled={saving}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 whitespace-nowrap">
              {saving ? <><Loader2 className="w-3 h-3 animate-spin" />Guardando...</> : <><Plus className="w-3 h-3" />Agregar turno</>}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ── Modal de detalle de slot ── */}
    {slotModal && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closeSlotModal}
      >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xl text-indigo-700 dark:text-indigo-300">{slotModal.code}</span>
                  <span className="text-gray-200 dark:text-gray-700">·</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{slotModal.shelfName}</span>
                </div>
                {modalSlot?.label && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">{modalSlot.label}</p>
                )}
                {modalProducts.length > 0 && (
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mt-1">{modalProducts.length} producto{modalProducts.length !== 1 ? 's' : ''} en este slot</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeSlotModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
              {modalProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600">
                  <Package className="w-14 h-14 mb-3" />
                  <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">Slot vacío</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1 text-center">Agregá productos para ubicarlos aquí</p>
                </div>
              ) : (
                modalProducts.map(sp => (
                  <div
                    key={sp.productId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition group"
                  >
                    {sp.productImageUrl
                      ? <img src={sp.productImageUrl} alt={sp.productName} className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-200 dark:border-indigo-700 flex-shrink-0 shadow-sm" />
                      : <div className="w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center border-2 border-indigo-100 dark:border-indigo-800 flex-shrink-0">
                          <Package className="w-8 h-8 text-indigo-300 dark:text-indigo-600" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-50 leading-snug">{sp.productName}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">{sp.productStock ?? 0} uds.</span>
                        {sp.productSalePrice != null && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">${sp.productSalePrice.toLocaleString('es-CL')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={slotAssigning}
                      onClick={() => handleModalRemove(sp.productId)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-30"
                      title="Quitar del slot">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer: agregar producto */}
            <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex-shrink-0">
              {slotModalAssigning ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={slotModalSearch}
                    onChange={e => setSlotModalSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="text-sm px-3 py-2.5 border border-indigo-300 dark:border-indigo-600 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none w-full focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
                  />
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 -mx-1 px-1">
                    {modalAvailable.slice(0, 25).map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        disabled={slotAssigning}
                        onClick={() => handleModalAssign(prod.id)}
                        className="text-left text-sm px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/60 text-gray-700 dark:text-gray-200 transition flex items-center gap-3 disabled:opacity-50">
                        {prod.imageUrl
                          ? <img src={prod.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700" />
                          : <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-gray-400" /></div>}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{prod.name}</span>
                          <span className="text-xs text-gray-400">{prod.stock ?? 0} uds.{prod.salePrice ? ` · $${prod.salePrice.toLocaleString('es-CL')}` : ''}</span>
                        </div>
                      </button>
                    ))}
                    {modalAvailable.length === 0 && (
                      <p className="text-sm text-gray-400 italic px-3 py-4 text-center">Sin resultados</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSlotModalAssigning(false); setSlotModalSearch('') }}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition text-center py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSlotModalAssigning(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 border-2 border-dashed border-indigo-200 dark:border-indigo-700 hover:border-indigo-400">
                  <Plus className="w-4 h-4" />
                  Agregar producto al slot
                </button>
              )}
            </div>
          </div>
        </div>
    )}
    </>
  )
}

export default ShopDetail
