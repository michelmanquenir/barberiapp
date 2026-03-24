// En desarrollo: VITE_API_URL no se define → BASE_URL='/api' → proxy de Vite lo redirige al backend local
// En producción: VITE_API_URL='https://tu-backend.onrender.com' → llamadas van directo al backend
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`

const STORAGE_KEY = 'barbershop_auth'

function getAuthHeader() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    const { token } = JSON.parse(stored)
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    ...options,
  })
  if (!response.ok) {
    let message = `Error API: ${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  // DELETE puede retornar vacío
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null
  }
  return response.json()
}

export const api = {
  // Auth
  login: (data) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Servicios globales (legacy)
  getServices: () => request('/services'),

  // Servicios por barbería
  getShopServices: (shopId) => request(`/shops/${shopId}/services`),
  createShopService: (shopId, data) =>
    request(`/shops/${shopId}/services`, { method: 'POST', body: JSON.stringify(data) }),
  updateShopService: (shopId, serviceId, data) =>
    request(`/shops/${shopId}/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShopService: (shopId, serviceId) =>
    request(`/shops/${shopId}/services/${serviceId}`, { method: 'DELETE' }),

  // Barberos
  getBarbers: (shopId) => request(shopId ? `/barbers?shopId=${shopId}` : '/barbers'),
  getMyBarberProfile: () => request('/barbers/me'),
  searchBarbers: (q) => request(`/barbers/search?q=${encodeURIComponent(q ?? '')}`),
  createBarberProfile: (data) =>
    request('/barbers', { method: 'POST', body: JSON.stringify(data) }),

  // Horarios de barberos
  getBarberSchedules: ({ barberId, shopId } = {}) => {
    const params = new URLSearchParams()
    if (barberId) params.set('barberId', barberId)
    if (shopId)   params.set('shopId',   shopId)
    return request(`/barber-schedules?${params}`)
  },
  createBarberSchedule: (data) =>
    request('/barber-schedules', { method: 'POST', body: JSON.stringify(data) }),
  deleteBarberSchedule: (id) =>
    request(`/barber-schedules/${id}`, { method: 'DELETE' }),
  checkScheduleConflict: ({ barberId, shopId, date, time, durationMinutes = 30 }) => {
    const params = new URLSearchParams({ barberId, shopId, date, time, durationMinutes })
    return request(`/barber-schedules/conflict-check?${params}`)
  },

  // Negocios (Shops)
  getAllShops: () => request('/shops'),
  getMyShops: () => request('/shops/my'),
  createShop: (data) =>
    request('/shops', { method: 'POST', body: JSON.stringify(data) }),
  getShopById: (shopId) => request(`/shops/id/${shopId}`),
  updateShop: (shopId, data) =>
    request(`/shops/${shopId}`, { method: 'PUT', body: JSON.stringify(data) }),
  getShopBySlug: (slug) => request(`/shops/${slug}`),
  getShopBarbers: (slug) => request(`/shops/${slug}/barbers`),
  addBarberToShop: (shopId, barberId) =>
    request(`/shops/${shopId}/members/${barberId}`, { method: 'POST' }),
  removeBarberFromShop: (shopId, barberId) =>
    request(`/shops/${shopId}/members/${barberId}`, { method: 'DELETE' }),

  // Citas
  getAppointments: (userId) => request(`/appointments?userId=${userId}`),
  getShopAppointments: (shopId) => request(`/appointments/shop/${shopId}`),
  getBookedBarbers: (shopId, date, time, durationMinutes = 30) =>
    request(`/appointments/booked-barbers?shopId=${shopId}&date=${date}&time=${encodeURIComponent(time)}&durationMinutes=${durationMinutes}`),
  createAppointment: (data) =>
    request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  // Barbero agenda cita para un cliente (sin restricción de 15 min)
  barberCreateAppointment: (data) =>
    request('/appointments/barber', { method: 'POST', body: JSON.stringify(data) }),
  cancelAppointment: (id, userId) =>
    request(`/appointments/${id}/cancel?userId=${userId}`, { method: 'PUT' }),
  cancelByBarber: (id) =>
    request(`/appointments/${id}/cancel-by-barber`, { method: 'PUT' }),
  confirmAppointment: (id) =>
    request(`/appointments/${id}/confirm`, { method: 'PUT' }),
  completeAppointment: (id) =>
    request(`/appointments/${id}/complete`, { method: 'PUT' }),
  noShowAppointment: (id) =>
    request(`/appointments/${id}/no-show`, { method: 'PUT' }),

  // Reseñas
  createReview: (data) =>
    request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  getBarberReviews: (barberId) => request(`/reviews/barber/${barberId}`),
  getShopReviews: (shopId) => request(`/reviews/shop/${shopId}`),
  getClientReviews: (userId) => request(`/reviews/client/${userId}`),
  getAppointmentReviews: (appointmentId) => request(`/reviews/appointment/${appointmentId}`),

  // Favoritos (barberos)
  getFavorites: (userId) => request(`/favorites?userId=${userId}`),
  addFavorite: (barberId, userId) =>
    request(`/favorites/${barberId}?userId=${userId}`, { method: 'POST' }),
  removeFavorite: (id, userId) =>
    request(`/favorites/${id}?userId=${userId}`, { method: 'DELETE' }),

  // Favoritos (shops)
  getFavoriteShops: (userId) => request(`/favorite-shops?userId=${userId}`),
  addFavoriteShop: (shopId, userId) =>
    request(`/favorite-shops/${shopId}?userId=${userId}`, { method: 'POST' }),
  removeFavoriteShop: (id, userId) =>
    request(`/favorite-shops/${id}?userId=${userId}`, { method: 'DELETE' }),

  // ── Productos / Inventario por barbería ────────────────────────────────────

  // Público: productos activos de una barbería
  getShopProducts: (shopId) => request(`/shops/${shopId}/products`),

  // Admin: todos los productos (activos + inactivos)
  getAdminProducts: (shopId) => request(`/admin/shops/${shopId}/products`),
  createProduct: (shopId, data) =>
    request(`/admin/shops/${shopId}/products`, { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (productId, data) =>
    request(`/admin/products/${productId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (productId) =>
    request(`/admin/products/${productId}`, { method: 'DELETE' }),
  adjustStock: (productId, delta) =>
    request(`/admin/products/${productId}/stock?delta=${delta}`, { method: 'PATCH' }),

  // Estadísticas de negocio
  getShopStats: (shopId, days = 30) =>
    request(`/admin/shops/${shopId}/stats?days=${days}`),

  // POS — buscar producto por código de barras
  getProductByBarcode: (shopId, barcode) =>
    request(`/admin/shops/${shopId}/products/barcode/${encodeURIComponent(barcode)}`),

  // Catálogo global de productos
  searchGlobalProducts: (q = '', limit = 20) =>
    request(`/admin/global-products?q=${encodeURIComponent(q)}&limit=${limit}`),
  findGlobalProductByBarcode: (barcode) =>
    request(`/admin/global-products/barcode/${encodeURIComponent(barcode)}`),
  createGlobalProduct: (data) =>
    request('/admin/global-products', { method: 'POST', body: JSON.stringify(data) }),
  updateGlobalProduct: (id, data) =>
    request(`/admin/global-products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Pedidos (negocios de producto) ────────────────────────────────────────
  createOrder: (data) =>
    request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMyOrders: () => request('/orders/my'),
  cancelOrder: (orderId) =>
    request(`/orders/${orderId}/cancel`, { method: 'PUT' }),
  getShopOrders: (shopId) => request(`/admin/shops/${shopId}/orders`),
  updateOrderStatus: (orderId, status) =>
    request(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Perfil
  getProfile: (userId) => request(`/profile?userId=${userId}`),
  updateProfile: (userId, data) =>
    request(`/profile?userId=${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Barbero — imagen de perfil
  updateBarberImage: (imageUrl) =>
    request('/barbers/me/image', { method: 'PATCH', body: JSON.stringify({ imageUrl }) }),

  // Wallet
  getBalance: (userId) => request(`/wallet/balance?userId=${userId}`),
  getTransactions: (userId) => request(`/wallet/transactions?userId=${userId}`),
  addFunds: (userId, amount) =>
    request(`/wallet/add-funds?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // Galerías de barbero (privado — barbero autenticado)
  getMyGalleries: () => request('/barbers/me/galleries'),
  getMyGallery: (galleryId) => request(`/barbers/me/galleries/${galleryId}`),
  createGallery: (data) =>
    request('/barbers/me/galleries', { method: 'POST', body: JSON.stringify(data) }),
  updateGallery: (galleryId, data) =>
    request(`/barbers/me/galleries/${galleryId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGallery: (galleryId) =>
    request(`/barbers/me/galleries/${galleryId}`, { method: 'DELETE' }),
  addGalleryImage: (galleryId, data) =>
    request(`/barbers/me/galleries/${galleryId}/images`, { method: 'POST', body: JSON.stringify(data) }),
  deleteGalleryImage: (galleryId, imageId) =>
    request(`/barbers/me/galleries/${galleryId}/images/${imageId}`, { method: 'DELETE' }),

  // Galerías de barbero (público)
  getBarberGalleries: (barberId) => request(`/barbers/${barberId}/galleries`),

  // ── Suscripciones ──────────────────────────────────────────────────────────

  // Planes públicos de una barbería (para clientes)
  getShopSubscriptionPlans: (shopId) => request(`/shops/${shopId}/subscription-plans`),

  // Admin — gestión de planes
  getAdminSubscriptionPlans: (shopId) => request(`/admin/shops/${shopId}/subscription-plans`),
  createSubscriptionPlan: (shopId, data) =>
    request(`/admin/shops/${shopId}/subscription-plans`, { method: 'POST', body: JSON.stringify(data) }),
  updateSubscriptionPlan: (planId, data) =>
    request(`/admin/subscription-plans/${planId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubscriptionPlan: (planId) =>
    request(`/admin/subscription-plans/${planId}`, { method: 'DELETE' }),
  getShopSubscribers: (shopId) => request(`/admin/shops/${shopId}/subscribers`),
  getShopSubscriptionHistory: (shopId) => request(`/admin/shops/${shopId}/subscriptions/history`),

  // Cliente — suscribirse y consultar
  subscribe: (planId) =>
    request(`/subscriptions/subscribe/${planId}`, { method: 'POST' }),
  getMySubscriptions: () => request('/subscriptions/me'),
  getMyActiveSubscription: (shopId) =>
    request(`/subscriptions/me/active?shopId=${shopId}`),

  // Categorías de negocio (público — sin auth)
  getCategories: () => request('/categories'),

  // Super Admin
  superAdmin: {
    // Stats
    getStats: () => request('/super-admin/stats'),

    // Usuarios
    listUsers: () => request('/super-admin/users'),
    listByStatus: (status) => request(`/super-admin/users/status/${status}`),
    approveUser: (userId) => request(`/super-admin/users/${userId}/approve`, { method: 'PUT' }),
    rejectUser: (userId) => request(`/super-admin/users/${userId}/reject`, { method: 'PUT' }),
    getUser: (userId) => request(`/super-admin/users/${userId}`),

    // Negocios
    listShops: () => request('/super-admin/shops'),
    listShopsByStatus: (status) => request(`/super-admin/shops/status/${status}`),
    approveShop: (shopId) => request(`/super-admin/shops/${shopId}/approve`, { method: 'PUT' }),
    rejectShop: (shopId) => request(`/super-admin/shops/${shopId}/reject`, { method: 'PUT' }),

    // Productos
    listProducts: () => request('/super-admin/products'),
    listProductsByStatus: (status) => request(`/super-admin/products/status/${status}`),
    approveProduct: (productId) => request(`/super-admin/products/${productId}/approve`, { method: 'PUT' }),
    rejectProduct: (productId) => request(`/super-admin/products/${productId}/reject`, { method: 'PUT' }),

    // Categorías de negocio
    listCategories: () => request('/super-admin/categories'),
    createCategory: (data) =>
      request('/super-admin/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) =>
      request(`/super-admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) =>
      request(`/super-admin/categories/${id}`, { method: 'DELETE' }),

    // Catálogo global (super admin)
    listGlobalProducts: (q = '', page = 0, size = 20) =>
      request(`/super-admin/global-products?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),

    // Categorías de producto
    listProductCategories: () => request('/super-admin/product-categories'),
    createProductCategory: (data) =>
      request('/super-admin/product-categories', { method: 'POST', body: JSON.stringify(data) }),
    updateProductCategory: (id, data) =>
      request(`/super-admin/product-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProductCategory: (id) =>
      request(`/super-admin/product-categories/${id}`, { method: 'DELETE' }),
  },

  // Categorías de producto (público — para el formulario de productos)
  getProductCategories: () => request('/product-categories'),
}