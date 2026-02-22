#!/usr/bin/env node

/**
 * NIC Call Center - Secure Email Service
 * 
 * This service handles all email operations securely by keeping the Brevo API key
 * on the server side only. The frontend calls this service instead of Brevo directly.
 * 
 * Features:
 * - Secure API key storage (server-side only)
 * - RESTful API endpoints for all email operations
 * - Request validation and error handling
 * - Comprehensive logging
 * - CORS support for frontend communication
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')
const fs = require('fs')
const path = require('path')

// ============================================
// LOAD CONFIGURATION FROM .env.email-service
// This explicitly reads from the file to avoid system env var conflicts
// ============================================
const envPath = path.join(__dirname, '.env.email-service')
const envConfig = {}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    line = line.trim()
    if (!line || line.startsWith('#')) return
    
    // Match KEY=VALUE pattern
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) {
      envConfig[match[1]] = match[2].trim()
    }
  })
  console.log('📄 Loaded configuration from .env.email-service')
  console.log(`   Keys found: ${Object.keys(envConfig).join(', ')}`)
} else {
  console.error('❌ .env.email-service file not found!')
}

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  PORT: envConfig.PORT || 3003,
  BREVO_API_KEY: envConfig.BREVO_API_KEY,
  BREVO_API_URL: 'https://api.brevo.com/v3',
  SENDER_EMAIL: envConfig.SENDER_EMAIL || 'arrears@niclmauritius.site',
  SENDER_NAME: envConfig.SENDER_NAME || 'NIC Life Insurance Mauritius',
  REPLY_TO_EMAIL: envConfig.REPLY_TO_EMAIL || 'nicarlife@nicl.mu',
  REPLY_TO_NAME: envConfig.REPLY_TO_NAME || 'NIC Life Insurance',
  LOG_FILE: envConfig.LOG_FILE || '/var/log/nic-email-service.log',
  ALLOWED_ORIGINS: envConfig.ALLOWED_ORIGINS ? envConfig.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000']
}

// Validate configuration
if (!CONFIG.BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY not found in .env.email-service')
  console.error('Please create .env.email-service file with BREVO_API_KEY')
  process.exit(1)
}

console.log('✅ Email Service Configuration Loaded')
console.log(`   Port: ${CONFIG.PORT}`)
console.log(`   Sender: ${CONFIG.SENDER_NAME} <${CONFIG.SENDER_EMAIL}>`)
console.log(`   API Key (first 20 chars): ${CONFIG.BREVO_API_KEY.substring(0, 20)}...`)
console.log(`   API Key (last 10 chars): ...${CONFIG.BREVO_API_KEY.substring(CONFIG.BREVO_API_KEY.length - 10)}`)
console.log(`   Brevo API: Configured`)

// ============================================
// LOGGING UTILITY
// ============================================

function log(level, message, data = null) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  }
  
  const logLine = JSON.stringify(logEntry) + '\n'
  
  // Console output
  const emoji = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️'
  }
  console.log(`${emoji[level] || '📝'} [${timestamp}] ${message}`)
  
  // File output (if writable)
  try {
    const logDir = path.dirname(CONFIG.LOG_FILE)
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    fs.appendFileSync(CONFIG.LOG_FILE, logLine)
  } catch (error) {
    // Fallback to local log file if system log is not writable
    try {
      fs.appendFileSync('./email-service.log', logLine)
    } catch (e) {
      // Silent fail - at least we have console output
    }
  }
}

// ============================================
// BREVO API CLIENT
// ============================================
function callBrevoAPI(endpoint, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    // Construct full URL manually to avoid URL constructor issues
    const fullUrl = `${CONFIG.BREVO_API_URL}/${endpoint.replace(/^\//, '')}`
    
    console.log(`🔍 Calling Brevo API: ${method} ${fullUrl}`)
    console.log(`   API Key (first 20): ${CONFIG.BREVO_API_KEY.substring(0, 20)}...`)
    
    const url = new URL(fullUrl)
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': CONFIG.BREVO_API_KEY
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        console.log(`   Response Status: ${res.statusCode}`)
        console.log(`   Response Body: ${responseData.substring(0, 200)}`)
        
        try {
          const parsed = responseData ? JSON.parse(responseData) : {}
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject({
              statusCode: res.statusCode,
              message: parsed.message || 'Brevo API Error',
              details: parsed
            })
          }
        } catch (error) {
          reject({
            statusCode: res.statusCode,
            message: 'Failed to parse Brevo response',
            error: error.message
          })
        }
      })
    })

    req.on('error', (error) => {
      console.log(`   ❌ Network Error: ${error.message}`)
      reject({
        message: 'Network error calling Brevo API',
        error: error.message
      })
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send transactional email via Brevo
 */
