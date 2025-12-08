import axios from 'axios'

// Xano configuration
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io'
const CSL_INTERACTION_API_KEY = 'jwfdvZTP'

// Create API client for CSL interactions
const createCSLInteractionClient = () => {
  const client = axios.create({
    baseURL: `${XANO_BASE_URL}/api:${CSL_INTERACTION_API_KEY}`,
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

const cslInteractionApi = createCSLInteractionClient()

/**
 * CSL Interaction Service
 * Manages CSL call center interactions and logging
 */
class CSLInteractionService {
  
  /**
   * Get all interactions for a specific policy
   * @param {number} policyId - CSL Policy ID
   * @returns {Promise<Array>} Array of interactions
   */
  async getInteractionsForPolicy(policyId) {
    try {
      const response = await cslInteractionApi.get('/csl_interactions')
      const allInteractions = response.data || []
      
      // Filter by policy ID - handle both string and number types
      const policyInteractions = allInteractions.filter(interaction => {
        return interaction.csl_policy_id === policyId || 
               interaction.csl_policy_id === parseInt(policyId) ||
               parseInt(interaction.csl_policy_id) === parseInt(policyId)
      })
      
      // Sort by date (newest first)
      policyInteractions.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
      
      return policyInteractions.map(interaction => this.transformInteraction(interaction))
    } catch (error) {
      console.error('Failed to get interactions for policy:', error)
      return []
    }
  }
  
  /**
   * Get latest interaction for a policy
   * @param {number} policyId - CSL Policy ID
   * @returns {Promise<Object|null>} Latest interaction or null
   */
  async getLatestInteractionForPolicy(policyId) {
    try {
      const interactions = await this.getInteractionsForPolicy(policyId)
      return interactions.length > 0 ? interactions[0] : null
    } catch (error) {
      console.error('Failed to get latest interaction:', error)
      return null
    }
  }
  
  /**
   * Get all interactions by an agent
   * @param {number} agentId - Agent ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of interactions
   */
  async getInteractionsByAgent(agentId, filters = {}) {
    try {
      const response = await cslInteractionApi.get('/csl_interactions')
      const allInteractions = response.data || []
      
      // Filter by agent ID
      let agentInteractions = allInteractions.filter(
        interaction => interaction.agent_id === agentId
      )
      
      // Apply additional filters
      if (filters.startDate) {
        agentInteractions = agentInteractions.filter(
          interaction => new Date(interaction.client_calling_date) >= new Date(filters.startDate)
        )
      }
      
      if (filters.endDate) {
        agentInteractions = agentInteractions.filter(
          interaction => new Date(interaction.client_calling_date) <= new Date(filters.endDate)
        )
      }
      
      // Sort by date (newest first)
      agentInteractions.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
      
      return agentInteractions.map(interaction => this.transformInteraction(interaction))
    } catch (error) {
      console.error('Failed to get interactions by agent:', error)
      return []
    }
  }
  
  /**
   * Create a new interaction and auto-assign policy to agent
   * @param {Object} interactionData - Interaction data
   * @returns {Promise<Object>} Created interaction
   */
  async createInteraction(interactionData) {
    try {
      // Helper to convert empty strings to null
      const toNullIfEmpty = (value) => (value === '' || value === undefined) ? null : value
      
      // Build complete payload with all fields
      const payload = {
        csl_policy_id: interactionData.policyId,
        agent_id: interactionData.agentId,
        client_calling_date: interactionData.callingDate,
        calling_remarks: interactionData.remarks || '',
        recovery_type: toNullIfEmpty(interactionData.recoveryType),
        amount_paid: interactionData.amountPaid || 0,
        standing_order_status: toNullIfEmpty(interactionData.standingOrderStatus),
        request_for_aod: interactionData.requestForAod || false,
        ptp_case: interactionData.ptpCase || false,
        follow_up_date: toNullIfEmpty(interactionData.followUpDate),
        outcome_1: toNullIfEmpty(interactionData.outcome1),
        sub_outcome: toNullIfEmpty(interactionData.subOutcome),
        amount_paid_per_nic_system: interactionData.amountPaidPerNicSystem || 0,
        promise_to_pay_amount: interactionData.promiseToPayAmount || 0,
        promise_to_pay_week: toNullIfEmpty(interactionData.promiseToPayWeek),
        reason_for_non_payment: toNullIfEmpty(interactionData.reasonForNonPayment),
        mode_of_payment: toNullIfEmpty(interactionData.modeOfPayment),
        updated_contact: toNullIfEmpty(interactionData.updatedContact),
        updated_email: toNullIfEmpty(interactionData.updatedEmail),
        updated_frequency: toNullIfEmpty(interactionData.updatedFrequency),
        actions_taken: interactionData.actionsTaken || {}
      }
      
      console.log('📤 Creating interaction with payload:', JSON.stringify(payload, null, 2))
      
      // Create the interaction
      const response = await cslInteractionApi.post('/csl_interactions', payload)
      console.log('✅ Interaction created:', response.data)
      const interaction = this.transformInteraction(response.data)
      
      // Auto-assign policy to agent if not already assigned
      // AND update policy contact info if provided
      if (interactionData.policyId && interactionData.agentId) {
        try {
          // Import policy service
          const { cslPolicyService } = await import('./cslPolicyService.js')
          
          // Get the policy to check if it's assigned
          const policy = await cslPolicyService.getPolicyById(interactionData.policyId)
          
          if (policy) {
            // If policy is not assigned, assign it to this agent
            if (!policy.assigned_to_agent_id || policy.assigned_to_agent_id === null) {
              console.log(`🎯 Auto-assigning policy ${interactionData.policyId} to agent ${interactionData.agentId}`)
              await cslPolicyService.assignPolicyToAgent(
                interactionData.policyId,
                interactionData.agentId
              )
            }
            
            // Update policy contact info if provided
            const contactUpdates = {}
            if (interactionData.updatedContact) {
              contactUpdates.owner1_mobile_no = interactionData.updatedContact
              console.log(`📱 Updating policy mobile: ${interactionData.updatedContact}`)
            }
            if (interactionData.updatedEmail) {
              contactUpdates.owner1_email = interactionData.updatedEmail
              console.log(`📧 Updating policy email: ${interactionData.updatedEmail}`)
            }
            if (interactionData.updatedFrequency) {
              contactUpdates.frequency = interactionData.updatedFrequency
              console.log(`📅 Updating policy frequency: ${interactionData.updatedFrequency}`)
            }
            
            // Apply contact updates if any
            if (Object.keys(contactUpdates).length > 0) {
              await cslPolicyService.updatePolicy(interactionData.policyId, contactUpdates)
              console.log(`✅ Policy contact info updated`)
            }
          }
        } catch (assignError) {
          console.error('Failed to auto-assign/update policy:', assignError)
          // Don't throw - interaction was created successfully
        }
      }
      
      return interaction
    } catch (error) {
      console.error('❌ Failed to create interaction:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      throw error
    }
  }
  
  /**
   * Update an existing interaction
   * @param {number} id - Interaction ID
   * @param {Object} interactionData - Updated interaction data
   * @returns {Promise<Object>} Updated interaction
   */
  async updateInteraction(id, interactionData) {
    try {
      const updatePayload = {}
      
      if (interactionData.callingDate !== undefined) updatePayload.client_calling_date = interactionData.callingDate
      if (interactionData.remarks !== undefined) updatePayload.calling_remarks = interactionData.remarks
      if (interactionData.recoveryType !== undefined) updatePayload.recovery_type = interactionData.recoveryType
      if (interactionData.amountPaid !== undefined) updatePayload.amount_paid = interactionData.amountPaid
      if (interactionData.standingOrderStatus !== undefined) updatePayload.standing_order_status = interactionData.standingOrderStatus
      if (interactionData.requestForAod !== undefined) updatePayload.request_for_aod = interactionData.requestForAod
      if (interactionData.ptpCase !== undefined) updatePayload.ptp_case = interactionData.ptpCase
      if (interactionData.followUpDate !== undefined) updatePayload.follow_up_date = interactionData.followUpDate
      if (interactionData.outcome1 !== undefined) updatePayload.outcome_1 = interactionData.outcome1
      if (interactionData.subOutcome !== undefined) updatePayload.sub_outcome = interactionData.subOutcome
      if (interactionData.amountPaidPerNicSystem !== undefined) updatePayload.amount_paid_per_nic_system = interactionData.amountPaidPerNicSystem
      if (interactionData.promiseToPayAmount !== undefined) updatePayload.promise_to_pay_amount = interactionData.promiseToPayAmount
      if (interactionData.promiseToPayWeek !== undefined) updatePayload.promise_to_pay_week = interactionData.promiseToPayWeek
      if (interactionData.reasonForNonPayment !== undefined) updatePayload.reason_for_non_payment = interactionData.reasonForNonPayment
      if (interactionData.modeOfPayment !== undefined) updatePayload.mode_of_payment = interactionData.modeOfPayment
      if (interactionData.updatedContact !== undefined) updatePayload.updated_contact = interactionData.updatedContact
      if (interactionData.updatedEmail !== undefined) updatePayload.updated_email = interactionData.updatedEmail
      if (interactionData.updatedFrequency !== undefined) updatePayload.updated_frequency = interactionData.updatedFrequency
      if (interactionData.actionsTaken !== undefined) updatePayload.actions_taken = interactionData.actionsTaken
      
      const response = await cslInteractionApi.patch(`/csl_interactions/${id}`, updatePayload)
      return this.transformInteraction(response.data)
    } catch (error) {
      console.error('Failed to update interaction:', error)
      throw error
    }
  }
  
  /**
   * Log an action taken during interaction (QR generated, email sent, etc.)
   * @param {number} policyId - CSL Policy ID
   * @param {string} actionType - Type of action (e.g., 'qr_generated', 'email_sent')
   * @param {Object} actionData - Action details
   * @returns {Promise<boolean>} Success status
   */
  async logAction(policyId, actionType, actionData) {
    try {
      // Get latest interaction for this policy
      const latestInteraction = await this.getLatestInteractionForPolicy(policyId)
      
      if (!latestInteraction) {
        console.warn(`No interaction found for policy ${policyId}, cannot log action`)
        return false
      }
      
      // Update actions_taken JSON
      const currentActions = latestInteraction.actionsTaken || {}
      const updatedActions = {
        ...currentActions,
        [actionType]: {
          ...actionData,
          timestamp: new Date().toISOString()
        }
      }
      
      await this.updateInteraction(latestInteraction.id, {
        actionsTaken: updatedActions
      })
      
      console.log(`Action logged: ${actionType} for policy ${policyId}`)
      return true
    } catch (error) {
      console.error('Failed to log action:', error)
      return false
    }
  }
  
  /**
   * Transform interaction from Xano format to frontend format
   * @param {Object} interaction - Raw interaction from Xano
   * @returns {Object} Transformed interaction
   */
  transformInteraction(interaction) {
    return {
      id: interaction.id,
      policyId: interaction.csl_policy_id,
      agentId: interaction.agent_id,
      
      // Calling date - both formats
      callingDate: interaction.client_calling_date,
      client_calling_date: interaction.client_calling_date,
      
      // Remarks - both formats
      remarks: interaction.calling_remarks,
      calling_remarks: interaction.calling_remarks,
      
      // Recovery type - both formats
      recoveryType: interaction.recovery_type,
      recovery_type: interaction.recovery_type,
      
      // Amount paid - both formats
      amountPaid: interaction.amount_paid,
      amount_paid: interaction.amount_paid,
      
      // Standing order - both formats
      standingOrderStatus: interaction.standing_order_status,
      standing_order_status: interaction.standing_order_status,
      
      requestForAod: interaction.request_for_aod,
      ptpCase: interaction.ptp_case,
      
      // Follow up date - both formats
      followUpDate: interaction.follow_up_date,
      follow_up_date: interaction.follow_up_date,
      
      // Outcome - both formats
      outcome1: interaction.outcome_1,
      outcome_1: interaction.outcome_1,
      
      subOutcome: interaction.sub_outcome,
      amountPaidPerNicSystem: interaction.amount_paid_per_nic_system,
      promiseToPayAmount: interaction.promise_to_pay_amount,
      promiseToPayWeek: interaction.promise_to_pay_week,
      reasonForNonPayment: interaction.reason_for_non_payment,
      
      // Mode of payment - both formats
      modeOfPayment: interaction.mode_of_payment,
      mode_of_payment: interaction.mode_of_payment,
      
      updatedContact: interaction.updated_contact,
      updatedEmail: interaction.updated_email,
      updatedFrequency: interaction.updated_frequency,
      actionsTaken: interaction.actions_taken || {},
      
      // Timestamps - both formats
      createdAt: interaction.created_at,
      created_at: interaction.created_at,
      updatedAt: interaction.updated_at
    }
  }
}

export const cslInteractionService = new CSLInteractionService()
export default cslInteractionService
