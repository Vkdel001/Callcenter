import { qrService } from '../qrService'
import { cslInteractionService } from './cslInteractionService'

/**
 * CSL Adapter Service
 * Adapts CSL policy data to work with existing services (QR, Email, AOD, SMS)
 * This allows reuse of all existing functionality without modifying those services
 */
class CSLAdapterService {
  
  /**
   * Map CSL policy to customer format for existing services
   * @param {Object} cslPolicy - CSL policy object
   * @returns {Object} Customer-formatted object
   */
  mapCSLPolicyToCustomer(cslPolicy) {
    return {
      // DON'T pass id - CSL policies aren't in nic_cc_customer table
      // This triggers ad-hoc QR generation in qrService
      // id: cslPolicy.id,  // ❌ Removed - causes 404 error
      
      name: `${cslPolicy.owner1_first_name || ''} ${cslPolicy.owner1_surname || ''}`.trim(),
      email: cslPolicy.owner1_email,
      mobile: cslPolicy.owner1_mobile_no,
      policyNumber: cslPolicy.policy_number,
      policy_number: cslPolicy.policy_number,
      amountDue: parseFloat(cslPolicy.arrears_amount) || 0,
      amount_due: parseFloat(cslPolicy.arrears_amount) || 0,
      
      // Additional fields for AOD and other services
      title_owner1: cslPolicy.owner1_title,
      title_owner2: cslPolicy.owner2_title,
      name_owner2: cslPolicy.owner2_first_name && cslPolicy.owner2_surname 
        ? `${cslPolicy.owner2_first_name} ${cslPolicy.owner2_surname}`.trim()
        : null,
      address: [
        cslPolicy.owner1_address_1,
        cslPolicy.owner1_address_2,
        cslPolicy.owner1_address_3,
        cslPolicy.owner1_address_4
      ].filter(Boolean).join(', '),
      national_id: cslPolicy.owner1_nic,
      national_id_owner2: cslPolicy.owner2_nic,
      
      // Line of business (always 'life' for CSL)
      // This triggers ad-hoc QR generation (no DB lookup needed)
      lineOfBusiness: 'life',
      line_of_business: 'life'
    }
  }
  
