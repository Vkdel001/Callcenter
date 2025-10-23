import { paymentApi } from './apiClient'

// Payment Plan Service - handles all payment plan operations
export const paymentPlanService = {
  // Create a new payment plan
  async createPaymentPlan(paymentPlanData) {
    try {
      const response = await paymentApi.post('/nic_cc_payment_plan', paymentPlanData)
      return response.data
    } catch (error) {
      console.error('Error creating payment plan:', error)
      throw error
    }
  },

  // Get all payment plans for a customer
  async getCustomerPaymentPlans(customerId) {
    try {
      const response = await paymentApi.get('/nic_cc_payment_plan', {
        params: { customer_id: customerId }
      })
      return response.data || []
    } catch (error) {
      console.error('Error fetching customer payment plans:', error)
      throw error
    }
  },

  // Get payment plan by ID
  async getPaymentPlan(planId) {
    try {
      // Validate plan ID
      if (!planId || planId === 0 || planId === '0') {
        throw new Error('Invalid payment plan ID')
      }

      const response = await paymentApi.get(`/nic_cc_payment_plan/${planId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching payment plan:', error)
      
      // If it's a 400 error, try fetching all plans and filter
      if (error.response?.status === 400) {
        try {
          console.log('Trying alternative approach - fetching all plans')
          const allPlansResponse = await paymentApi.get('/nic_cc_payment_plan')
          const allPlans = allPlansResponse.data || []
          const plan = allPlans.find(p => p.id === parseInt(planId))
          
          if (plan) {
            return plan
          } else {
            throw new Error(`Payment plan with ID ${planId} not found`)
          }
        } catch (fallbackError) {
          console.error('Fallback approach also failed:', fallbackError)
          throw error
        }
      }
      
      throw error
    }
  },

  // Update payment plan
  async updatePaymentPlan(planId, updateData) {
    try {
      const response = await paymentApi.patch(`/nic_cc_payment_plan/${planId}`, updateData)
      return response.data
    } catch (error) {
      console.error('Error updating payment plan:', error)
      throw error
    }
  },

  // Cancel payment plan
  async cancelPaymentPlan(planId) {
    try {
      // First, cancel all associated installments
      await this.cancelPaymentPlanInstallments(planId)
      
      // Then cancel the payment plan itself
      const response = await paymentApi.patch(`/nic_cc_payment_plan/${planId}`, {
        status: 'cancelled'
      })
      return response.data
    } catch (error) {
      console.error('Error cancelling payment plan:', error)
      throw error
    }
  },

  // Cancel all installments for a payment plan
  async cancelPaymentPlanInstallments(planId) {
    try {
      // Get all installments for this payment plan
      const installmentsResponse = await paymentApi.get('/nic_cc_installment', {
        params: { payment_plan: planId }
      })
      const installments = installmentsResponse.data || []

      // Cancel each pending installment
      for (const installment of installments) {
        if (installment.status === 'pending') {
          await paymentApi.patch(`/nic_cc_installment/${installment.id}`, {
            status: 'cancelled'
          })
        }
      }

      console.log(`Cancelled ${installments.length} installments for payment plan ${planId}`)
    } catch (error) {
      console.error('Error cancelling payment plan installments:', error)
      // Don't throw here - we still want to cancel the payment plan even if installment cleanup fails
    }
  },

  // Get active payment plan for a policy
  async getActivePlanForPolicy(policyNumber) {
    try {
      console.log(`🔍 Looking for AODs with policy number: ${policyNumber}`)
      
      // Get ALL payment plans (Xano filtering might not work properly)
      const response = await paymentApi.get('/nic_cc_payment_plan')
      const allPlans = response.data || []
      
      console.log(`📊 Total AODs in database: ${allPlans.length}`)
      
      // Filter for this specific policy number first
      const policyPlans = allPlans.filter(plan => plan.policy_number === policyNumber)
      console.log(`📋 AODs for policy ${policyNumber}: ${policyPlans.length}`)
      
      if (policyPlans.length > 0) {
        console.log('Policy AODs found:', policyPlans.map(p => ({id: p.id, status: p.status, signature_status: p.signature_status})))
      }
      
      // Filter for truly active plans (not cancelled, not expired)
      const activePlans = policyPlans.filter(plan => {
        // Must have active status
        if (plan.status !== 'active') return false
        
        // If it has signature workflow, check signature status
        if (plan.signature_status) {
          // Don't consider expired signature plans as active
          if (plan.signature_status === 'expired') return false
        }
        
        return true
      })
      
      console.log(`✅ Truly active AODs for policy ${policyNumber}: ${activePlans.length}`)
      if (activePlans.length > 0) {
        console.log('Active AOD details:', activePlans[0])
      }
      
      return activePlans[0] || null
    } catch (error) {
      console.error('Error fetching active plan for policy:', error)
      throw error
    }
  },

  // Get all active payment plans
  async getAllActivePlans() {
    try {
      const response = await paymentApi.get('/nic_cc_payment_plan', {
        params: { status: 'active' }
      })
      return response.data || []
    } catch (error) {
      console.error('Error fetching all active plans:', error)
      return []
    }
  },

  // Get customer's active AOD with installments
  async getCustomerActiveAOD(customerId) {
    try {
      const response = await paymentApi.get('/nic_cc_payment_plan')
      const allPlans = response.data || []
      
      // Find customer's truly active AOD
      const customerAODs = allPlans.filter(plan => {
        const planCustomerId = plan.customer
        const customerIdNum = parseInt(customerId)
        const isMatch = planCustomerId === customerIdNum
        
        if (!isMatch) return false
        
        // Must have active status
        if (plan.status !== 'active') return false
        
        // If it has signature workflow, check signature status
        if (plan.signature_status) {
          // Don't consider expired signature plans as active
          if (plan.signature_status === 'expired') return false
        }
        
        return true
      })
      
      console.log(`Found ${customerAODs.length} truly active AODs for customer ${customerId}`)
      
      return customerAODs[0] || null
    } catch (error) {
      console.error('Error fetching customer active AOD:', error)
      throw error
    }
  },

  // Calculate installment details
  calculateInstallments(outstandingAmount, downPayment = 0, months = 12) {
    const remainingAmount = outstandingAmount - downPayment
    const installmentAmount = Math.round((remainingAmount / months) * 100) / 100
    
    return {
      remainingAmount,
      installmentAmount,
      totalInstallments: months,
      totalAmount: outstandingAmount
    }
  },

  // Generate installment schedule
  generateInstallmentSchedule(startDate, months, installmentAmount) {
    const schedule = []
    const start = new Date(startDate)
    
    for (let i = 0; i < months; i++) {
      const dueDate = new Date(start)
      dueDate.setMonth(start.getMonth() + i)
      
      schedule.push({
        installment_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        status: 'pending'
      })
    }
    
    return schedule
  },

  // Clean up orphaned installments (installments with payment_plan = 0 or invalid references)
  async cleanupOrphanedInstallments() {
    try {
      // Get all installments
      const response = await paymentApi.get('/nic_cc_installment')
      const allInstallments = response.data || []

      // Find orphaned installments (payment_plan = 0 or null)
      const orphanedInstallments = allInstallments.filter(installment => 
        !installment.payment_plan || installment.payment_plan === 0
      )

      if (orphanedInstallments.length === 0) {
        return { cleaned: 0, message: 'No orphaned installments found' }
      }

      // Cancel orphaned installments
      let cleanedCount = 0
      for (const installment of orphanedInstallments) {
        try {
          await paymentApi.patch(`/nic_cc_installment/${installment.id}`, {
            status: 'cancelled',
            notes: 'Cancelled - orphaned installment cleanup'
          })
          cleanedCount++
        } catch (error) {
          console.error(`Failed to clean up installment ${installment.id}:`, error)
        }
      }

      return {
        cleaned: cleanedCount,
        total: orphanedInstallments.length,
        message: `Cleaned up ${cleanedCount} of ${orphanedInstallments.length} orphaned installments`
      }
    } catch (error) {
      console.error('Error cleaning up orphaned installments:', error)
      throw error
    }
  }
}