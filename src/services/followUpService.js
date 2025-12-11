import { customerApi, calllogApi } from './apiClient'

// Utility function to calculate working days
const addWorkingDays = (startDate, days) => {
  const result = new Date(startDate)
  let addedDays = 0
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++
    }
  }
  
  return result
}

// Utility function to check if date is working day
const isWorkingDay = (date) => {
  const day = date.getDay()
  return day !== 0 && day !== 6 // Not Sunday or Saturday
}

// Format date for comparison (YYYY-MM-DD)
const formatDateForComparison = (date) => {
  return date.toISOString().split('T')[0]
}

class FollowUpService {
  // Get agent's follow-up queue with categorization
  async getAgentFollowUps(agentId, agentType, branchId = null) {
    try {
      console.log(`Getting follow-ups for ${agentType} agent:`, agentId)
      
      // Get all call logs with follow-up dates
      const response = await calllogApi.get('/nic_cc_calllog')
      const allCallLogs = response.data || []
      
      // Debug: Log all call logs to see structure
      console.log('📋 Total call logs found:', allCallLogs.length)
      console.log('📋 Sample call log structure:', allCallLogs[0])
      
      // Debug: Find call logs with follow-up dates
      const logsWithFollowUp = allCallLogs.filter(log => log.next_follow_up)
      console.log('📅 Call logs with follow-up dates:', logsWithFollowUp.length)
      if (logsWithFollowUp.length > 0) {
        console.log('📅 Sample follow-up log:', logsWithFollowUp[0])
      }
      
      // Get customer data for enrichment (needed for branch filtering)
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []
      
      // Create customer lookup map
      const customerMap = {}
      allCustomers.forEach(customer => {
        customerMap[customer.id] = customer
      })
      
      // Filter call logs based on agent type and access permissions
      let relevantCallLogs = []
      
      if (agentType === 'sales_agent') {
        // Sales agents: only their own call logs
        relevantCallLogs = allCallLogs.filter(log => 
          log.agent === parseInt(agentId) && log.next_follow_up
        )
        console.log(`🎯 Sales agent ${agentId} - filtered logs:`, relevantCallLogs.length)
      } else if (agentType === 'csr') {
        // CSR agents: all call logs except branch 6 (call center exclusive)
        relevantCallLogs = allCallLogs.filter(log => {
          if (!log.next_follow_up) return false
          const customer = customerMap[log.customer]
          return customer && customer.branch_id !== 6
        })
        console.log(`🎯 CSR agent - filtered logs:`, relevantCallLogs.length)
      } else if (agentType === 'internal') {
        // Internal agents: only their branch (filter by customer's branch)
        relevantCallLogs = allCallLogs.filter(log => {
          if (!log.next_follow_up) return false
          const customer = customerMap[log.customer]
          return customer && customer.branch_id === parseInt(branchId)
        })
        console.log(`🎯 Internal agent branch ${branchId} - filtered logs:`, relevantCallLogs.length)
      } else {
        // Call center agents: all call logs
        relevantCallLogs = allCallLogs.filter(log => log.next_follow_up)
        console.log(`🎯 Call center agent - filtered logs:`, relevantCallLogs.length)
      }
      
      // Debug: Show what we found
      console.log('🔍 Agent type:', agentType, 'Agent ID:', agentId, 'Branch ID:', branchId)
      console.log('🔍 Relevant call logs found:', relevantCallLogs.length)
      if (relevantCallLogs.length > 0) {
        console.log('🔍 First relevant log:', relevantCallLogs[0])
      }
      
      // Customer data already loaded above for filtering
      
      // Process and categorize follow-ups
      const today = new Date()
      const todayStr = formatDateForComparison(today)
      const next2WorkingDays = addWorkingDays(today, 2)
      const next2WorkingDaysStr = formatDateForComparison(next2WorkingDays)
      
      const followUps = relevantCallLogs.map(log => {
        const customer = customerMap[log.customer] || {}
        
        // Debug: Log the follow-up date parsing
        console.log('📅 Processing follow-up date:', log.next_follow_up, typeof log.next_follow_up)
        
        // Handle different date formats
        let followUpDate
        if (typeof log.next_follow_up === 'string') {
          // Try different date formats
          if (log.next_follow_up.includes('/')) {
            // Format: dd/mm/yyyy -> convert to yyyy-mm-dd
            const parts = log.next_follow_up.split('/')
            if (parts.length === 3) {
              const [day, month, year] = parts
              followUpDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
            } else {
              followUpDate = new Date(log.next_follow_up)
            }
          } else {
            followUpDate = new Date(log.next_follow_up)
          }
        } else {
          followUpDate = new Date(log.next_follow_up)
        }
        
        console.log('📅 Parsed date:', followUpDate)
        console.log('📅 Is valid date:', !isNaN(followUpDate.getTime()))
        
        const followUpDateStr = formatDateForComparison(followUpDate)
        
        return {
          id: log.id,
          customerId: log.customer,
          customerName: customer.name || 'Unknown Customer',
          policyNumber: customer.policy_number || 'N/A',
          mobile: customer.mobile || 'N/A',
          email: customer.email || 'N/A',
          lob: customer.line_of_business || 'life',
          branchId: customer.branch_id,
          
          // Follow-up details
          followUpDate: log.next_follow_up,
          followUpDateStr,
          agentId: log.agent,
          
          // Call context
          lastCallStatus: log.status,
          lastCallRemarks: log.remarks,
          callDate: log.created_at,
          
          // Categorization
          isOverdue: followUpDateStr < todayStr,
          isToday: followUpDateStr === todayStr,
          isUpcoming: followUpDateStr > todayStr && followUpDateStr <= next2WorkingDaysStr,
          isFuture: followUpDateStr > next2WorkingDaysStr,
          
          // Priority calculation
          priority: this.calculatePriority(followUpDateStr, todayStr, log.status),
          
          // Status
          status: 'pending' // Default status, can be enhanced later
        }
      })
      
      // Sort by priority and date
      followUps.sort((a, b) => {
        // First by priority (high = 3, medium = 2, low = 1)
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        // Then by date (earlier dates first)
        return new Date(a.followUpDate) - new Date(b.followUpDate)
      })
      
      // Categorize follow-ups
      const categorized = {
        overdue: followUps.filter(f => f.isOverdue),
        today: followUps.filter(f => f.isToday),
        upcoming: followUps.filter(f => f.isUpcoming),
        future: followUps.filter(f => f.isFuture),
        all: followUps
      }
      
      console.log(`Follow-up summary for agent ${agentId}:`, {
        total: followUps.length,
        overdue: categorized.overdue.length,
        today: categorized.today.length,
        upcoming: categorized.upcoming.length,
        future: categorized.future.length
      })
      
      return {
        success: true,
        ...categorized,
        summary: {
          total: followUps.length,
          overdue: categorized.overdue.length,
          today: categorized.today.length,
          upcoming: categorized.upcoming.length,
          future: categorized.future.length,
          urgent: categorized.overdue.length + categorized.today.length
        }
      }
      
    } catch (error) {
      console.error('Error getting agent follow-ups:', error)
      return {
        success: false,
        error: error.message,
        overdue: [],
        today: [],
        upcoming: [],
        future: [],
        all: [],
        summary: {
          total: 0,
          overdue: 0,
          today: 0,
          upcoming: 0,
          future: 0,
          urgent: 0
        }
      }
    }
  }
  
