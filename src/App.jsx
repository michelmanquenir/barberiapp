import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoadScript } from '@react-google-maps/api'

import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { GOOGLE_LIBRARIES, GOOGLE_MAPS_API_KEY } from './lib/googleMaps'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ChangePassword from './pages/ChangePassword'
import AdminDashboard from './pages/admin/AdminDashboard'
import MyShops from './pages/admin/MyShops'
import CreateShop from './pages/admin/CreateShop'
import ShopDetail from './pages/admin/ShopDetail'
import ShopAppointments from './pages/admin/ShopAppointments'
import AllShopsAppointments from './pages/admin/AllShopsAppointments'
import BarberBooking from './pages/admin/BarberBooking'
import BarberGallery from './pages/admin/BarberGallery'
import ShopStats from './pages/admin/ShopStats'
import ShopOrders from './pages/admin/ShopOrders'
import ShopTransport from './pages/admin/ShopTransport'
import PointOfSale from './pages/admin/PointOfSale'
import GymMembers from './pages/admin/GymMembers'
import PublicShopCatalog from './pages/PublicShopCatalog'
import PublicTransport from './pages/PublicTransport'
import PublicBooking from './pages/PublicBooking'
import PublicGallery from './pages/PublicGallery'
import SuperAdminUsers from './pages/super-admin/SuperAdminUsers'
import SuperAdminShops from './pages/super-admin/SuperAdminShops'
import SuperAdminProducts from './pages/super-admin/SuperAdminProducts'
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard'
import SuperAdminCategories from './pages/super-admin/SuperAdminCategories'
import SuperAdminProductCategories from './pages/super-admin/SuperAdminProductCategories'
import SuperAdminCatalog from './pages/super-admin/SuperAdminCatalog'

import DiscoverShops from './pages/DiscoverShops'
import Profile from './pages/Profile'
import Appointments from './pages/Appointments'
import Wallet from './pages/Wallet'
import Favorites from './pages/Favorites'
import MyBarbers from './pages/MyBarbers'
import EditProfile from './pages/EditProfile'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import MyFinances from './pages/MyFinances'

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      {/* LoadScript a nivel global: el script de Google Maps se carga UNA sola vez */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={GOOGLE_LIBRARIES}>
        <Router>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } />
            <Route path="/book/:slug" element={<PublicBooking />} />
            <Route path="/book/:slug/gallery" element={<PublicGallery />} />
            <Route path="/shop/:slug" element={<PublicShopCatalog />} />
            <Route path="/transport/:slug" element={<PublicTransport />} />
            <Route path="/booking" element={<Layout><DiscoverShops /></Layout>} />

            {/* Panel Super Admin */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <Navigate to="/super-admin/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/users"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/shops"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminShops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/products"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/catalog"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/categories"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/product-categories"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <SuperAdminProductCategories />
                </ProtectedRoute>
              }
            />

            {/* Panel admin (solo BARBER) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <MyShops />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/new"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <CreateShop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/edit"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <CreateShop />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <ShopDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/appointments"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <ShopAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/appointments"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <AllShopsAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/book"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <BarberBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gallery"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <BarberGallery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/stats"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <ShopStats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/orders"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <ShopOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/transport"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <ShopTransport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/pos"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <PointOfSale />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shops/:shopId/gym"
              element={
                <ProtectedRoute requireBusinessOwner>
                  <GymMembers />
                </ProtectedRoute>
              }
            />

            {/* Rutas protegidas (clientes y barberos en modo cliente) */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/booking" replace />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/favorites" element={<Favorites />} />
                      <Route path="/my-visits" element={<MyBarbers />} />
                      <Route path="/edit-profile" element={<EditProfile />} />
                      <Route path="/my-finances" element={<MyFinances />} />
                      <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </LoadScript>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
