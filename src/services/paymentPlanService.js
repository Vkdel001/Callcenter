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
      const response = await paymentApi.get(`/nic_cc_payment_plan/${planId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching payment plan:', error)
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
      const response = await paymentApi.patch(`/nic_cc_payment_plan/${planId}`, {
        status: 'cancelled'
      })
      return response.data
    } catch (error) {
      console.error('Error cancelling payment plan:', error)
      throw error
    }
  },

  // Get active payment plan for a policy
  async getActivePlanForPolicy(policyNumber) {
    try {
      const response = await paymentApi.get('/nic_cc_payment_plan', {
        params: { 
          policy_number: policyNumber,
          status: 'active'
        }
      })
      return response.data?.[0] || null
    } catch (error) {
      console.error('Error fetching active plan for policy:', error)
      throw error
    }
  },

  // Get customer's active AOD with installments
  async getCustomerActiveAOD(customerId) {
    try {
      const response = await paymentApi.get('/nic_cc_payment_plan')
      const allPlans = response.data || []
      
      // Find customer's active AOD
      const customerAOD = allPlans.find(plan => {
        const planCustomerId = plan.customer
        const customerIdNum = parseInt(customerId)
        const isMatch = planCustomerId === customerIdNum
        const isActive = plan.status === 'active'
        
        return isMatch && isActive
      })
      
      return customerAOD || null
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
  }
}