  // Calculate follow-up priority based on date and call status
  calculatePriority(followUpDateStr, todayStr, callStatus) {
    const followUpDate = new Date(followUpDateStr)
    const today = new Date(todayStr)
    const daysDiff = Math.floor((followUpDate - today) / (1000 * 60 * 60 * 24))
    
    // High priority: overdue or payment promised
    if (daysDiff < 0 || callStatus === 'payment_promised') {
      return 'high'
    }
    
    // Medium priority: due today or tomorrow
    if (daysDiff <= 1) {
      return 'medium'
    }
    
    // Low priority: future follow-ups
    return 'low'
  }
  
  // Get follow-up alerts for navigation badges
  async getFollowUpAlerts(agentId, agentType, branchId = null) {
    try {
      const followUps = await this.getAgentFollowUps(agentId, agentType, branchId)
      
      if (!followUps.success) {
        return { success: false, urgentCount: 0, totalCount: 0 }
      }
      
      const urgentCount = followUps.summary.urgent
      const totalCount = followUps.summary.total
      
      return {
        success: true,
        urgentCount,
        totalCount,
        hasOverdue: followUps.summary.overdue > 0,
        hasToday: followUps.summary.today > 0,
        summary: followUps.summary
      }
      
    } catch (error) {
      console.error('Error getting follow-up alerts:', error)
      return { success: false, urgentCount: 0, totalCount: 0 }
    }
  }
  
  // Mark follow-up as completed (future enhancement)
  async completeFollowUp(followUpId, notes = '') {
    try {
      // This would update the call log to mark follow-up as completed
      // For now, we'll just log the action
      console.log(`Follow-up ${followUpId} marked as completed:`, notes)
      
      return {
        success: true,
        message: 'Follow-up marked as completed'
      }
    } catch (error) {
      console.error('Error completing follow-up:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  // Reschedule follow-up (future enhancement)
  async rescheduleFollowUp(followUpId, newDate, reason = '') {
    try {
      // This would update the call log with new follow-up date
      // For now, we'll just log the action
      console.log(`Follow-up ${followUpId} rescheduled to ${newDate}:`, reason)
      
      return {
        success: true,
        message: 'Follow-up rescheduled successfully'
      }
    } catch (error) {
      console.error('Error rescheduling follow-up:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const followUpService = new FollowUpService()
export default followUpService