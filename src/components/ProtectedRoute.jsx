import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, requireBusinessOwner = false, requireSuperAdmin = false }) {
  const { isAuthenticated, isBusinessOwner, isSuperAdmin } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/booking" replace />
  }

  if (requireBusinessOwner && !isBusinessOwner) {
    return <Navigate to="/booking" replace />
  }

  return children
}

export default ProtectedRoute
