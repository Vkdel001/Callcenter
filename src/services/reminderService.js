import { installmentService } from './installmentService'
import { paymentPlanService } from './paymentPlanService'
import { customerService } from './customerService'
import { emailService } from './emailService'
import { paymentApi } from './apiClient'

class ReminderService {
  constructor() {
    this.reminderDays = 7 // Send reminder 7 days before due date
    this.overdueGraceDays = 7 // Grace period before marking overdue
  }

  // Find installments that need reminders
  async getInstallmentsNeedingReminders() {
    try {
      // Get all pending installments
      const allInstallments = await this.getAllPendingInstallments()
      
      const today = new Date()
      const reminderDate = new Date()
      reminderDate.setDate(today.getDate() + this.reminderDays)
      
      const installmentsNeedingReminders = allInstallments.filter(installment => {
        const dueDate = new Date(installment.due_date)
        const daysDifference = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
        
        // Only send 2 reminders: 7 days before and 3 days before due date
        // Stop sending if already sent 2 reminders
        const reminderCount = installment.reminder_sent_count || 0;
        if (reminderCount >= 2) {
          return false;
        }

        // Send reminder if due in 7 days (first reminder) or 3 days (second reminder)
        return (daysDifference === 7 && reminderCount === 0) || (daysDifference === 3 && reminderCount === 1)
      })

      return installmentsNeedingReminders
    } catch (error) {
      console.error('Error finding installments needing reminders:', error)
      throw error
    }
  }

  // Get all pending installments from all payment plans
  async getAllPendingInstallments() {
    try {
      // Get all installments and filter properly
      const response = await paymentApi.get('/nic_cc_installment')
      const allInstallments = response.data || []
      
      console.log(`📊 Total installments in database: ${allInstallments.length}`)
      
      // Filter for pending installments only
      const pendingInstallments = allInstallments.filter(installment => 
        installment.status === 'pending' || installment.status === 'overdue'
      )
      
      console.log(`📋 Pending/overdue installments: ${pendingInstallments.length}`)

      // Check if each installment belongs to an active AOD
      const activeInstallments = []
      for (const installment of pendingInstallments) {
        if (installment.payment_plan && installment.payment_plan !== 0) {
          try {
            const paymentPlan = await paymentPlanService.getPaymentPlan(installment.payment_plan)
            // Only include installments from active AODs (not pending signature or expired)
            if (paymentPlan && 
                paymentPlan.status === 'active' && 
                paymentPlan.signature_status !== 'pending_signature' && 
                paymentPlan.signature_status !== 'expired') {
              activeInstallments.push(installment)
            }
          } catch (error) {
            console.warn(`Could not verify payment plan ${installment.payment_plan} for installment ${installment.id}`)
          }
        }
      }

      return activeInstallments
    } catch (error) {
      console.error('Error fetching all pending installments:', error)
      throw error
    }
  }

  // Get upcoming installments (due in next 30 days)
  async getUpcomingInstallments() {
    try {
      const allInstallments = await this.getAllPendingInstallments()
      const today = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(today.getDate() + 30)

      return allInstallments.filter(installment => {
        const dueDate = new Date(installment.due_date)
        return dueDate >= today && dueDate <= thirtyDaysFromNow
      }).sort((a, b) => {
        // First sort by installment number (ascending) to prioritize earlier installments
        const installmentDiff = (a.installment_number || 0) - (b.installment_number || 0)
        if (installmentDiff !== 0) return installmentDiff
        
        // If installment numbers are the same, sort by due date
        return new Date(a.due_date) - new Date(b.due_date)
      })
    } catch (error) {
      console.error('Error fetching upcoming installments:', error)
      throw error
    }
  }

  // Get overdue installments
  async getOverdueInstallments() {
    try {
      const allInstallments = await this.getAllPendingInstallments()
      const today = new Date()

      return allInstallments.filter(installment => {
        const dueDate = new Date(installment.due_date)
        return dueDate < today
      }).sort((a, b) => {
        // First sort by installment number (ascending) to prioritize earlier installments
        const installmentDiff = (a.installment_number || 0) - (b.installment_number || 0)
        if (installmentDiff !== 0) return installmentDiff
        
        // If installment numbers are the same, sort by due date
        return new Date(a.due_date) - new Date(b.due_date)
      })
    } catch (error) {
      console.error('Error fetching overdue installments:', error)
      throw error
    }
  }

