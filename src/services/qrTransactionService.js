import { qrTransactionsApi } from './apiClient'

/**
 * QR Transaction Service
 * Manages QR code transaction logging and tracking
 */
class QRTransactionService {
  constructor() {
    this.baseUrl = '/nic_qr_transactions'
  }

  /**
   * Log QR generation to database
   * @param {Object} qrData - QR data from ZwennPay
   * @param {Object} customerData - Customer information
   * @param {Object} agentData - Agent information
   * @param {string} qrType - 'customer_detail' or 'quick_qr'
   * @returns {Promise<Object>} Created transaction record
   */
  async logQRGeneration(qrData, customerData, agentData, qrType) {
    try {
      console.log('🔄 Logging QR transaction...', {
        qrType,
        policyNumber: customerData.policyNumber,
        agentId: agentData?.id
      })

      const transaction = {
        qr_data: qrData,
        policy_number: customerData.policyNumber || customerData.policy_number,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_mobile: customerData.mobile,
        amount: parseFloat(customerData.amountDue || customerData.amount_due),
        line_of_business: customerData.lineOfBusiness || customerData.line_of_business,
        merchant_id: customerData.merchantId || customerData.merchant_id,
        agent_id: agentData?.id || null,
        agent_email: agentData?.email || null,
        agent_name: agentData?.name || null,
        qr_type: qrType,
        customer_id: customerData.id || null,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      const response = await qrTransactionsApi.post(this.baseUrl, transaction)
      
      console.log('✅ QR transaction logged successfully:', response.data.id)
      
      return {
        success: true,
        transaction: response.data
      }
    } catch (error) {
      console.error('❌ Failed to log QR transaction:', error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Update QR transaction status (typically called by webhook)
   * @param {number} transactionId - Transaction ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransactionStatus(transactionId, updateData) {
    try {
      const response = await qrTransactionsApi.patch(`${this.baseUrl}/${transactionId}`, updateData)
      
      console.log('✅ QR transaction status updated:', transactionId, updateData.status)
      
      return {
        success: true,
        transaction: response.data
      }
    } catch (error) {
      console.error('❌ Failed to update QR transaction:', error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Mark transaction as paid
   * @param {string} qrData - QR data to find transaction
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Updated transaction
   */
  async markAsPaid(qrData, paymentData) {
    try {
      // Find transaction by QR data
      const transaction = await this.findByQRData(qrData)
      
      if (!transaction) {
        throw new Error('Transaction not found for QR data')
      }

      const updateData = {
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: paymentData.reference,
        payment_amount: parseFloat(paymentData.amount),
        webhook_data: JSON.stringify(paymentData)
      }

      return await this.updateTransactionStatus(transaction.id, updateData)
    } catch (error) {
      console.error('❌ Failed to mark transaction as paid:', error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Find transaction by QR data
   * @param {string} qrData - QR data string
   * @returns {Promise<Object|null>} Transaction record or null
   */
  async findByQRData(qrData) {
    try {
      const response = await qrTransactionsApi.get(this.baseUrl, {
        params: {
          qr_data: qrData,
          status: 'pending'
        }
      })

      return response.data.length > 0 ? response.data[0] : null
    } catch (error) {
      console.error('❌ Failed to find transaction by QR data:', error)
      return null
    }
  }

  /**
   * Find transaction by policy number
   * @param {string} policyNumber - Policy number
   * @returns {Promise<Object|null>} Transaction record or null
   */
  async findByPolicyNumber(policyNumber) {
    try {
      const response = await qrTransactionsApi.get(this.baseUrl, {
        params: {
          policy_number: policyNumber,
          status: 'pending'
        }
      })

      return response.data.length > 0 ? response.data[0] : null
    } catch (error) {
      console.error('❌ Failed to find transaction by policy number:', error)
      return null
    }
  }

  /**
   * Get agent's QR transaction history
   * @param {number} agentId - Agent ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Paginated transaction history
   */
  async getAgentHistory(agentId, filters = {}) {
    try {
      const params = {
        agent_id: agentId,
        ...filters
      }

      const response = await qrTransactionsApi.get(this.baseUrl, { params })
      
      return {
        success: true,
        transactions: response.data,
        total: response.headers['x-total-count'] || response.data.length
      }
    } catch (error) {
      console.error('❌ Failed to get agent QR history:', error)
      
      return {
        success: false,
        error: error.message,
        transactions: []
      }
    }
  }

  /**
   * Get QR analytics and metrics
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    try {
      const response = await qrTransactionsApi.get(this.baseUrl, {
        params: filters
      })

      const transactions = response.data
      
      // Calculate analytics
      const analytics = {
        total_generated: transactions.length,
        total_paid: transactions.filter(t => t.status === 'paid').length,
        total_pending: transactions.filter(t => t.status === 'pending').length,
        total_amount: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
        paid_amount: transactions
          .filter(t => t.status === 'paid')
          .reduce((sum, t) => sum + parseFloat(t.payment_amount || t.amount || 0), 0),
        conversion_rate: 0,
        by_lob: {},
        by_agent: {},
        by_qr_type: {}
      }

      // Calculate conversion rate
      if (analytics.total_generated > 0) {
        analytics.conversion_rate = (analytics.total_paid / analytics.total_generated) * 100
      }

      // Group by line of business
      transactions.forEach(t => {
        const lob = t.line_of_business || 'unknown'
        if (!analytics.by_lob[lob]) {
          analytics.by_lob[lob] = { generated: 0, paid: 0, amount: 0 }
        }
        analytics.by_lob[lob].generated++
        if (t.status === 'paid') {
          analytics.by_lob[lob].paid++
          analytics.by_lob[lob].amount += parseFloat(t.payment_amount || t.amount || 0)
        }
      })

      // Group by agent
      transactions.forEach(t => {
        if (t.agent_id) {
          const agentKey = `${t.agent_id}_${t.agent_name || 'Unknown'}`
          if (!analytics.by_agent[agentKey]) {
            analytics.by_agent[agentKey] = { generated: 0, paid: 0, amount: 0 }
          }
          analytics.by_agent[agentKey].generated++
          if (t.status === 'paid') {
            analytics.by_agent[agentKey].paid++
            analytics.by_agent[agentKey].amount += parseFloat(t.payment_amount || t.amount || 0)
          }
        }
      })

      // Group by QR type
      transactions.forEach(t => {
        const qrType = t.qr_type || 'unknown'
        if (!analytics.by_qr_type[qrType]) {
          analytics.by_qr_type[qrType] = { generated: 0, paid: 0, amount: 0 }
        }
        analytics.by_qr_type[qrType].generated++
        if (t.status === 'paid') {
          analytics.by_qr_type[qrType].paid++
          analytics.by_qr_type[qrType].amount += parseFloat(t.payment_amount || t.amount || 0)
        }
      })

      return {
        success: true,
        analytics
      }
    } catch (error) {
      console.error('❌ Failed to get QR analytics:', error)
      
      return {
        success: false,
        error: error.message,
        analytics: null
      }
    }
  }

  /**
   * Get recent QR transactions
   * @param {number} limit - Number of records to fetch
   * @returns {Promise<Object>} Recent transactions
   */
  async getRecentTransactions(limit = 10) {
    try {
      const response = await qrTransactionsApi.get(this.baseUrl, {
        params: {
          per_page: limit,
          sort: 'created_at',
          order: 'desc'
        }
      })

      return {
        success: true,
        transactions: response.data
      }
    } catch (error) {
      console.error('❌ Failed to get recent transactions:', error)
      
      return {
        success: false,
        error: error.message,
        transactions: []
      }
    }
  }

  /**
   * Search transactions
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>} Search results
   */
  async searchTransactions(query, filters = {}) {
    try {
      const params = {
        search: query,
        ...filters
      }

      const response = await qrTransactionsApi.get(this.baseUrl, { params })
      
      return {
        success: true,
        transactions: response.data,
        total: response.headers['x-total-count'] || response.data.length
      }
    } catch (error) {
      console.error('❌ Failed to search transactions:', error)
      
      return {
        success: false,
        error: error.message,
        transactions: []
      }
    }
  }

  /**
   * Delete transaction (admin only)
   * @param {number} transactionId - Transaction ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteTransaction(transactionId) {
    try {
      await qrTransactionsApi.delete(`${this.baseUrl}/${transactionId}`)
      
      console.log('✅ QR transaction deleted:', transactionId)
      
      return {
        success: true
      }
    } catch (error) {
      console.error('❌ Failed to delete QR transaction:', error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Bulk update transactions (admin only)
   * @param {Array} transactionIds - Array of transaction IDs
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdateTransactions(transactionIds, updateData) {
    try {
      const promises = transactionIds.map(id => 
        this.updateTransactionStatus(id, updateData)
      )

      const results = await Promise.all(promises)
      const successful = results.filter(r => r.success).length
      
      console.log(`✅ Bulk updated ${successful}/${transactionIds.length} transactions`)
      
      return {
        success: true,
        updated: successful,
        total: transactionIds.length
      }
    } catch (error) {
      console.error('❌ Failed to bulk update transactions:', error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const qrTransactionService = new QRTransactionService()