async function sendTransactionalEmail(payload) {
  try {
    log('INFO', 'Sending transactional email', {
      to: payload.to?.email,
      subject: payload.subject
    })

    const result = await callBrevoAPI('smtp/email', 'POST', payload)
    
    log('SUCCESS', 'Email sent successfully', {
      messageId: result.messageId,
      to: payload.to?.email
    })

    return {
      success: true,
      messageId: result.messageId,
      data: result
    }
  } catch (error) {
    log('ERROR', 'Failed to send email', {
      error: error.message,
      to: payload.to?.email
    })

    return {
      success: false,
      error: error.message || 'Failed to send email',
      details: error
    }
  }
}

/**
 * Send SMS via Brevo
 */
async function sendSMS(payload) {
  try {
    log('INFO', 'Sending SMS', {
      to: payload.recipient
    })

    const smsPayload = {
      type: 'transactional',
      unicodeEnabled: false,
      sender: payload.sender?.substring(0, 11) || 'NIC Life',
      recipient: payload.recipient,
      content: payload.content
    }

    const result = await callBrevoAPI('transactionalSMS/sms', 'POST', smsPayload)
    
    log('SUCCESS', 'SMS sent successfully', {
      reference: result.reference,
      to: payload.recipient
    })

    return {
      success: true,
      messageId: result.reference,
      data: result
    }
  } catch (error) {
    log('ERROR', 'Failed to send SMS', {
      error: error.message,
      to: payload.recipient
    })

    return {
      success: false,
      error: error.message || 'Failed to send SMS',
      details: error
    }
  }
}

/**
 * Get email templates from Brevo
 */
async function getTemplates() {
  try {
    const result = await callBrevoAPI('smtp/templates', 'GET')
    return {
      success: true,
      templates: result.templates || []
    }
  } catch (error) {
    log('ERROR', 'Failed to fetch templates', { error: error.message })
    return {
      success: false,
      error: error.message,
      templates: []
    }
  }
}

// ============================================
// HTTP SERVER & REQUEST HANDLER
// ============================================

/**
 * Parse JSON body from request
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(new Error('Invalid JSON'))
      }
    })
    
    req.on('error', reject)
  })
}

/**
 * Send JSON response
 */
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

/**
 * Main request handler
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname
  const method = req.method

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end()
    return
  }

  // Health check endpoint
  if (pathname === '/health' || pathname === '/api/email/health') {
    sendResponse(res, 200, {
      status: 'healthy',
      service: 'nic-email-service',
      timestamp: new Date().toISOString()
    })
    return
  }

  // Debug endpoint - shows API key being used (for testing only!)
  if (pathname === '/debug/api-key') {
    sendResponse(res, 200, {
      apiKey: CONFIG.BREVO_API_KEY,
      first20: CONFIG.BREVO_API_KEY.substring(0, 20),
      last10: CONFIG.BREVO_API_KEY.substring(CONFIG.BREVO_API_KEY.length - 10),
      length: CONFIG.BREVO_API_KEY.length
    })
    return
  }

  // Email endpoints
  if (method === 'POST') {
    try {
      const body = await parseBody(req)

      // Send transactional email
      if (pathname === '/api/email/send' || pathname === '/api/email/send-transactional') {
        const result = await sendTransactionalEmail(body)
        sendResponse(res, result.success ? 200 : 500, result)
        return
      }

      // Send SMS
      if (pathname === '/api/email/send-sms') {
        const result = await sendSMS(body)
        sendResponse(res, result.success ? 200 : 500, result)
        return
      }

      // Unknown endpoint
      sendResponse(res, 404, {
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /api/email/health',
          'POST /api/email/send',
          'POST /api/email/send-transactional',
          'POST /api/email/send-sms',
          'GET /api/email/templates'
        ]
      })
    } catch (error) {
      log('ERROR', 'Request handling error', { error: error.message })
      sendResponse(res, 400, {
        success: false,
        error: error.message
      })
    }
    return
  }

  // GET endpoints
  if (method === 'GET') {
    // Get templates
    if (pathname === '/api/email/templates') {
      const result = await getTemplates()
      sendResponse(res, result.success ? 200 : 500, result)
      return
    }
  }

  // Default 404
  sendResponse(res, 404, {
    success: false,
    error: 'Endpoint not found'
  })
}

// ============================================
// SERVER STARTUP
// ============================================

const server = http.createServer(handleRequest)

server.listen(CONFIG.PORT, () => {
  log('SUCCESS', `Email Service started on port ${CONFIG.PORT}`)
  log('INFO', 'Available endpoints:')
  console.log('   GET  /health')
  console.log('   GET  /api/email/health')
  console.log('   POST /api/email/send')
  console.log('   POST /api/email/send-transactional')
  console.log('   POST /api/email/send-sms')
  console.log('   GET  /api/email/templates')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  log('INFO', 'SIGTERM received, shutting down gracefully')
  server.close(() => {
    log('INFO', 'Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  log('INFO', 'SIGINT received, shutting down gracefully')
  server.close(() => {
    log('INFO', 'Server closed')
    process.exit(0)
  })
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught exception', { error: error.message, stack: error.stack })
  console.error('\n❌ Fatal Error:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled rejection', { reason, promise })
})