  // Send reminder for a specific installment
  async sendInstallmentReminder(installmentId) {
    try {
      // Get installment details
      const installment = await installmentService.getInstallment(installmentId)
      if (!installment) {
        throw new Error('Installment not found')
      }

      console.log('Installment for reminder:', installment)
      console.log('Payment plan ID from installment:', installment.payment_plan)

      // Handle orphaned installments (payment_plan = 0 or null)
      if (!installment.payment_plan || installment.payment_plan === 0) {
        console.warn(`Orphaned installment detected: ${installmentId}`)
        
        // Try to find an active payment plan for this installment
        const activePaymentPlan = await this.findActivePaymentPlanForOrphanedInstallment(installment)
        
        if (activePaymentPlan) {
          console.log(`Attempting to fix orphaned installment ${installmentId} by linking to payment plan ${activePaymentPlan.id}`)
          
          try {
            // Update the installment to link it to the correct payment plan
            await installmentService.updateInstallment(installmentId, {
              payment_plan: activePaymentPlan.id
            })
            installment.payment_plan = activePaymentPlan.id
            console.log(`✅ Successfully fixed orphaned installment ${installmentId} - linked to payment plan ${activePaymentPlan.id}`)
          } catch (updateError) {
            console.error('Failed to update orphaned installment:', updateError)
            throw new Error('Failed to fix orphaned installment. Please create a new AOD.')
          }
        } else {
          // Provide more helpful error message
          throw new Error('This installment is from a cancelled payment plan and cannot be used for reminders. Please create a new AOD or contact support to fix the data.')
        }
      }

      // Get payment plan details
      const paymentPlan = await paymentPlanService.getPaymentPlan(installment.payment_plan)
      if (!paymentPlan) {
        throw new Error('Payment plan not found')
      }

      // Get customer details
      const customer = await customerService.getCustomerById(paymentPlan.customer)
      if (!customer) {
        throw new Error('Customer not found')
      }

      // Get agent details for CC
      let agent = null
      if (paymentPlan.created_by_agent) {
        try {
          const { agentApi } = await import('./apiClient')
          const agentResponse = await agentApi.get(`/nic_cc_agent/${paymentPlan.created_by_agent}`)
          agent = agentResponse.data
          console.log('Found agent for CC:', agent.name || agent.email)
        } catch (agentError) {
          console.warn('Could not fetch agent for CC:', agentError.message)
          // Continue without agent CC - don't fail the reminder
        }
      }

      // Generate reminder URL
      const reminderUrl = this.generateReminderUrl(installmentId)

      // Ensure installment has QR code - generate if missing
      if (!installment.qr_code_url) {
        console.log('Generating QR code for installment reminder...')
        try {
          const { qrService } = await import('./qrService')
          
          // Create customer data for QR generation
          const qrCustomerData = {
            name: customer.name,
            email: customer.email,
            mobile: customer.mobile,
            policyNumber: paymentPlan.policy_number,
            amountDue: installment.amount,
            lineOfBusiness: customer.lineOfBusiness || 'life'
          }
          
          const qrResult = await qrService.generatePaymentQR(qrCustomerData)
          
          if (qrResult.success) {
            // Update installment with QR code
            installment.qr_code_url = qrResult.qrCodeUrl
            installment.qr_code_data = qrResult.qrData
            
            // Save QR code to database for future use
            await installmentService.updateInstallment(installmentId, {
              qr_code_url: qrResult.qrCodeUrl,
              qr_code_data: qrResult.qrData,
              zwennpay_reference: qrResult.reference
            })
            
            console.log('✅ QR code generated and saved for installment')
          } else {
            console.warn('⚠️ Failed to generate QR code for installment:', qrResult.error)
          }
        } catch (qrError) {
          console.error('❌ Error generating QR code for installment:', qrError)
          // Continue without QR code - don't fail the reminder
        }
      }

      // Send reminder (email + SMS) with agent CC
      const result = await emailService.sendInstallmentReminder(
        customer,
        installment,
        paymentPlan,
        reminderUrl,
        agent
      )

      // Update reminder count
      if (result.success) {
        await installmentService.updateReminderSent(installmentId)
      }

      return {
        success: result.success,
        installment,
        customer,
        paymentPlan,
        agent,
        reminderResult: result
      }
    } catch (error) {
      console.error('Error sending installment reminder:', error)
      throw error
    }
  }

