/**
 * Test Script for NIC Email Service
 * 
 * This script tests all endpoints of the email service to ensure
 * it's working correctly before deployment.
 */

const http = require('http')

const SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3003'

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVICE_URL)
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {}
          resolve({
            statusCode: res.statusCode,
            data: parsed
          })
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

// Test functions
async function testAPIKeyDebug() {
  console.log('\n🔑 Checking API Key Being Used...')
  try {
    const response = await makeRequest('/debug/api-key', 'GET')
    if (response.statusCode === 200) {
      console.log('✅ API Key loaded from backend:')
      console.log(`   Full Key: ${response.data.apiKey}`)
      console.log(`   First 20 chars: ${response.data.first20}...`)
      console.log(`   Last 10 chars: ...${response.data.last10}`)
      console.log(`   Length: ${response.data.length} characters`)
      return true
    } else {
      console.log('❌ Could not retrieve API key debug info')
      return false
    }
  } catch (error) {
    console.log('❌ API key debug error:', error.message)
    return false
  }
}

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...')
  try {
    const response = await makeRequest('/health', 'GET')
    if (response.statusCode === 200 && response.data.status === 'healthy') {
      console.log('✅ Health check passed')
      console.log('   Response:', response.data)
      return true
    } else {
      console.log('❌ Health check failed')
      console.log('   Status:', response.statusCode)
      console.log('   Response:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message)
    return false
  }
}

async function testSendEmail() {
  console.log('\n📧 Testing Send Email...')
  try {
    const emailPayload = {
      sender: {
        name: 'NIC Life Insurance',
        email: 'arrears@niclmauritius.site'
      },
      to: [{
        email: 'test@example.com',
        name: 'Test User'
      }],
      subject: 'Test Email from Email Service',
      htmlContent: '<html><body><h1>Test Email</h1><p>This is a test email from the NIC Email Service.</p></body></html>',
      textContent: 'Test Email - This is a test email from the NIC Email Service.'
    }

    const response = await makeRequest('/api/email/send', 'POST', emailPayload)
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Email send test passed')
      console.log('   Message ID:', response.data.messageId)
      return true
    } else {
      console.log('⚠️  Email send test completed with issues')
      console.log('   Status:', response.statusCode)
      console.log('   Response:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ Email send test error:', error.message)
    return false
  }
}

async function testGetTemplates() {
  console.log('\n📋 Testing Get Templates...')
  try {
    const response = await makeRequest('/api/email/templates', 'GET')
    
    if (response.statusCode === 200) {
      console.log('✅ Get templates test passed')
      console.log('   Templates found:', response.data.templates?.length || 0)
      return true
    } else {
      console.log('⚠️  Get templates test completed with issues')
      console.log('   Status:', response.statusCode)
      console.log('   Response:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ Get templates test error:', error.message)
    return false
  }
}

async function testInvalidEndpoint() {
  console.log('\n🚫 Testing Invalid Endpoint...')
  try {
    const response = await makeRequest('/api/email/invalid', 'POST', {})
    
    if (response.statusCode === 404) {
      console.log('✅ Invalid endpoint test passed (correctly returned 404)')
      return true
    } else {
      console.log('⚠️  Invalid endpoint test unexpected result')
      console.log('   Status:', response.statusCode)
      return false
    }
  } catch (error) {
    console.log('❌ Invalid endpoint test error:', error.message)
    return false
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Email Service Tests')
  console.log('   Service URL:', SERVICE_URL)
  console.log('=' .repeat(60))

  // First, show the API key being used
  await testAPIKeyDebug()

  const results = {
    healthCheck: await testHealthCheck(),
    sendEmail: await testSendEmail(),
    getTemplates: await testGetTemplates(),
    invalidEndpoint: await testInvalidEndpoint()
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(60))
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.keys(results).length

  Object.entries(results).forEach(([test, result]) => {
    console.log(`   ${result ? '✅' : '❌'} ${test}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log(`   Total: ${passed}/${total} tests passed`)
  console.log('='.repeat(60))

  if (passed === total) {
    console.log('\n🎉 All tests passed! Email service is ready.')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some tests failed. Please check the service configuration.')
    process.exit(1)
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite error:', error)
  process.exit(1)
})
