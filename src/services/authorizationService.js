import { permissionUtils } from '../config/permissions'
import { secureLogger } from '../utils/secureLogger'

export const authorizationService = {
  /**
   * Validate if user can access specific customer data
   */
  async validateCustomerAccess(user, customerId, customerData = null) {
    try {
      if (!user || !customerId) {
        return {
          allowed: false,
          reason: 'Invalid user or customer ID'
        }
      }

      // Super admin has access to all customers
      if (user.role === 'admin') {
        return { allowed: true, reason: 'Super admin access' }
      }

      // If customer data is provided, validate LOB access
      if (customerData) {
        const customerLOB = this.determineCustomerLOB(customerData)
        
        if (customerLOB && !permissionUtils.hasLOBAccess(user, customerLOB)) {
          secureLogger.authLog('CUSTOMER_LOB_VIOLATION', user.id, user.email, {
            customerId,
            customerLOB,
            userLOBs: permissionUtils.getUserLOBs(user),
            reason: 'Cross-LOB access attempt'
          })
          
          return {
            allowed: false,
            reason: `No access to ${customerLOB} customers`
          }
        }
      }

      // Branch-based validation for internal agents
      if (user.agent_type === 'internal' && user.branch_id) {
        // Add branch-specific customer validation logic here
        // For now, allow access but log for audit
        secureLogger.authLog('BRANCH_CUSTOMER_ACCESS', user.id, user.email, {
          customerId,
          branchId: user.branch_id
        })
      }

      // Sales agents can only access customers they created
      if (user.agent_type === 'sales_agent') {
        if (customerData && customerData.created_by !== user.id) {
          secureLogger.authLog('SALES_AGENT_CUSTOMER_VIOLATION', user.id, user.email, {
            customerId,
            customerCreatedBy: customerData.created_by,
            reason: 'Sales agent accessing non-owned customer'
          })
          
          return {
            allowed: false,
            reason: 'Can only access customers you created'
          }
        }
      }

      return { allowed: true, reason: 'Access granted' }
    } catch (error) {
      secureLogger.error('Customer access validation failed:', error)
      return {
        allowed: false,
        reason: 'Validation error'
      }
    }
  },

  /**
   * Determine customer's LOB based on policy data
   */
  determineCustomerLOB(customerData) {
    if (!customerData) return null

    // Check policy type or other indicators
    if (customerData.policy_type) {
      const policyType = customerData.policy_type.toLowerCase()
      
      if (policyType.includes('life') || policyType.includes('endowment')) {
        return 'LIFE'
      }
      if (policyType.includes('motor') || policyType.includes('vehicle')) {
        return 'MOTOR'
      }
      if (policyType.includes('health') || policyType.includes('medical')) {
        return 'HEALTH'
      }
      if (policyType.includes('csl')) {
        return 'CSL'
      }
    }

    // Check branch_id for CSL customers
    if (customerData.branch_id === 13) {
      return 'CSL'
    }

    // Default to LIFE if cannot determine
    return 'LIFE'
  },

  /**
   * Filter customer list based on user permissions
   */
  filterCustomersByAccess(user, customers) {
    if (!user || !Array.isArray(customers)) return []

    // Super admin sees all customers
    if (user.role === 'admin') return customers

    const userLOBs = permissionUtils.getUserLOBs(user)
    
    return customers.filter(customer => {
      const customerLOB = this.determineCustomerLOB(customer)
      
      // If cannot determine LOB, allow access (fail open for now)
      if (!customerLOB) return true
      
      // Check if user has access to this customer's LOB
      return userLOBs.includes(customerLOB)
    })
  },

  /**
   * Validate API endpoint access
   */
  validateAPIAccess(user, endpoint, method = 'GET') {
    if (!user) return false

    // Map API endpoints to route permissions
    const apiRouteMap = {
      '/customers': '/customers',
      '/admin/agents': '/admin/agents',
      '/admin/upload': '/admin/upload',
      '/csl/policies': '/csl',
      '/admin/csl/upload': '/admin/csl/upload-policies'
    }

    const mappedRoute = apiRouteMap[endpoint]
    if (!mappedRoute) {
      // Unknown endpoint, log and deny
      secureLogger.authLog('UNKNOWN_API_ENDPOINT', user.id, user.email, {
        endpoint,
        method
      })
      return false
    }

    return permissionUtils.hasRouteAccess(user, mappedRoute)
  },

  /**
   * Log security events for audit trail
   */
  logSecurityEvent(eventType, user, details = {}) {
    secureLogger.authLog(eventType, user?.id, user?.email, {
      timestamp: new Date().toISOString(),
      userRole: user?.role,
      userAgent: user?.agent_type,
      ...details
    })
  }
}