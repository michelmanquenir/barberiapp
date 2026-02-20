import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/Layout'
import BookingFlow from './pages/BookingFlow'
import Profile from './pages/Profile'
import Appointments from './pages/Appointments'
import Wallet from './pages/Wallet'
import Favorites from './pages/Favorites'
import Shop from './pages/Shop'
import EditProfile from './pages/EditProfile'

function App() {
  return (
    <Router>
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
    </Router>
  )
}

export default App
