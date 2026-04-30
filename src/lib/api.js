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

/**
 * Wrapper de fetch con retry automático SOLO para errores de red
 * (Failed to fetch / Load failed / NetworkError).
 * Errores HTTP (401, 404, 500…) NO se reintentan.
 */
async function request(path, options = {}) {
  const MAX_RETRIES = 2

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        ...options,
      })
    } catch (err) {
      // Error de red (backend dormido, timeout, sin conexión)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
        continue
      }
      throw err // Último intento: propagar error original
    }

    // Respuesta HTTP recibida — nunca reintentar estos
    if (!response.ok) {
      // 401 / 403 con token guardado → sesión expirada
      if (response.status === 401 || response.status === 403) {
        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const { token } = JSON.parse(stored)
            if (token) {
              window.dispatchEvent(new CustomEvent('auth:expired'))
              throw new Error('Sesión expirada')
            }
          }
        } catch (innerErr) {
          if (innerErr.message === 'Sesión expirada') throw innerErr
          // Si falla el parse, continuar con el error normal
        }
      }

      let message = `Error API: ${response.status} ${response.statusText}`
      try {
        const body = await response.json()
        if (body?.message) message = body.message
        else if (body?.error) message = body.error
      } catch { /* ignore */ }
      throw new Error(message)
    }
    // DELETE puede retornar vacío
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null
    }
    return response.json()
  }
}

