import { paymentApi } from './apiClient'
import { qrService } from './qrService'

// Installment Service - handles individual installment operations
export const installmentService = {
  // Create installments for a payment plan
  async createInstallments(paymentPlanId, installmentSchedule) {
    try {
      const installments = []
      
      for (const installmentData of installmentSchedule) {
        // Generate QR code for each installment
        const customerData = {
          amountDue: installmentData.amount,
          policyNumber: `PLAN-${paymentPlanId}-${installmentData.installment_number}`,
          name: `Installment ${installmentData.installment_number}`,
          mobile: '23012345678' // Default mobile for installments
        }
        
        const qrCodeData = await qrService.generatePaymentQR(customerData)
        
        const installment = {
          payment_plan: paymentPlanId,  // Changed from payment_plan_id to payment_plan
          ...installmentData,
          qr_code_data: qrCodeData.success ? qrCodeData.qrData : null,
          qr_code_url: qrCodeData.success ? qrCodeData.qrCodeUrl : null,
          zwennpay_reference: qrCodeData.success ? `PLAN-${paymentPlanId}-${installmentData.installment_number}` : null,
          reminder_sent_count: 0
        }
        
        const response = await paymentApi.post('/nic_cc_installment', installment)
        installments.push(response.data)
      }
      
      return installments
    } catch (error) {
      console.error('Error creating installments:', error)
      throw error
    }
  },

  // Get all installments for a payment plan
  async getPaymentPlanInstallments(paymentPlanId) {
    try {
      console.log(`🔍 Getting installments for payment plan: ${paymentPlanId}`)
      
      // Get ALL installments and filter in JavaScript (Xano filtering not working properly)
      const response = await paymentApi.get('/nic_cc_installment')
      const allInstallments = response.data || []
      
      console.log(`📊 Total installments in database: ${allInstallments.length}`)
      
      // Filter for this specific payment plan
      const planInstallments = allInstallments.filter(installment => 
        installment.payment_plan === parseInt(paymentPlanId)
      )
      
      console.log(`✅ Installments for payment plan ${paymentPlanId}: ${planInstallments.length}`)
      
      if (planInstallments.length > 20) {
        console.error(`⚠️ WARNING: Found ${planInstallments.length} installments for payment plan ${paymentPlanId}. This seems excessive!`)
        console.error('First few installments:', planInstallments.slice(0, 3))
      }
      
      return planInstallments
    } catch (error) {
      console.error('Error fetching installments:', error)
      throw error
    }
  },

  // Get installment by ID
  async getInstallment(installmentId) {
    try {
      const response = await paymentApi.get(`/nic_cc_installment/${installmentId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching installment:', error)
      throw error
    }
  },

  // Update installment
  async updateInstallment(installmentId, updateData) {
    try {
      const response = await paymentApi.patch(`/nic_cc_installment/${installmentId}`, updateData)
      return response.data
    } catch (error) {
      console.error('Error updating installment:', error)
      throw error
    }
  },

  // Mark installment as paid
  async markInstallmentPaid(installmentId, paymentData = {}) {
    try {
      const updateData = {
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: paymentData.method || 'online',
        ...paymentData
      }
      
      const response = await paymentApi.patch(`/nic_cc_installment/${installmentId}`, updateData)
      return response.data
    } catch (error) {
      console.error('Error marking installment as paid:', error)
      throw error
    }
  },

  // Get overdue installments
  async getOverdueInstallments() {
    try {
      const today = new Date()
      const gracePeriodDate = new Date(today)
      gracePeriodDate.setDate(today.getDate() - 7) // 1 week grace period
      
      const response = await paymentApi.get('/nic_cc_installment', {
        params: {
          status: 'pending',
          due_date_lt: gracePeriodDate.toISOString().split('T')[0]
        }
      })
      
      return response.data || []
    } catch (error) {
      console.error('Error fetching overdue installments:', error)
      throw error
    }
  },

  // Get upcoming installments (due in next 7 days)
  async getUpcomingInstallments() {
    try {
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      
      const response = await paymentApi.get('/nic_cc_installment', {
        params: {
          status: 'pending',
          due_date_gte: today.toISOString().split('T')[0],
          due_date_lte: nextWeek.toISOString().split('T')[0]
        }
      })
      
      return response.data || []
    } catch (error) {
      console.error('Error fetching upcoming installments:', error)
      throw error
    }
  },

  // Update installment reminder count
  async updateReminderSent(installmentId) {
    try {
      const installment = await this.getInstallment(installmentId)
      const updateData = {
        reminder_sent_count: (installment.reminder_sent_count || 0) + 1,
        last_reminder_sent: new Date().toISOString()
      }
      
      const response = await paymentApi.patch(`/nic_cc_installment/${installmentId}`, updateData)
      return response.data
    } catch (error) {
      console.error('Error updating reminder count:', error)
      throw error
    }
  },

  // Mark overdue installments
  async markOverdueInstallments() {
    try {
      const overdueInstallments = await this.getOverdueInstallments()
      const updates = []
      
      for (const installment of overdueInstallments) {
        const response = await paymentApi.patch(`/nic_cc_installment/${installment.id}`, {
          status: 'overdue'
        })
        updates.push(response.data)
      }
      
      return updates
    } catch (error) {
      console.error('Error marking overdue installments:', error)
      throw error
    }
  },

  // Generate reminder URL for installment
  generateReminderUrl(installmentId) {
    const baseUrl = window.location.origin
    return `${baseUrl}/reminder/${installmentId}`
  },

  // Get installment summary for a payment plan
  async getInstallmentSummary(paymentPlanId) {
    try {
      const installments = await this.getPaymentPlanInstallments(paymentPlanId)
      
      const summary = {
        total: installments.length,
        paid: installments.filter(i => i.status === 'paid').length,
        pending: installments.filter(i => i.status === 'pending').length,
        overdue: installments.filter(i => i.status === 'overdue').length,
        totalAmount: installments.reduce((sum, i) => sum + i.amount, 0),
        paidAmount: installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
      }
      
      summary.remainingAmount = summary.totalAmount - summary.paidAmount
      summary.completionPercentage = Math.round((summary.paid / summary.total) * 100)
      
      return summary
    } catch (error) {
      console.error('Error getting installment summary:', error)
      throw error
    }
  }
}