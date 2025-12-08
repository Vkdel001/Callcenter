import axios from 'axios'

// Xano configuration
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io'
const CSL_PAYMENT_API_KEY = 'mHkBSlF2'

// Create API client for CSL payments
const createCSLPaymentClient = () => {
  const client = axios.create({
    baseURL: `${XANO_BASE_URL}/api:${CSL_PAYMENT_API_KEY}`,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return client
}

const cslPaymentApi = createCSLPaymentClient()

/**
 * CSL Payment Service
 * Manages payment verification data for CSL policies
 */
class CSLPaymentService {
  
  /**
   * Check if payment exists for a policy number
   * @param {string} policyNumber - Policy number
   * @returns {Promise<Object|null>} Payment object or null
   */
  async checkPaymentForPolicy(policyNumber) {
    try {
      const response = await cslPaymentApi.get('/csl_payments')
      const allPayments = response.data || []
      
      // Find payment for this policy number
      const payment = allPayments.find(p => p.policy_number === policyNumber)
      
      return payment || null
    } catch (error) {
      console.error('Failed to check payment for policy:', error)
      return null
    }
  }
  
  /**
   * Get all payments for a policy number
   * Only includes payments made AFTER the policy was created in the system
   * @param {string} policyNumber - Policy number
   * @param {string|number} policyCreatedAt - Policy creation timestamp (optional)
   * @returns {Promise<Array>} Array of payments
   */
  async getPaymentsForPolicy(policyNumber, policyCreatedAt = null) {
    try {
      const response = await cslPaymentApi.get('/csl_payments')
      const allPayments = response.data || []
      
      // Filter payments for this policy number
      let policyPayments = allPayments.filter(p => p.policy_number === policyNumber)
      
      // Filter payments to only show those AFTER policy creation
      if (policyCreatedAt && policyPayments.length > 0) {
        // Xano created_at is already in milliseconds, no need to multiply by 1000
        const policyCreatedDate = new Date(policyCreatedAt)
        
        console.log(`🔍 Policy ${policyNumber} created at:`, policyCreatedDate.toISOString())
        console.log(`🔍 Found ${policyPayments.length} total payments before filtering`)
        
        policyPayments = policyPayments.filter(payment => {
          const paymentDate = new Date(payment.payment_date)
          const passes = paymentDate >= policyCreatedDate
          console.log(`  Payment ${payment.payment_date}: ${paymentDate.toISOString()} >= ${policyCreatedDate.toISOString()} = ${passes}`)
          return passes
        })
        
        console.log(`✅ Filtered payments for policy ${policyNumber}: ${policyPayments.length} payments after policy creation`)
      }
      
      // Sort by payment date (newest first)
      policyPayments.sort((a, b) => 
        new Date(b.payment_date) - new Date(a.payment_date)
      )
      
      return policyPayments
    } catch (error) {
      console.error('Failed to get payments for policy:', error)
      return []
    }
  }
  
  /**
   * Create a new payment record
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData) {
    try {
      const payload = {
        policy_number: paymentData.policy_number,
        payment_date: paymentData.payment_date,
        payment_amount: paymentData.payment_amount,
        payment_reference: paymentData.payment_reference || null,
        payment_method: paymentData.payment_method || null,
        payment_status: paymentData.payment_status || 'verified',
        additional_field_1: paymentData.additional_field_1 || null,
        additional_field_2: paymentData.additional_field_2 || null,
        uploaded_by_admin_id: paymentData.uploaded_by_admin_id,
        uploaded_at: paymentData.uploaded_at || new Date().toISOString()
      }
      
      const response = await cslPaymentApi.post('/csl_payments', payload)
      return response.data
    } catch (error) {
      console.error('Failed to create payment:', error)
      throw error
    }
  }
  
  /**
   * Bulk upload payments
   * @param {Array} paymentsArray - Array of payment objects
   * @param {number} adminId - Admin user ID
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload results
   */
  async bulkUpload(paymentsArray, adminId, onProgress = null) {
    const results = {
      total: paymentsArray.length,
      uploaded: 0,
      errors: []
    }
    
    // Process in batches of 10
    const batchSize = 10
    
    for (let i = 0; i < paymentsArray.length; i += batchSize) {
      const batch = paymentsArray.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (payment, index) => {
        try {
          await this.createPayment({
            ...payment,
            uploaded_by_admin_id: adminId,
            uploaded_at: new Date().toISOString()
          })
          
          results.uploaded++
          
          // Call progress callback
          if (onProgress) {
            onProgress({
              processed: i + index + 1,
              total: results.total,
              uploaded: results.uploaded
            })
          }
        } catch (error) {
          results.errors.push({
            policy_number: payment.policy_number,
            error: error.message
          })
        }
      })
      
      await Promise.all(batchPromises)
    }
    
    return results
  }
  
  /**
   * Get payment verification status for a policy
   * Returns a user-friendly status object
   * Only includes payments made AFTER the policy was created in the system
   * @param {string} policyNumber - Policy number
   * @param {string|number} policyCreatedAt - Policy creation timestamp (optional)
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(policyNumber, policyCreatedAt = null) {
    try {
      let payments = await this.getPaymentsForPolicy(policyNumber)
      
      // Filter payments to only show those AFTER policy creation
      if (policyCreatedAt && payments.length > 0) {
        // Xano created_at is already in milliseconds, no need to multiply by 1000
        const policyCreatedDate = new Date(policyCreatedAt)
        
        payments = payments.filter(payment => {
          const paymentDate = new Date(payment.payment_date)
          return paymentDate >= policyCreatedDate
        })
        
        console.log(`Filtered payments for policy ${policyNumber}: ${payments.length} payments after ${policyCreatedDate.toISOString()}`)
      }
      
      if (payments.length === 0) {
        return {
          verified: false,
          message: 'No payment found',
          payments: []
        }
      }
      
      // Get latest payment
      const latestPayment = payments[0]
      
      return {
        verified: true,
        message: 'Payment verified',
        latestPayment: {
          amount: latestPayment.payment_amount,
          date: latestPayment.payment_date,
          reference: latestPayment.payment_reference,
          method: latestPayment.payment_method,
          status: latestPayment.payment_status
        },
        payments: payments
      }
    } catch (error) {
      console.error('Failed to get payment status:', error)
      return {
        verified: false,
        message: 'Error checking payment status',
        error: error.message,
        payments: []
      }
    }
  }
}

export const cslPaymentService = new CSLPaymentService()
export default cslPaymentService
