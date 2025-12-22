// Route-Level Authorization Configuration
// This file defines which roles can access which routes

export const ROUTE_PERMISSIONS = {
  // Public routes (no authentication required)
  PUBLIC: [
    '/login',
    '/signup', 
    '/otp-verify',
    '/forgot-password',
    '/reset-password-otp',
    '/reminder/:installmentId' // Public reminder pages
  ],

  // Basic authenticated routes (all logged-in users)
  AUTHENTICATED: [
    '/',
    '/follow-ups',
    '/quick-qr',
    '/qr-summary'
  ],

  // Admin-only routes
  ADMIN_ONLY: [
    '/admin',
    '/admin/upload',
    '/admin/reports', 
    '/admin/agents',
    '/admin/branches',
    '/admin/bulk-agents',
    '/admin/scheduler'
  ],

  // CSL Admin routes (admin + life_admin roles)
  CSL_ADMIN: [
    '/admin/csl/upload-policies',
    '/admin/csl/upload-payments', 
    '/admin/csl/dropdown-config',
    '/admin/csl/agent-reports'
  ],

  // CSL Agent routes (branch_id === 13)
  CSL_AGENT: [
    '/csl',
    '/csl/policy/:id',
    '/csl/reports'
  ],

  // Customer access routes (requires LOB validation)
  CUSTOMER_ACCESS: [
    '/customers',
    '/customers/:id'
  ],

  // LOB Dashboard routes
  LOB_DASHBOARD: [
    '/lob/:lobType',
    '/lob/:lobType/:month'
  ],

  // Test routes (development only)
  TEST_ROUTES: [
    '/test/payment-plan'
  ]
}

// Role hierarchy and permissions
export const ROLE_PERMISSIONS = {
  // Super admin - full access
  admin: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.ADMIN_ONLY,
      ...ROUTE_PERMISSIONS.CSL_ADMIN,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS,
      ...ROUTE_PERMISSIONS.LOB_DASHBOARD,
      ...ROUTE_PERMISSIONS.TEST_ROUTES
    ],
    lobAccess: 'ALL', // Can access all LOBs
    description: 'Full system administrator'
  },

  // Life admin - life insurance focused admin
  life_admin: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.ADMIN_ONLY,
      ...ROUTE_PERMISSIONS.CSL_ADMIN,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS,
      ...ROUTE_PERMISSIONS.LOB_DASHBOARD
    ],
    lobAccess: ['LIFE', 'CSL'], // Life and CSL only
    description: 'Life insurance administrator'
  },

  // Motor admin - motor insurance focused admin  
  motor_admin: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS,
      ...ROUTE_PERMISSIONS.LOB_DASHBOARD
    ],
    lobAccess: ['MOTOR'], // Motor only
    description: 'Motor insurance administrator'
  },

  // Health admin - health insurance focused admin
  health_admin: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS,
      ...ROUTE_PERMISSIONS.LOB_DASHBOARD
    ],
    lobAccess: ['HEALTH'], // Health only
    description: 'Health insurance administrator'
  },

  // Internal agent - branch-based access
  internal_agent: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS,
      ...ROUTE_PERMISSIONS.LOB_DASHBOARD
    ],
    lobAccess: 'BRANCH_BASED', // Based on branch_id
    description: 'Internal branch agent'
  },

  // Call center agent - basic customer access
  agent: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS
    ],
    lobAccess: 'LIMITED', // Limited customer access
    description: 'Call center agent'
  },

  // Sales agent - customer creation and QR generation
  sales_agent: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED
    ],
    lobAccess: 'SALES_ONLY', // Can create customers, limited view
    description: 'Sales agent'
  },

  // CSR agent - customer service
  csr: {
    canAccess: [
      ...ROUTE_PERMISSIONS.AUTHENTICATED,
      ...ROUTE_PERMISSIONS.CUSTOMER_ACCESS
    ],
    lobAccess: 'LIMITED', // Limited customer access
    description: 'Customer service representative'
  }
}

