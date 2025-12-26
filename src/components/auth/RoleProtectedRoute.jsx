import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { permissionUtils } from '../../config/permissions'
import { secureLogger } from '../../utils/secureLogger'

const RoleProtectedRoute = ({ children, requiredRole = null, requiredLOB = null }) => {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    secureLogger.securityLog('UNAUTHORIZED_ACCESS_ATTEMPT', null, null, {
      route: location.pathname,
      reason: 'Not authenticated'
    })
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if route is accessible to user's role
  const hasRouteAccess = permissionUtils.hasRouteAccess(user, location.pathname)
  
  if (!hasRouteAccess) {
    // Log security violation
    secureLogger.securityLog('AUTHORIZATION_VIOLATION', user.id, user.email, {
      route: location.pathname,
      userRole: user.role,
      reason: 'Insufficient role permissions'
    })
    
    return <Navigate to="/unauthorized" replace />
  }

  // Additional role-specific validation if required
  if (requiredRole && user.role !== requiredRole) {
    secureLogger.securityLog('ROLE_MISMATCH', user.id, user.email, {
      route: location.pathname,
      userRole: user.role,
      requiredRole: requiredRole
    })
    
    return <Navigate to="/unauthorized" replace />
  }

  // LOB-specific access validation if required
  if (requiredLOB && !permissionUtils.hasLOBAccess(user, requiredLOB)) {
    secureLogger.securityLog('LOB_ACCESS_VIOLATION', user.id, user.email, {
      route: location.pathname,
      userRole: user.role,
      requiredLOB: requiredLOB,
      userLOBs: permissionUtils.getUserLOBs(user)
    })
    
    return <Navigate to="/unauthorized" replace />
  }

  // Log successful authorized access (for audit trail) - only in development
  if (import.meta.env.DEV) {
    secureLogger.authLog('AUTHORIZED_ACCESS', user.id, user.email, {
      route: location.pathname,
      userRole: user.role
    })
  }

  return children
}

export default RoleProtectedRoute