  /**
   * Generate QR code for CSL policy
   * Reuses existing qrService without modification
   * @param {Object} cslPolicy - CSL policy object
   * @param {number} amount - Optional custom amount (defaults to arrears amount)
   * @returns {Promise<Object>} QR generation result
   */
  async generateQRForCSLPolicy(cslPolicy, amount = null) {
    try {
      console.log('🔷 Generating QR for CSL policy:', cslPolicy.policy_number)
      
      // Map CSL policy to customer format
      const customerData = this.mapCSLPolicyToCustomer(cslPolicy)
      
      // Override amount if specified
      if (amount !== null) {
        customerData.amountDue = amount
        customerData.amount_due = amount
      }
      
      // Call existing QR service (NO CHANGES to qrService.js)
      const qrResult = await qrService.generatePaymentQR(customerData)
      
      if (qrResult.success) {
        // Log action in CSL interactions
        await cslInteractionService.logAction(cslPolicy.id, 'qr_generated', {
          amount: customerData.amountDue,
          qrUrl: qrResult.qrCodeUrl,
          merchantId: qrResult.merchantId,
          lineOfBusiness: qrResult.lineOfBusiness
        })
        
        console.log('✅ QR generated successfully for CSL policy')
      }
      
      return qrResult
    } catch (error) {
      console.error('❌ Failed to generate QR for CSL policy:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Send email reminder for CSL policy
   * Reuses existing emailService without modification
   * @param {Object} cslPolicy - CSL policy object
   * @param {string} qrCodeUrl - QR code image URL
   * @param {string} paymentLink - Payment link
   * @param {Object} options - Email options (agentEmail, agentName, etc.)
   * @returns {Promise<Object>} Email send result
   */
  async sendEmailForCSLPolicy(cslPolicy, qrCodeUrl, paymentLink, options = {}) {
    try {
      console.log('📧 Sending email for CSL policy:', cslPolicy.policy_number)
      
      // Map CSL policy to customer format
      const customerData = this.mapCSLPolicyToCustomer(cslPolicy)
      
      // Import emailService dynamically to avoid circular dependencies
      const { emailService } = await import('../emailService')
      
      // Call existing email service (NO CHANGES to emailService.js)
      const result = await emailService.sendPaymentReminderEmail(
        customerData,
        qrCodeUrl,
        paymentLink,
        {
          agentEmail: options.agentEmail,
          agentName: options.agentName,
          lineOfBusiness: 'life',
          ccAgent: options.ccAgent !== undefined ? options.ccAgent : true
        }
      )
      
      if (result.success) {
        // Log action in CSL interactions
        await cslInteractionService.logAction(cslPolicy.id, 'email_sent', {
          emailId: result.messageId,
          recipient: customerData.email,
          ccAgent: options.ccAgent
        })
        
        console.log('✅ Email sent successfully for CSL policy')
      }
      
      return result
    } catch (error) {
      console.error('❌ Failed to send email for CSL policy:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Send SMS reminder for CSL policy
   * Reuses existing SMS functionality
   * @param {Object} cslPolicy - CSL policy object
   * @param {string} message - SMS message
   * @returns {Promise<Object>} SMS send result
   */
  async sendSMSForCSLPolicy(cslPolicy, message) {
    try {
      console.log('💬 Sending SMS for CSL policy:', cslPolicy.policy_number)
      
      // Map CSL policy to customer format
      const customerData = this.mapCSLPolicyToCustomer(cslPolicy)
      
      // Import emailService for SMS functionality
      const { emailService } = await import('../emailService')
      
      // Call existing SMS service
      const result = await emailService.sendSMS(customerData.mobile, message)
      
      if (result.success) {
        // Log action in CSL interactions
        await cslInteractionService.logAction(cslPolicy.id, 'sms_sent', {
          mobile: customerData.mobile,
          messageLength: message.length
        })
        
        console.log('✅ SMS sent successfully for CSL policy')
      }
      
      return result
    } catch (error) {
      console.error('❌ Failed to send SMS for CSL policy:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Send WhatsApp message for CSL policy
   * Reuses existing WhatsApp functionality
   * @param {Object} cslPolicy - CSL policy object
   * @param {string} qrCodeUrl - QR code image URL
   * @param {string} paymentLink - Payment link
   * @returns {Promise<Object>} WhatsApp send result
   */
  async sendWhatsAppForCSLPolicy(cslPolicy, qrCodeUrl, paymentLink) {
    try {
      console.log('📱 Sending WhatsApp for CSL policy:', cslPolicy.policy_number)
      
      // Map CSL policy to customer format
      const customerData = this.mapCSLPolicyToCustomer(cslPolicy)
      
      // Import customerService for WhatsApp functionality
      const { customerService } = await import('../customerService')
      
      // Call existing WhatsApp service
      const result = await customerService.sendWhatsApp(
        customerData,
        qrCodeUrl,
        paymentLink
      )
      
      if (result.success) {
        // Log action in CSL interactions
        await cslInteractionService.logAction(cslPolicy.id, 'whatsapp_sent', {
          mobile: customerData.mobile,
          qrUrl: qrCodeUrl
        })
        
        console.log('✅ WhatsApp sent successfully for CSL policy')
      }
      
      return result
    } catch (error) {
      console.error('❌ Failed to send WhatsApp for CSL policy:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Create AOD for CSL policy
   * Reuses existing AOD PDF service
   * @param {Object} cslPolicy - CSL policy object
   * @param {Object} aodData - AOD-specific data (payment plan, etc.)
   * @returns {Promise<Object>} AOD creation result
   */
  async createAODForCSLPolicy(cslPolicy, aodData) {
    try {
      console.log('📄 Creating AOD for CSL policy:', cslPolicy.policy_number)
      
      // Map CSL policy to customer format
      const customerData = this.mapCSLPolicyToCustomer(cslPolicy)
      
      // Import aodPdfService
      const { aodPdfService } = await import('../aodPdfService')
      
      // Merge customer data with AOD-specific data
      const aodPayload = {
        ...customerData,
        ...aodData
      }
      
      // Call existing AOD service
      const result = await aodPdfService.generateAOD(aodPayload)
      
      if (result.success) {
        // Log action in CSL interactions
        await cslInteractionService.logAction(cslPolicy.id, 'aod_created', {
          aodId: result.id,
          amount: aodData.amount || customerData.amountDue
        })
        
        console.log('✅ AOD created successfully for CSL policy')
      }
      
      return result
    } catch (error) {
      console.error('❌ Failed to create AOD for CSL policy:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Execute multiple actions for CSL policy
   * Used when interaction form submits with multiple actions selected
   * @param {Object} cslPolicy - CSL policy object
   * @param {Object} actions - Actions to execute
   * @returns {Promise<Object>} Results of all actions
   */
  async executeActionsForCSLPolicy(cslPolicy, actions) {
    const results = {
      success: true,
      qr: null,
      email: null,
      sms: null,
      whatsapp: null,
      aod: null,
      errors: []
    }
    
    try {
      // Generate QR if requested
      if (actions.generateQR) {
        const qrResult = await this.generateQRForCSLPolicy(
          cslPolicy,
          actions.qrAmount || null
        )
        results.qr = qrResult
        
        if (!qrResult.success) {
          results.errors.push('QR generation failed')
        }
        
        // Send email with QR if requested
        if (qrResult.success && actions.sendEmail) {
          const emailResult = await this.sendEmailForCSLPolicy(
            cslPolicy,
            qrResult.qrCodeUrl,
            qrResult.paymentLink,
            actions.emailOptions || {}
          )
          results.email = emailResult
          
          if (!emailResult.success) {
            results.errors.push('Email sending failed')
          }
        }
        
        // Send WhatsApp with QR if requested
        if (qrResult.success && actions.sendWhatsApp) {
          const whatsappResult = await this.sendWhatsAppForCSLPolicy(
            cslPolicy,
            qrResult.qrCodeUrl,
            qrResult.paymentLink
          )
          results.whatsapp = whatsappResult
          
          if (!whatsappResult.success) {
            results.errors.push('WhatsApp sending failed')
          }
        }
      }
      
      // Send SMS if requested
      if (actions.sendSMS && actions.smsMessage) {
        const smsResult = await this.sendSMSForCSLPolicy(
          cslPolicy,
          actions.smsMessage
        )
        results.sms = smsResult
        
        if (!smsResult.success) {
          results.errors.push('SMS sending failed')
        }
      }
      
      // Create AOD if requested
      if (actions.createAOD && actions.aodData) {
        const aodResult = await this.createAODForCSLPolicy(
          cslPolicy,
          actions.aodData
        )
        results.aod = aodResult
        
        if (!aodResult.success) {
          results.errors.push('AOD creation failed')
        }
      }
      
      // Set overall success based on errors
      results.success = results.errors.length === 0
      
      return results
    } catch (error) {
      console.error('❌ Failed to execute actions for CSL policy:', error)
      results.success = false
      results.errors.push(error.message)
      return results
    }
  }
}

export const cslAdapterService = new CSLAdapterService()
export default cslAdapterService
