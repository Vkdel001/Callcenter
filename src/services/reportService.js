import { customerApi, agentApi, calllogApi } from './apiClient'

export const reportService = {
  async getAgentPerformanceReport(startDate, endDate, agentId = null) {
    try {
      // Get all call logs within date range
      const callLogsResponse = await calllogApi.get('/nic_cc_calllog')
      const allCallLogs = callLogsResponse.data || []
      
      // Filter by date range
      const filteredLogs = allCallLogs.filter(log => {
        const logDate = new Date(log.created_at)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // Include full end date
        
        return logDate >= start && logDate <= end
      })
      
      // Filter by agent if specified
      const agentFilteredLogs = agentId 
        ? filteredLogs.filter(log => log.agent === parseInt(agentId))
        : filteredLogs
      
      // Get all agents and customers for reference
      const [agentsResponse, customersResponse] = await Promise.all([
        agentApi.get('/nic_cc_agent'),
        customerApi.get('/nic_cc_customer')
      ])
      
      const agents = agentsResponse.data || []
      const customers = customersResponse.data || []
      
      // Create lookup maps
      const agentMap = new Map(agents.map(agent => [agent.id, agent]))
      const customerMap = new Map(customers.map(customer => [customer.id, customer]))
      
      // Build detailed report data
      const reportData = agentFilteredLogs.map(log => {
        const agent = agentMap.get(log.agent)
        const customer = customerMap.get(log.customer)
        
        return {
          id: log.id,
          date: log.created_at,
          agentId: log.agent,
          agentName: agent?.name || 'Unknown Agent',
          customerId: log.customer,
          customerName: customer?.name || 'Unknown Customer',
          policyNumber: customer?.policy_number || 'N/A',
          amountDue: customer?.amount_due || 0,
          outcome: log.status,
          remarks: log.remarks,
          nextFollowUp: log.next_follow_up
        }
      })
      
      // Calculate agent-wise statistics
      const agentStats = new Map()
      
      agentFilteredLogs.forEach(log => {
        const agentId = log.agent
        const agent = agentMap.get(agentId)
        
        if (!agentStats.has(agentId)) {
          agentStats.set(agentId, {
            agentId,
            agentName: agent?.name || 'Unknown Agent',
            totalCalls: 0,
            contacted: 0,
            resolved: 0,
            busy: 0,
            noAnswer: 0,
            paymentPromised: 0,
            totalArrears: 0,
            resolvedArrears: 0,
            customers: new Set()
          })
        }
        
        const stats = agentStats.get(agentId)
        const customer = customerMap.get(log.customer)
        
        stats.totalCalls++
        
        // Only add amount once per unique customer
        if (!stats.customers.has(log.customer)) {
          stats.customers.add(log.customer)
          stats.totalArrears += customer?.amount_due || 0
        }
        
        switch (log.status) {
          case 'contacted':
            stats.contacted++
            break
          case 'resolved':
            stats.resolved++
            stats.resolvedArrears += customer?.amount_due || 0
            break
          case 'busy':
            stats.busy++
            break
          case 'no_answer':
            stats.noAnswer++
            break
          case 'payment_promised':
            stats.paymentPromised++
            break
        }
      })
      
      // Convert to array and add calculated fields
      const agentSummary = Array.from(agentStats.values()).map(stats => ({
        ...stats,
        uniqueCustomers: stats.customers.size,
        successRate: stats.totalCalls > 0 ? ((stats.contacted + stats.resolved) / stats.totalCalls * 100).toFixed(1) : '0.0',
        resolutionRate: stats.totalCalls > 0 ? (stats.resolved / stats.totalCalls * 100).toFixed(1) : '0.0'
      }))
      
      return {
        success: true,
        data: {
          summary: {
            totalCalls: agentFilteredLogs.length,
            totalAgents: agentSummary.length,
            dateRange: { startDate, endDate },
            totalArrears: agentSummary.reduce((sum, agent) => sum + agent.totalArrears, 0),
            resolvedArrears: agentSummary.reduce((sum, agent) => sum + agent.resolvedArrears, 0)
          },
          agentSummary,
          detailedLogs: reportData.sort((a, b) => new Date(b.date) - new Date(a.date))
        }
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  async getCustomerStatusReport() {
    try {
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const customers = customersResponse.data || []
      
      const statusCounts = {
        available: 0,
        assigned: 0,
        completed: 0
      }
      
      const statusArrears = {
        available: 0,
        assigned: 0,
        completed: 0
      }
      
      customers.forEach(customer => {
        const status = customer.assignment_status || 'available'
        const amount = customer.amount_due || 0
        
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++
          statusArrears[status] += amount
        }
      })
      
      return {
        success: true,
        data: {
          totalCustomers: customers.length,
          statusBreakdown: Object.keys(statusCounts).map(status => ({
            status,
            count: statusCounts[status],
            totalArrears: statusArrears[status],
            percentage: customers.length > 0 ? (statusCounts[status] / customers.length * 100).toFixed(1) : '0.0'
          }))
        }
      }
    } catch (error) {
      console.error('Failed to generate customer status report:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  async exportReportToCSV(reportData, filename = 'agent_report.csv') {
    try {
      const headers = [
        'Date',
        'Agent ID',
        'Agent Name',
        'Customer Name',
        'Policy Number',
        'Amount Due (MUR)',
        'Outcome',
        'Remarks',
        'Next Follow-up'
      ]
      
      const csvContent = [
        headers.join(','),
        ...reportData.map(row => [
          new Date(row.date).toLocaleString(),
          row.agentId,
          `"${row.agentName}"`,
          `"${row.customerName}"`,
          row.policyNumber,
          row.amountDue,
          row.outcome,
          `"${row.remarks?.replace(/"/g, '""') || ''}"`,
          row.nextFollowUp || ''
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Failed to export CSV:', error)
      return { success: false, error: error.message }
    }
  }
}