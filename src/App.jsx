import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import MyShops from './pages/admin/MyShops'
import CreateShop from './pages/admin/CreateShop'
import ShopDetail from './pages/admin/ShopDetail'
import PublicBooking from './pages/PublicBooking'

import BookingFlow from './pages/BookingFlow'
import Profile from './pages/Profile'
import Appointments from './pages/Appointments'
import Wallet from './pages/Wallet'
import Favorites from './pages/Favorites'
import Shop from './pages/Shop'
import EditProfile from './pages/EditProfile'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/book/:slug" element={<PublicBooking />} />

          {/* Panel admin (solo BARBER) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireBarber>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shops"
            element={
              <ProtectedRoute requireBarber>
                <MyShops />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shops/new"
            element={
              <ProtectedRoute requireBarber>
                <CreateShop />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shops/:shopId"
            element={
              <ProtectedRoute requireBarber>
                <ShopDetail />
              </ProtectedRoute>
            }
          />

          {/* Rutas protegidas (clientes) */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/booking" replace />} />
                    <Route path="/booking" element={<BookingFlow />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/edit-profile" element={<EditProfile />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
