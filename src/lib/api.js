const BASE_URL = '/api'

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
    throw new Error(`Error API: ${response.status} ${response.statusText}`)
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

  // Servicios
  getServices: () => request('/services'),

  // Barberos
  getBarbers: (shopId) => request(shopId ? `/barbers?shopId=${shopId}` : '/barbers'),
  createBarberProfile: (data) =>
    request('/barbers', { method: 'POST', body: JSON.stringify(data) }),

  // Negocios (Shops)
  getMyShops: () => request('/shops/my'),
  createShop: (data) =>
    request('/shops', { method: 'POST', body: JSON.stringify(data) }),
  getShopBySlug: (slug) => request(`/shops/${slug}`),
  getShopBarbers: (slug) => request(`/shops/${slug}/barbers`),
  addBarberToShop: (shopId, barberId) =>
    request(`/shops/${shopId}/members/${barberId}`, { method: 'POST' }),
  removeBarberFromShop: (shopId, barberId) =>
    request(`/shops/${shopId}/members/${barberId}`, { method: 'DELETE' }),

  // Citas
  getAppointments: (userId) => request(`/appointments?userId=${userId}`),
  createAppointment: (data) =>
    request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  cancelAppointment: (id, userId) =>
    request(`/appointments/${id}/cancel?userId=${userId}`, { method: 'PUT' }),

  // Favoritos
  getFavorites: (userId) => request(`/favorites?userId=${userId}`),
  addFavorite: (barberId, userId) =>
    request(`/favorites/${barberId}?userId=${userId}`, { method: 'POST' }),
  removeFavorite: (id, userId) =>
    request(`/favorites/${id}?userId=${userId}`, { method: 'DELETE' }),

  // Productos
  getProducts: () => request('/products'),

  // Perfil
  getProfile: (userId) => request(`/profile?userId=${userId}`),
  updateProfile: (userId, data) =>
    request(`/profile?userId=${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Wallet
  getBalance: (userId) => request(`/wallet/balance?userId=${userId}`),
  getTransactions: (userId) => request(`/wallet/transactions?userId=${userId}`),
  addFunds: (userId, amount) =>
    request(`/wallet/add-funds?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
}
