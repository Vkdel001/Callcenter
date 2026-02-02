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
   * @param {Object} branchData - Branch information (optional)
   * @returns {Promise<Object>} Created transaction record
   */
  async logQRGeneration(qrData, customerData, agentData, qrType, branchData = null) {
    try {
      console.log('🔄 Logging QR transaction...', {
        qrType,
        policyNumber: customerData.policyNumber,
        agentId: agentData?.id,
        branchId: branchData?.id
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
        agent: agentData?.id || null,
        agent_email: agentData?.email || null,
        agent_name: agentData?.name || null,
        qr_type: qrType,
        customer_id: customerData.id || null,
        // NEW: Branch information
        branch_id: branchData?.id || null,
        branch_email: branchData?.notification_email || null,
        status: 'pending',
        created_at: new Date().toISOString()
      }

      const response = await qrTransactionsApi.post(this.baseUrl, transaction)
      
      console.log('✅ QR transaction logged successfully:', response.data.id)
      if (branchData) {
        console.log('📧 Branch email will be notified:', branchData.notification_email)
      }
      
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
      // Note: Since agent ID is not properly stored in database (all records have agent: 0),
      // we need to filter on the frontend by agent_name matching the current user's name
      const params = {
        ...filters
        // Removed agent filter since it doesn't work (all records have agent: 0)
      }

      const response = await qrTransactionsApi.get(this.baseUrl, { params })
      
      // Since database doesn't have proper agent ID filtering, we need to filter on frontend
      // by matching agent_name with current user's name
      let filteredTransactions = response.data
      
      // Get current user info from localStorage to filter by agent_name
      try {
        const userInfo = JSON.parse(localStorage.getItem('user') || '{}')
        if (userInfo.name) {
          filteredTransactions = response.data.filter(transaction => 
            transaction.agent_name === userInfo.name
          )
          console.log(`🔍 Filtered QR transactions: ${response.data.length} total → ${filteredTransactions.length} for agent "${userInfo.name}"`)
        }
      } catch (error) {
        console.warn('Could not filter by agent name:', error)
      }
      
      return {
        success: true,
        transactions: filteredTransactions,
        total: filteredTransactions.length
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

  /**
   * Get admin QR performance report (Agent Summary View)
   * @param {Object} filters - { date_from, date_to, line_of_business, agent_id, qr_type }
   * @returns {Promise<Object>} { success, data: { summary, agentPerformance } }
   */
  async getAdminQRPerformanceReport(filters = {}) {
    try {
      console.log('📊 Fetching admin QR performance report...', filters)

      // Fetch all QR transactions
      const response = await qrTransactionsApi.get(this.baseUrl)
      let transactions = response.data || []

      // Apply date range filter
      if (filters.date_from) {
        const startDate = new Date(filters.date_from)
        startDate.setHours(0, 0, 0, 0)
        transactions = transactions.filter(t => new Date(t.created_at) >= startDate)
      }
      if (filters.date_to) {
        const endDate = new Date(filters.date_to)
        endDate.setHours(23, 59, 59, 999)
        transactions = transactions.filter(t => new Date(t.created_at) <= endDate)
      }

      // Apply LOB filter
      if (filters.line_of_business && filters.line_of_business !== 'all') {
        transactions = transactions.filter(t => t.line_of_business === filters.line_of_business)
      }

      // Apply agent filter (by agent_name since agent ID is not reliable)
      if (filters.agent_name) {
        transactions = transactions.filter(t => t.agent_name === filters.agent_name)
      }

      // Apply QR type filter
      if (filters.qr_type && filters.qr_type !== 'all') {
        transactions = transactions.filter(t => t.qr_type === filters.qr_type)
      }

      // Group transactions by agent_name
      const agentMap = new Map()

      transactions.forEach(transaction => {
        const agentName = transaction.agent_name || 'Unknown Agent'
        
        if (!agentMap.has(agentName)) {
          agentMap.set(agentName, {
            agent_name: agentName,
            agent_email: transaction.agent_email || 'N/A',
            qrs_generated: 0,
            payments_received: 0,
            amount_generated: 0,
            amount_collected: 0,
            last_activity: transaction.created_at
          })
        }

        const agentData = agentMap.get(agentName)
        agentData.qrs_generated++
        agentData.amount_generated += parseFloat(transaction.amount || 0)

        if (transaction.status === 'paid') {
          agentData.payments_received++
          agentData.amount_collected += parseFloat(transaction.payment_amount || transaction.amount || 0)
        }

        // Update last activity if this transaction is more recent
        if (new Date(transaction.created_at) > new Date(agentData.last_activity)) {
          agentData.last_activity = transaction.created_at
        }
      })

      // Convert to array and calculate rates
      const agentPerformance = Array.from(agentMap.values()).map(agent => ({
        ...agent,
        conversion_rate: agent.qrs_generated > 0 
          ? ((agent.payments_received / agent.qrs_generated) * 100).toFixed(1)
          : '0.0',
        collection_rate: agent.amount_generated > 0
          ? ((agent.amount_collected / agent.amount_generated) * 100).toFixed(1)
          : '0.0'
      }))

      // Sort by conversion rate (descending)
      agentPerformance.sort((a, b) => parseFloat(b.conversion_rate) - parseFloat(a.conversion_rate))

      // Calculate overall summary
      const summary = {
        total_qrs_generated: transactions.length,
        total_payments_received: transactions.filter(t => t.status === 'paid').length,
        overall_conversion_rate: transactions.length > 0
          ? ((transactions.filter(t => t.status === 'paid').length / transactions.length) * 100).toFixed(1)
          : '0.0',
        total_amount_generated: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
        total_amount_collected: transactions
          .filter(t => t.status === 'paid')
          .reduce((sum, t) => sum + parseFloat(t.payment_amount || t.amount || 0), 0),
        overall_collection_rate: 0
      }

      summary.overall_collection_rate = summary.total_amount_generated > 0
        ? ((summary.total_amount_collected / summary.total_amount_generated) * 100).toFixed(1)
        : '0.0'

      console.log('✅ QR performance report generated:', {
        agents: agentPerformance.length,
        transactions: transactions.length
      })

      return {
        success: true,
        data: {
          summary,
          agentPerformance
        }
      }
    } catch (error) {
      console.error('❌ Failed to generate QR performance report:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get all QR transactions (Detailed Transactions View)
   * @param {Object} filters - { date_from, date_to, line_of_business, agent_name, qr_type, page, per_page }
   * @returns {Promise<Object>} { success, data: { transactions, total, summary } }
   */
  async getAllQRTransactions(filters = {}) {
    try {
      console.log('📋 Fetching all QR transactions...', filters)

      // Fetch all QR transactions
      const response = await qrTransactionsApi.get(this.baseUrl)
      let transactions = response.data || []

      // Apply date range filter
      if (filters.date_from) {
        const startDate = new Date(filters.date_from)
        startDate.setHours(0, 0, 0, 0)
        transactions = transactions.filter(t => new Date(t.created_at) >= startDate)
      }
      if (filters.date_to) {
        const endDate = new Date(filters.date_to)
        endDate.setHours(23, 59, 59, 999)
        transactions = transactions.filter(t => new Date(t.created_at) <= endDate)
      }

      // Apply LOB filter
      if (filters.line_of_business && filters.line_of_business !== 'all') {
        transactions = transactions.filter(t => t.line_of_business === filters.line_of_business)
      }

      // Apply agent filter
      if (filters.agent_name) {
        transactions = transactions.filter(t => t.agent_name === filters.agent_name)
      }

      // Apply QR type filter
      if (filters.qr_type && filters.qr_type !== 'all') {
        transactions = transactions.filter(t => t.qr_type === filters.qr_type)
      }

      // Sort by created_at (newest first)
      transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // Calculate summary
      const summary = {
        total_qrs: transactions.length,
        total_paid: transactions.filter(t => t.status === 'paid').length,
        total_pending: transactions.filter(t => t.status === 'pending').length,
        total_expired: transactions.filter(t => t.status === 'expired').length
      }

      // Apply pagination if specified
      const page = filters.page || 1
      const perPage = filters.per_page || 50
      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      const paginatedTransactions = transactions.slice(startIndex, endIndex)

      console.log('✅ QR transactions fetched:', {
        total: transactions.length,
        page,
        returned: paginatedTransactions.length
      })

      return {
        success: true,
        data: {
          transactions: paginatedTransactions,
          total: transactions.length,
          summary,
          page,
          per_page: perPage,
          total_pages: Math.ceil(transactions.length / perPage)
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch QR transactions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const qrTransactionService = new QRTransactionService()