// Special access rules
export const SPECIAL_ACCESS_RULES = {
  // CSL agents (branch_id === 13) get CSL routes regardless of role
  CSL_BRANCH_ACCESS: {
    branchId: 13,
    additionalRoutes: ROUTE_PERMISSIONS.CSL_AGENT
  },

  // LOB-specific customer access validation
  CUSTOMER_LOB_VALIDATION: {
    enabled: true,
    strictMode: true, // Prevent cross-LOB access
    logViolations: true
  }
}

// Utility functions for permission checking
export const permissionUtils = {
  /**
   * Check if user has access to a specific route
   */
  hasRouteAccess(user, route) {
    if (!user) return false

    // Get user's role permissions
    const rolePerms = ROLE_PERMISSIONS[user.role]
    if (!rolePerms) return false

    // Check if route is in user's allowed routes
    const hasAccess = rolePerms.canAccess.some(allowedRoute => {
      // Handle parameterized routes (e.g., /customers/:id)
      if (allowedRoute.includes(':')) {
        const pattern = allowedRoute.replace(/:[^/]+/g, '[^/]+')
        const regex = new RegExp(`^${pattern}$`)
        return regex.test(route)
      }
      return allowedRoute === route
    })

    // Special case: CSL branch access
    if (!hasAccess && user.branch_id === SPECIAL_ACCESS_RULES.CSL_BRANCH_ACCESS.branchId) {
      return SPECIAL_ACCESS_RULES.CSL_BRANCH_ACCESS.additionalRoutes.some(cslRoute => {
        if (cslRoute.includes(':')) {
          const pattern = cslRoute.replace(/:[^/]+/g, '[^/]+')
          const regex = new RegExp(`^${pattern}$`)
          return regex.test(route)
        }
        return cslRoute === route
      })
    }

    return hasAccess
  },

  /**
   * Check if user has access to specific LOB data
   */
  hasLOBAccess(user, lob) {
    if (!user) return false

    const rolePerms = ROLE_PERMISSIONS[user.role]
    if (!rolePerms) return false

    // Super admin has all access
    if (rolePerms.lobAccess === 'ALL') return true

    // Array-based LOB access
    if (Array.isArray(rolePerms.lobAccess)) {
      return rolePerms.lobAccess.includes(lob)
    }

    // Branch-based access
    if (rolePerms.lobAccess === 'BRANCH_BASED') {
      // Map branch_id to LOB access
      const branchLOBMap = {
        13: ['CSL'], // CSL branch
        // Add other branch mappings as needed
      }
      const branchLOBs = branchLOBMap[user.branch_id] || []
      return branchLOBs.includes(lob)
    }

    return false
  },

  /**
   * Get user's accessible LOBs
   */
  getUserLOBs(user) {
    if (!user) return []

    const rolePerms = ROLE_PERMISSIONS[user.role]
    if (!rolePerms) return []

    if (rolePerms.lobAccess === 'ALL') {
      return ['LIFE', 'MOTOR', 'HEALTH', 'CSL']
    }

    if (Array.isArray(rolePerms.lobAccess)) {
      return rolePerms.lobAccess
    }

    if (rolePerms.lobAccess === 'BRANCH_BASED') {
      const branchLOBMap = {
        13: ['CSL']
      }
      return branchLOBMap[user.branch_id] || []
    }

    return []
  },

  /**
   * Check if route is public (no authentication required)
   */
  isPublicRoute(route) {
    return ROUTE_PERMISSIONS.PUBLIC.some(publicRoute => {
      if (publicRoute.includes(':')) {
        const pattern = publicRoute.replace(/:[^/]+/g, '[^/]+')
        const regex = new RegExp(`^${pattern}$`)
        return regex.test(route)
      }
      return publicRoute === route
    })
  }
}