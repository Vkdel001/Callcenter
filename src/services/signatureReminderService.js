import { paymentApi } from './apiClient'
import { emailService } from './emailService'
import { customerService } from './customerService'
import { installmentService } from './installmentService'

class SignatureReminderService {
  constructor() {
    this.reminderSchedule = [7, 14, 21] // Days when to send reminders
    this.expiryDays = 30
  }

  // Get AODs that need signature reminders
  async getAODsNeedingSignatureReminders() {
    try {
      // Get all payment plans with pending signatures
      const response = await paymentApi.get('/nic_cc_payment_plan', {
        params: { signature_status: 'pending_signature' }
      })
      const pendingAODs = response.data || []

      const today = new Date()
      const aodsNeedingReminders = []

      for (const aod of pendingAODs) {
        const createdDate = new Date(aod.agreement_date)
        const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24))
        const reminderCount = aod.signature_reminder_count || 0

        // Check if it's time for a reminder
        const shouldSendReminder = this.reminderSchedule.includes(daysSinceCreation) && 
                                   reminderCount < this.reminderSchedule.length

        // Check if AOD should expire
        const shouldExpire = daysSinceCreation >= this.expiryDays

        if (shouldSendReminder || shouldExpire) {
          aodsNeedingReminders.push({
            ...aod,
            daysSinceCreation,
            shouldSendReminder,
            shouldExpire,
            reminderNumber: reminderCount + 1
          })
        }
      }

