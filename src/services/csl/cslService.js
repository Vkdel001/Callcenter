/**
 * CSL Service - Main Service
 * Unified interface for all CSL operations
 * Combines policy, interaction, payment, dropdown, and adapter services
 */

import { cslPolicyService } from './cslPolicyService'
import { cslInteractionService } from './cslInteractionService'
import { cslPaymentService } from './cslPaymentService'
import { cslDropdownService } from './cslDropdownService'
import { cslAdapterService } from './cslAdapterService'

class CSLService {
  constructor() {
    // Expose individual services
    this.policy = cslPolicyService
    this.interaction = cslInteractionService
    this.payment = cslPaymentService
    this.dropdown = cslDropdownService
    this.adapter = cslAdapterService
  }
  
  /**
   * Get complete policy details with interactions and payment status
   * @param {number} policyId - Policy ID
   * @returns {Promise<Object>} Complete policy details
   */
  async getPolicyDetails(policyId) {
    try {
      // Get policy
      const policy = await this.policy.getPolicyById(policyId)
      
      if (!policy) {
        return null
      }
      
      // Get interactions
      const interactions = await this.interaction.getInteractionsForPolicy(policyId)
      
      // Get payment status (only payments after policy creation)
      const paymentStatus = await this.payment.getPaymentStatus(policy.policy_number, policy.created_at)
      
      return {
        policy,
        interactions,
        paymentStatus,
        hasPayment: paymentStatus.verified
      }
    } catch (error) {
      console.error('Failed to get policy details:', error)
      return null
    }
  }
  
  /**
   * Get dashboard statistics for CSL agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>} Dashboard stats
   */
  async getDashboardStats(agentId) {
    try {
      // Get assigned policies
      const policies = await this.policy.getPoliciesForAgent(agentId)
      
      // Get today's interactions
      const today = new Date().toISOString().split('T')[0]
      const allInteractions = await this.interaction.getInteractionsByAgent(agentId)
      const todayInteractions = allInteractions.filter(
        interaction => interaction.client_calling_date === today
      )
      
      // Calculate total arrears
      const totalArrears = policies.reduce(
        (sum, policy) => sum + (parseFloat(policy.arrears_amount) || 0),
        0
      )
      
      // Count policies with follow-up today
      const followUpToday = policies.filter(policy => {
        const latestInteraction = allInteractions.find(
          interaction => interaction.csl_policy_id === policy.id
        )
        return latestInteraction && latestInteraction.follow_up_date === today
      }).length
      
      return {
        totalPolicies: policies.length,
        contactedToday: todayInteractions.length,
        followUpToday,
        totalArrears
      }
    } catch (error) {
      console.error('Failed to get dashboard stats:', error)
      return {
        totalPolicies: 0,
        contactedToday: 0,
        followUpToday: 0,
        totalArrears: 0
      }
    }
  }
  
  /**
   * Log a complete interaction with actions
   * @param {Object} interactionData - Interaction data
   * @param {Object} actions - Actions to execute
   * @returns {Promise<Object>} Result
   */
  async logInteractionWithActions(interactionData, actions) {
    try {
      // Create interaction
      const interaction = await this.interaction.createInteraction(interactionData)
      
      // Get policy for actions
      const policy = await this.policy.getPolicyById(interactionData.csl_policy_id || interactionData.policyId)
      
      if (!policy) {
        throw new Error('Policy not found')
      }
      
      // Execute actions if any
      let actionResults = null
      if (actions && Object.keys(actions).length > 0) {
        actionResults = await this.adapter.executeActionsForCSLPolicy(policy, actions)
      }
      
      return {
        success: true,
        interaction,
        actionResults
      }
    } catch (error) {
      console.error('Failed to log interaction with actions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Process payment upload and update interactions
   * @param {Array} paymentsArray - Array of payment objects
   * @param {number} adminId - Admin user ID
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload results with interaction updates
   */
  async processPaymentUpload(paymentsArray, adminId, onProgress = null) {
    const results = {
      total: paymentsArray.length,
      uploaded: 0,
      interactionsUpdated: 0,
      policiesNotFound: [],
      errors: []
    }
    
    for (let i = 0; i < paymentsArray.length; i++) {
      const payment = paymentsArray[i]
      
      try {
        // 1. Upload payment
        await this.payment.createPayment({
          ...payment,
          uploaded_by_admin_id: adminId,
          uploaded_at: new Date().toISOString()
        })
        results.uploaded++
        
        // 2. Find policy
        const policy = await this.policy.getByPolicyNumber(payment.policy_number)
        
        if (!policy) {
          results.policiesNotFound.push(payment.policy_number)
          continue
        }
        
        // 3. Find latest interaction
        const latestInteraction = await this.interaction.getLatestInteractionForPolicy(policy.id)
        
        if (latestInteraction) {
          // 4. Determine recovery type
          const recoveryType = payment.payment_amount >= parseFloat(policy.arrears_amount)
            ? 'full'
            : 'partial'
          
          // 5. Update interaction
          await this.interaction.updateInteraction(latestInteraction.id, {
            amountPaidPerNicSystem: payment.payment_amount,
            recoveryType: recoveryType,
            actionsTaken: {
              ...latestInteraction.actionsTaken,
              payment_verified: {
                amount: payment.payment_amount,
                date: payment.payment_date,
                reference: payment.payment_reference,
                method: payment.payment_method,
                verified_at: new Date().toISOString(),
                verified_by_admin_id: adminId
              }
            }
          })
          
          results.interactionsUpdated++
        }
        
        // Call progress callback
        if (onProgress) {
          onProgress({
            processed: i + 1,
            total: results.total,
            uploaded: results.uploaded,
            interactionsUpdated: results.interactionsUpdated
          })
        }
      } catch (error) {
        results.errors.push({
          policy_number: payment.policy_number,
          error: error.message
        })
      }
    }
    
    return results
  }
}

export const cslService = new CSLService()
export default cslService
