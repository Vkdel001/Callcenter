// Secure logging utility that prevents sensitive data exposure

const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'Password',
  'Password_Hash',
  'token',
  'authToken',
  'otp',
  'secret',
  'key'
]

const isDevelopment = import.meta.env.DEV

class SecureLogger {
  // Remove sensitive fields from objects
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value)
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  log(message, data = null) {
    if (!isDevelopment) return // No logging in production
    
    if (data) {
      console.log(message, this.sanitizeData(data))
    } else {
      console.log(message)
    }
  }

  error(message, error = null) {
    if (error) {
      // Only log error message and status, not full error object which might contain sensitive data
      console.error(message, {
        message: error.message,
        status: error.status || error.response?.status,
        code: error.code
      })
    } else {
      console.error(message)
    }
  }

  warn(message, data = null) {
    if (!isDevelopment) return
    
    if (data) {
      console.warn(message, this.sanitizeData(data))
    } else {
      console.warn(message)
    }
  }

  // For authentication events - extra careful
  authLog(event, userId = null, email = null, details = {}) {
    if (!isDevelopment) return
    
    console.log(`🔐 Auth Event: ${event}`, {
      userId,
      email,
      timestamp: new Date().toISOString(),
      ...this.sanitizeData(details)
    })
  }

  // For security violations - always log (even in production for audit)
  securityLog(event, userId = null, email = null, details = {}) {
    const logData = {
      event,
      userId,
      email,
      timestamp: new Date().toISOString(),
      ...this.sanitizeData(details)
    }
    
    // Always log security events for audit trail
    console.warn(`🚨 Security Event: ${event}`, logData)
    
    // In production, you would send this to a security monitoring service
    if (!isDevelopment) {
      // TODO: Send to security monitoring service
      // Example: securityMonitoringService.logEvent(logData)
    }
  }
}

export const secureLogger = new SecureLogger()