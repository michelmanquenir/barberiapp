import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, requireBarber = false }) {
  const { isAuthenticated, isBarber } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireBarber && !isBarber) {
    return <Navigate to="/booking" replace />
  }

  return children
}

export default ProtectedRoute