  // Send reminders for multiple installments
  async sendBulkReminders(installmentIds) {
    const results = []
    
    for (const installmentId of installmentIds) {
      try {
        const result = await this.sendInstallmentReminder(installmentId)
        results.push({
          installmentId,
          success: true,
          result
        })
      } catch (error) {
        results.push({
          installmentId,
          success: false,
          error: error.message
        })
      }
    }

    return {
      total: installmentIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  }

  // Process all reminders that need to be sent today
  async processScheduledReminders() {
    try {
      const installmentsNeedingReminders = await this.getInstallmentsNeedingReminders()
      
      if (installmentsNeedingReminders.length === 0) {
        return {
          success: true,
          message: 'No reminders needed today',
          processed: 0
        }
      }

      const installmentIds = installmentsNeedingReminders.map(i => i.id)
      const results = await this.sendBulkReminders(installmentIds)

      return {
        success: true,
        message: `Processed ${results.total} reminders: ${results.successful} successful, ${results.failed} failed`,
        ...results
      }
    } catch (error) {
      console.error('Error processing scheduled reminders:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Generate reminder URL for installment
  generateReminderUrl(installmentId) {
    const baseUrl = window.location.origin
    return `${baseUrl}/reminder/${installmentId}`
  }

  // Get reminder statistics
  async getReminderStats() {
    try {
      const upcoming = await this.getUpcomingInstallments()
      const overdue = await this.getOverdueInstallments()
      const needingReminders = await this.getInstallmentsNeedingReminders()

      const today = new Date()
      const dueTodayCount = upcoming.filter(i => {
        const dueDate = new Date(i.due_date)
        return dueDate.toDateString() === today.toDateString()
      }).length

      return {
        upcoming: upcoming.length,
        overdue: overdue.length,
        dueToday: dueTodayCount,
        needingReminders: needingReminders.length,
        upcomingInstallments: upcoming.slice(0, 10), // First 10 upcoming
        overdueInstallments: overdue.slice(0, 10) // First 10 overdue
      }
    } catch (error) {
      console.error('Error getting reminder stats:', error)
      throw error
    }
  }

  // Check if installment needs reminder based on due date
  shouldSendReminder(installment) {
    const today = new Date()
    const dueDate = new Date(installment.due_date)
    const daysDifference = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
    const reminderCount = installment.reminder_sent_count || 0
    
    // Only send 2 reminders: 7 days before and 3 days before due date
    if (reminderCount >= 2) {
      return false
    }

    // Send reminder if due in 7 days (first reminder) or 3 days (second reminder)
    return (daysDifference === 7 && reminderCount === 0) || (daysDifference === 3 && reminderCount === 1)
  }

  // Try to find an active payment plan for an orphaned installment
  async findActivePaymentPlanForOrphanedInstallment(installment) {
    try {
      console.log('Looking for active payment plan for orphaned installment:', installment)

      // Strategy 1: Get all active payment plans and find the best match
      const activePlans = await paymentPlanService.getAllActivePlans()
      console.log('Found active plans:', activePlans)

      if (activePlans.length === 0) {
        return null
      }

      // Strategy 2: Look for plans with matching installment amounts
      for (const plan of activePlans) {
        if (plan.payment_method === 'installments') {
          console.log(`Comparing plan ${plan.id}: installment_amount=${plan.installment_amount}, installment.amount=${installment.amount}`)
          
          // Check if amounts match (within 1 MUR tolerance)
          if (Math.abs(plan.installment_amount - installment.amount) < 1) {
            console.log(`Found matching plan ${plan.id} for orphaned installment`)
            return plan
          }
        }
      }

      // Strategy 3: If there's only one active plan, assume it's the right one
      if (activePlans.length === 1) {
        console.log(`Only one active plan found (${activePlans[0].id}), using it for orphaned installment`)
        return activePlans[0]
      }

      return null
    } catch (error) {
      console.error('Error finding active payment plan for orphaned installment:', error)
      return null
    }
  }

  // Format installment for display
  formatInstallmentForDisplay(installment, paymentPlan, customer) {
    const dueDate = new Date(installment.due_date)
    const today = new Date()
    const daysDifference = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
    
    let status = 'upcoming'
    let statusText = `Due in ${daysDifference} days`
    
    if (daysDifference === 0) {
      status = 'due-today'
      statusText = 'Due today'
    } else if (daysDifference < 0) {
      status = 'overdue'
      statusText = `${Math.abs(daysDifference)} days overdue`
    }

    return {
      id: installment.id,
      customerName: customer?.name || 'Unknown',
      policyNumber: paymentPlan?.policy_number || 'Unknown',
      installmentNumber: installment.installment_number,
      totalInstallments: paymentPlan?.total_installments || 0,
      amount: installment.amount,
      dueDate: dueDate.toLocaleDateString(),
      status,
      statusText,
      reminderCount: installment.reminder_sent_count || 0,
      lastReminderSent: installment.last_reminder_sent ? new Date(installment.last_reminder_sent).toLocaleDateString() : null
    }
  }
}

export const reminderService = new ReminderService()