export const api = {
  // Auth
  login: (data) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

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
  getMyBarberShops: () => request('/barbers/me/shops'),
  searchBarbers: (q) => request(`/barbers/search?q=${encodeURIComponent(q ?? '')}`),
  createBarberProfile: (data) =>
    request('/barbers', { method: 'POST', body: JSON.stringify(data) }),

  // Admin: cuentas de empleados/barberos
  createBarberAccount: (shopId, barberId, email, rut = null) =>
    request(`/barbers/admin/shops/${shopId}/barbers/${barberId}/account`, {
      method: 'POST',
      body: JSON.stringify({ email, rut }),
    }),
  unlinkBarberAccount: (shopId, barberId) =>
    request(`/barbers/admin/shops/${shopId}/barbers/${barberId}/account`, {
      method: 'DELETE',
    }),

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
  getMyBarberAppointments: () => request('/appointments/me/barber'),
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
  getOrderReviews: (orderId) => request(`/reviews/order/${orderId}`),

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
  permanentDeleteProduct: (productId) =>
    request(`/admin/products/${productId}/permanent`, { method: 'DELETE' }),
  adjustStock: (productId, delta) =>
    request(`/admin/products/${productId}/stock?delta=${delta}`, { method: 'PATCH' }),

  // Estadísticas de negocio
  getShopStats: (shopId, days = 30) =>
    request(`/admin/shops/${shopId}/stats?days=${days}`),

  // POS — buscar producto por código de barras
  getProductByBarcode: (shopId, barcode) =>
    request(`/admin/shops/${shopId}/products/barcode/${encodeURIComponent(barcode)}`),

  // Asignar / quitar slot de bodega a un producto
  assignProductSlot: (productId, slotId) =>
    request(`/admin/products/${productId}/slot`, { method: 'PATCH', body: JSON.stringify({ slotId }) }),

  // ── Bodega / Estanterías ──────────────────────────────────────────────────
  getShelves:      (shopId)                  => request(`/admin/shops/${shopId}/shelves`),
  getShelfGrid:    (shopId, shelfId)         => request(`/admin/shops/${shopId}/shelves/${shelfId}/grid`),
  createShelf:     (shopId, data)            => request(`/admin/shops/${shopId}/shelves`, { method: 'POST', body: JSON.stringify(data) }),
  updateShelf:     (shopId, shelfId, data)   => request(`/admin/shops/${shopId}/shelves/${shelfId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShelf:     (shopId, shelfId)         => request(`/admin/shops/${shopId}/shelves/${shelfId}`, { method: 'DELETE' }),
  updateSlotLabel: (shopId, slotId, label)   => request(`/admin/shops/${shopId}/shelf-slots/${slotId}/label`, { method: 'PATCH', body: JSON.stringify({ label }) }),

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

  // ── Transporte ─────────────────────────────────────────────────────────────

  // Admin — Eventos
  getTransportEvents: (shopId) => request(`/admin/shops/${shopId}/transport/events`),
  createTransportEvent: (shopId, data) =>
    request(`/admin/shops/${shopId}/transport/events`, { method: 'POST', body: JSON.stringify(data) }),
  updateTransportEvent: (shopId, eventId, data) =>
    request(`/admin/transport/events/${eventId}?shopId=${shopId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransportEvent: (shopId, eventId) =>
    request(`/admin/transport/events/${eventId}?shopId=${shopId}`, { method: 'DELETE' }),

  // Admin — Conductores
  getTransportDrivers: (shopId) => request(`/admin/shops/${shopId}/transport/drivers`),
  createTransportDriver: (shopId, data) =>
    request(`/admin/shops/${shopId}/transport/drivers`, { method: 'POST', body: JSON.stringify(data) }),
  updateTransportDriver: (shopId, driverId, data) =>
    request(`/admin/transport/drivers/${driverId}?shopId=${shopId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransportDriver: (shopId, driverId) =>
    request(`/admin/transport/drivers/${driverId}?shopId=${shopId}`, { method: 'DELETE' }),

  // Admin — Vehículos
  getTransportVehicles: (shopId) => request(`/admin/shops/${shopId}/transport/vehicles`),
  createTransportVehicle: (shopId, data) =>
    request(`/admin/shops/${shopId}/transport/vehicles`, { method: 'POST', body: JSON.stringify(data) }),
  updateTransportVehicle: (shopId, vehicleId, data) =>
    request(`/admin/transport/vehicles/${vehicleId}?shopId=${shopId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransportVehicle: (shopId, vehicleId) =>
    request(`/admin/transport/vehicles/${vehicleId}?shopId=${shopId}`, { method: 'DELETE' }),

  // Admin — Asignaciones (vehículo+conductor a evento)
  getEventAssignments: (eventId) => request(`/admin/transport/events/${eventId}/assignments`),
  createEventAssignment: (eventId, data) =>
    request(`/admin/transport/events/${eventId}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEventAssignment: (assignmentId) =>
    request(`/admin/transport/assignments/${assignmentId}`, { method: 'DELETE' }),

  // Admin — Pasajeros de un evento
  getEventPassengers: (eventId) => request(`/admin/transport/events/${eventId}/passengers`),
  updatePassengerStatus: (bookingId, status) =>
    request(`/admin/transport/bookings/${bookingId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Público — Eventos y asignaciones
  getPublicTransportEvents: (slug) => request(`/transport/shops/${slug}/events`),
  getPublicEventAssignments: (eventId) => request(`/transport/events/${eventId}/assignments`),

  // Cliente — Reservas
  bookPassengerSeat: (data) =>
    request('/transport/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getMyTransportBookings: () => request('/transport/bookings/my'),
  cancelTransportBooking: (bookingId) =>
    request(`/transport/bookings/${bookingId}/cancel`, { method: 'PUT' }),

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

  // ── Gym / Boxing ──────────────────────────────────────────────────────────────

  // Stats
  getGymStats: (shopId) => request(`/gym/shops/${shopId}/stats`),

  // Miembros
  getGymMembers: (shopId) => request(`/gym/shops/${shopId}/members`),
  getGymMember: (shopId, memberId) => request(`/gym/shops/${shopId}/members/${memberId}`),
  createGymMember: (shopId, data) =>
    request(`/gym/shops/${shopId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateGymMember: (shopId, memberId, data) =>
    request(`/gym/shops/${shopId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGymMember: (shopId, memberId) =>
    request(`/gym/shops/${shopId}/members/${memberId}`, { method: 'DELETE' }),

  // Membresías
  getGymMemberships: (shopId, memberId) =>
    request(`/gym/shops/${shopId}/members/${memberId}/memberships`),
  createGymMembership: (shopId, memberId, data) =>
    request(`/gym/shops/${shopId}/members/${memberId}/memberships`, { method: 'POST', body: JSON.stringify(data) }),
  updateGymMembership: (shopId, membershipId, data) =>
    request(`/gym/shops/${shopId}/memberships/${membershipId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Asistencia
  gymCheckIn: (shopId, data) =>
    request(`/gym/shops/${shopId}/attendance`, { method: 'POST', body: JSON.stringify(data) }),
  getGymTodayAttendance: (shopId) => request(`/gym/shops/${shopId}/attendance/today`),
  getGymMemberAttendance: (shopId, memberId) =>
    request(`/gym/shops/${shopId}/members/${memberId}/attendance`),
  deleteGymAttendance: (shopId, attendanceId) =>
    request(`/gym/shops/${shopId}/attendance/${attendanceId}`, { method: 'DELETE' }),

  // Progreso
  getGymProgress: (shopId, memberId) =>
    request(`/gym/shops/${shopId}/members/${memberId}/progress`),
  addGymProgress: (shopId, memberId, data) =>
    request(`/gym/shops/${shopId}/members/${memberId}/progress`, { method: 'POST', body: JSON.stringify(data) }),
  updateGymProgress: (shopId, memberId, progressId, data) =>
    request(`/gym/shops/${shopId}/members/${memberId}/progress/${progressId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGymProgress: (shopId, memberId, progressId) =>
    request(`/gym/shops/${shopId}/members/${memberId}/progress/${progressId}`, { method: 'DELETE' }),

  // ── Clases semanales ───────────────────────────────────────────────────────
  getGymClasses:           (shopId)                   => request(`/gym/shops/${shopId}/classes`),
  createGymClass:          (shopId, data)              => request(`/gym/shops/${shopId}/classes`, { method: 'POST', body: JSON.stringify(data) }),
  updateGymClass:          (shopId, classId, data)     => request(`/gym/shops/${shopId}/classes/${classId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGymClass:          (shopId, classId)           => request(`/gym/shops/${shopId}/classes/${classId}`, { method: 'DELETE' }),
  getGymClassEnrollments:  (shopId, classId)           => request(`/gym/shops/${shopId}/classes/${classId}/enrollments`),
  enrollInGymClass:        (shopId, classId, memberId) => request(`/gym/shops/${shopId}/classes/${classId}/enrollments`, { method: 'POST', body: JSON.stringify({ memberId }) }),
  unenrollFromGymClass:    (shopId, classId, enrollmentId) => request(`/gym/shops/${shopId}/classes/${classId}/enrollments/${enrollmentId}`, { method: 'DELETE' }),

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
    approvePendingByShop: (shopId) => request(`/super-admin/products/approve-pending/${shopId}`, { method: 'PUT' }),

    // Categorías de negocio
    listCategories: () => request('/super-admin/categories'),
    createCategory: (data) =>
      request('/super-admin/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) =>
      request(`/super-admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) =>
      request(`/super-admin/categories/${id}`, { method: 'DELETE' }),

    // Wallet (super admin)
    getWalletBalance: (userId) =>
      request(`/super-admin/wallet/balance/${userId}`),
    addFundsToUser: (userId, amount, description) =>
      request(`/super-admin/wallet/add-funds/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ amount, description }),
      }),

    // Catálogo global (super admin)
    listGlobalProducts: (q = '', page = 0, size = 20, active = 'all', sortBy = 'name', sortDir = 'asc') =>
      request(`/super-admin/global-products?q=${encodeURIComponent(q)}&page=${page}&size=${size}&active=${active}&sortBy=${sortBy}&sortDir=${sortDir}`),
    getGlobalProductUsage: (id) =>
      request(`/super-admin/global-products/${id}/usage`),
    deleteGlobalProduct: (id) =>
      request(`/super-admin/global-products/${id}`, { method: 'DELETE' }),

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

  // ── Galería del negocio ────────────────────────────────────────────────────

  // Público — cualquiera puede ver las fotos del negocio
  getShopGallery: (shopId) =>
    request(`/shops/${shopId}/gallery`),

  // Admin — agregar foto
  addShopGalleryImage: (shopId, data) =>
    request(`/shops/${shopId}/gallery`, { method: 'POST', body: JSON.stringify(data) }),

  // Admin — eliminar foto
  deleteShopGalleryImage: (shopId, imageId) =>
    request(`/shops/${shopId}/gallery/${imageId}`, { method: 'DELETE' }),

  // Admin — actualizar caption
  updateShopGalleryImageCaption: (shopId, imageId, caption) =>
    request(`/shops/${shopId}/gallery/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ caption }),
    }),
}