      return aodsNeedingReminders
    } catch (error) {
      console.error('Error getting AODs needing signature reminders:', error)
      throw error
    }
  }

  // Process signature reminders and expirations
  async processSignatureReminders() {
    try {
      const aodsToProcess = await this.getAODsNeedingSignatureReminders()
      
      if (aodsToProcess.length === 0) {
        return {
          success: true,
          message: 'No signature reminders needed',
          processed: 0,
          reminders: 0,
          expired: 0
        }
      }

      let remindersSent = 0
      let aodsExpired = 0
      const results = []

      for (const aod of aodsToProcess) {
        try {
          if (aod.shouldExpire) {
            // Expire the AOD
            await this.expireAOD(aod)
            aodsExpired++
            results.push({
              aodId: aod.id,
              action: 'expired',
              success: true
            })
          } else if (aod.shouldSendReminder) {
            // Send signature reminder
            const result = await this.sendSignatureReminder(aod)
            if (result.success) {
              remindersSent++
            }
            results.push({
              aodId: aod.id,
              action: 'reminder',
              reminderNumber: aod.reminderNumber,
              success: result.success,
              error: result.error
            })
          }
        } catch (error) {
          console.error(`Error processing AOD ${aod.id}:`, error)
          results.push({
            aodId: aod.id,
            action: 'error',
            success: false,
            error: error.message
          })
        }
      }

      return {
        success: true,
        message: `Processed ${aodsToProcess.length} AODs: ${remindersSent} reminders sent, ${aodsExpired} expired`,
        processed: aodsToProcess.length,
        reminders: remindersSent,
        expired: aodsExpired,
        results
      }
    } catch (error) {
      console.error('Error processing signature reminders:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Send signature reminder email
  async sendSignatureReminder(aod) {
    try {
      // Get customer details
      const customer = await customerService.getCustomerById(aod.customer)
      if (!customer) {
        throw new Error('Customer not found')
      }

      // Get agent details for BCC
      const agentResponse = await paymentApi.get(`/nic_cc_agent/${aod.created_by_agent}`)
      const agent = agentResponse.data

      const reminderNumber = aod.reminderNumber
      const daysRemaining = this.expiryDays - aod.daysSinceCreation

      // Send reminder email
      const emailResult = await emailService.sendSignatureReminderEmail(
        customer,
        aod,
        reminderNumber,
        daysRemaining,
        agent
      )

      if (emailResult.success) {
        // Update reminder count
        await paymentApi.patch(`/nic_cc_payment_plan/${aod.id}`, {
          signature_reminder_count: reminderNumber,
          last_signature_reminder: new Date().toISOString()
        })
      }

      return emailResult
    } catch (error) {
      console.error('Error sending signature reminder:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Expire an AOD
  async expireAOD(aod) {
    try {
      // Update AOD status to expired
      await paymentApi.patch(`/nic_cc_payment_plan/${aod.id}`, {
        signature_status: 'expired',
        status: 'expired',
        expired_date: new Date().toISOString()
      })

      // Get customer and agent for notification
      const customer = await customerService.getCustomerById(aod.customer)
      const agentResponse = await paymentApi.get(`/nic_cc_agent/${aod.created_by_agent}`)
      const agent = agentResponse.data

      // Send expiry notification
      await emailService.sendAODExpiryNotification(customer, aod, agent)

      console.log(`AOD ${aod.id} expired after 30 days without signature`)
      return { success: true }
    } catch (error) {
      console.error('Error expiring AOD:', error)
      throw error
    }
  }

  // Mark AOD signature as received (called by agent)
  async markSignatureReceived(aodId, agentId) {
    try {
      const today = new Date()
      
      // Update AOD status
      const updateData = {
        signature_status: 'received',
        signature_received_date: today.toISOString(),
        approved_by_agent: agentId,
        status: 'active' // Activate the AOD
      }

      // If it's an installment plan, recalculate dates from today
      const aodResponse = await paymentApi.get(`/nic_cc_payment_plan/${aodId}`)
      const aod = aodResponse.data

      if (aod.payment_method === 'installments') {
        // Recalculate start date to be 7 days from signature received
        const newStartDate = new Date(today)
        newStartDate.setDate(today.getDate() + 7)
        
        const newEndDate = new Date(newStartDate)
        newEndDate.setMonth(newStartDate.getMonth() + aod.total_installments)

        updateData.start_date = newStartDate.toISOString().split('T')[0]
        updateData.end_date = newEndDate.toISOString().split('T')[0]
        updateData.dates_recalculated = true

        // Update installment due dates
        await this.recalculateInstallmentDates(aodId, newStartDate, aod.total_installments)
      }

      await paymentApi.patch(`/nic_cc_payment_plan/${aodId}`, updateData)

      // Send confirmation email to customer
      const customer = await customerService.getCustomerById(aod.customer)
      await emailService.sendAODActivationConfirmation(customer, aod)

      return {
        success: true,
        message: 'AOD signature confirmed and payment plan activated',
        aod: { ...aod, ...updateData }
      }
    } catch (error) {
      console.error('Error marking signature received:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Recalculate installment due dates
  async recalculateInstallmentDates(aodId, startDate, totalInstallments) {
    try {
      // Get all installments for this AOD
      const installments = await installmentService.getPaymentPlanInstallments(aodId)

      // Safety check - ensure we don't have too many installments
      if (installments.length > totalInstallments + 5) { // Allow some buffer
        console.error(`⚠️ WARNING: Found ${installments.length} installments for AOD ${aodId}, expected ${totalInstallments}`)
        console.error('This might indicate a data issue. Aborting date recalculation to prevent damage.')
        return
      }

      console.log(`Recalculating ${installments.length} installment dates for AOD ${aodId} (expected: ${totalInstallments})`)

      // Update each installment's due date
      for (let i = 0; i < installments.length; i++) {
        const installment = installments[i]
        const newDueDate = new Date(startDate)
        newDueDate.setMonth(startDate.getMonth() + i)

        await paymentApi.patch(`/nic_cc_installment/${installment.id}`, {
          due_date: newDueDate.toISOString().split('T')[0]
        })
      }

      console.log(`✅ Successfully recalculated ${installments.length} installment dates for AOD ${aodId}`)
    } catch (error) {
      console.error('Error recalculating installment dates:', error)
      throw error
    }
  }

  // Get signature statistics
  async getSignatureStats() {
    try {
      const response = await paymentApi.get('/nic_cc_payment_plan')
      const allAODs = response.data || []

      const stats = {
        pending: 0,
        received: 0,
        expired: 0,
        overdue: 0, // Pending for more than 21 days
        total: allAODs.length
      }

      const today = new Date()

      for (const aod of allAODs) {
        const signatureStatus = aod.signature_status || 'received' // Default for old AODs
        
        if (signatureStatus === 'pending_signature') {
          stats.pending++
          
          const createdDate = new Date(aod.agreement_date)
          const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24))
          
          if (daysSinceCreation > 21) {
            stats.overdue++
          }
        } else if (signatureStatus === 'received') {
          stats.received++
        } else if (signatureStatus === 'expired') {
          stats.expired++
        }
      }

      return stats
    } catch (error) {
      console.error('Error getting signature stats:', error)
      throw error
    }
  }
}

export const signatureReminderService = new SignatureReminderService()