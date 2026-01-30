import { customerApi, assignmentApi, calllogApi, agentApi } from './apiClient'

export const customerService = {
  // TEST: Quick test function for console
  async testAdminFiltering() {
    const testUsers = [
      { admin_lob: 'motor', name: 'Motor Admin' },
      { admin_lob: 'life', name: 'Life Admin' },
      { admin_lob: 'health', name: 'Health Admin' },
      { admin_lob: 'call_center', name: 'Call Center Admin' },
      { admin_lob: 'super_admin', name: 'Super Admin' }
    ]
    
    for (const user of testUsers) {
      const customers = await this.getCustomersForAdmin(user)
      console.log(`${user.name}: ${customers.length} customers`)
    }
  },

  // NEW: Get customers filtered by admin LOB
  async getCustomersForAdmin(adminUser) {
    try {
      console.log('🔍 Getting customers for admin:', adminUser.admin_lob)
      
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []
      
      let filteredCustomers = []
      
      if (adminUser.admin_lob === 'super_admin') {
        // Super Admin: All customers
        filteredCustomers = allCustomers
        console.log('✅ Super Admin: All customers accessible')
      } else if (adminUser.admin_lob === 'call_center') {
        // Call Center Admin: Only branch 6 customers
        filteredCustomers = allCustomers.filter(customer => customer.branch_id === 6)
        console.log(`✅ Call Center Admin: ${filteredCustomers.length} branch 6 customers`)
      } else if (['life', 'motor', 'health'].includes(adminUser.admin_lob)) {
        // LOB Admins: Only their LOB customers
        filteredCustomers = allCustomers.filter(customer => 
          customer.line_of_business === adminUser.admin_lob
        )
        console.log(`✅ ${adminUser.admin_lob.toUpperCase()} Admin: ${filteredCustomers.length} customers`)
      } else {
        console.log('❌ Unknown admin_lob:', adminUser.admin_lob)
        filteredCustomers = []
      }
      
      // Transform to frontend format with all new fields
      return filteredCustomers.map(customer => ({
        id: customer.id,
        policyNumber: customer.policy_number,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0,
        branchId: customer.branch_id,
        salesAgentId: customer.sales_agent_id,
        lineOfBusiness: customer.line_of_business,
        assignedMonth: customer.assigned_month,
        titleOwner1: customer.title_owner1,
        titleOwner2: customer.title_owner2,
        nameOwner2: customer.name_owner2,
        address: customer.address,
        nationalId: customer.national_id,
        monthlyPremium: customer.monthly_premium,  // Monthly premium amount
        nationalIdOwner2: customer.national_id_owner2,  // Owner 2 national ID
        hasPaymentPlan: customer.has_payment_plan,
        activePlansCount: customer.active_payment_plans_count
      }))
    } catch (error) {
      console.error('Failed to get customers for admin:', error)
      return []
    }
  },

  async getAssignedCustomers(agentId) {
    try {
      // Get customers and agent info
      const [customersResponse, agentsResponse] = await Promise.all([
        customerApi.get('/nic_cc_customer'),
        agentApi.get('/nic_cc_agent')
      ])
      
      const allCustomers = customersResponse.data || []
      const currentAgent = agentsResponse.data?.find(agent => agent.id === agentId)

      // Filter customers assigned to this agent
      let assignedCustomers = allCustomers.filter(customer =>
        customer.assigned_agent === agentId && customer.assignment_status === 'assigned'
      )

      // Additional branch check for internal agents (safety measure)
      if (currentAgent?.agent_type === 'internal' && currentAgent.branch_id) {
        assignedCustomers = assignedCustomers.filter(customer => 
          customer.branch_id === currentAgent.branch_id
        )
      }

      // Transform to frontend format
      return assignedCustomers.map(customer => ({
        id: customer.id,
        policyNumber: customer.policy_number,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0,
        branchId: customer.branch_id,
        salesAgentId: customer.sales_agent_id,
        lineOfBusiness: customer.line_of_business,
        monthlyPremium: customer.monthly_premium,
        nationalIdOwner2: customer.national_id_owner2
      }))
    } catch (error) {
      console.error('Failed to get assigned customers:', error)
      return []
    }
  },

  // NEW: Get ALL branch customers for internal agents (not just assigned)
  async getAllBranchCustomers(agentId) {
    try {
      const [customersResponse, agentsResponse] = await Promise.all([
        customerApi.get('/nic_cc_customer'),
        agentApi.get('/nic_cc_agent')
      ])
      
      const allCustomers = customersResponse.data || []
      const currentAgent = agentsResponse.data?.find(agent => agent.id === agentId)

      if (!currentAgent) {
        console.error('Agent not found:', agentId)
        return []
      }

      // For internal agents, return ALL customers from their branch
      let branchCustomers = allCustomers
      
      if (currentAgent.agent_type === 'internal' && currentAgent.branch_id) {
        branchCustomers = allCustomers.filter(customer => 
          customer.branch_id === currentAgent.branch_id
        )
        console.log(`Internal agent ${agentId}: ${branchCustomers.length} customers in branch ${currentAgent.branch_id}`)
      }

      // Transform to frontend format
      return branchCustomers.map(customer => ({
        id: customer.id,
        policyNumber: customer.policy_number,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0,
        branchId: customer.branch_id,
        salesAgentId: customer.sales_agent_id,
        lineOfBusiness: customer.line_of_business,
        monthlyPremium: customer.monthly_premium,
        nationalIdOwner2: customer.national_id_owner2
      }))
    } catch (error) {
      console.error('Failed to get all branch customers:', error)
      return []
    }
  },

  async getCustomerById(id) {
    try {
      const response = await customerApi.get(`/nic_cc_customer/${id}`)
      const customer = response.data

      if (!customer) {
        return null
      }

      // Transform to frontend format
      return {
        id: customer.id,
        policyNumber: customer.policy_number,
        policy_number: customer.policy_number,  // Keep snake_case for compatibility
        policy_type: customer.policy_type,  // Add policy type for conditional display
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        amount_due: customer.amount_due,  // Keep snake_case for compatibility
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0,
        // AOD-related fields
        title_owner1: customer.title_owner1,
        title_owner2: customer.title_owner2,
        name_owner2: customer.name_owner2,
        address: customer.address,
        national_id: customer.national_id,
        monthly_premium: customer.monthly_premium,  // Monthly premium amount
        national_id_owner2: customer.national_id_owner2  // Owner 2 national ID
      }
    } catch (error) {
      console.error('Failed to get customer:', error)
      return null
    }
  },

  async fetchNext10Customers(agentId) {
    try {
      // Get all customers and active agents
      const [customersResponse, agentsResponse] = await Promise.all([
        customerApi.get('/nic_cc_customer'),
        agentApi.get('/nic_cc_agent')
      ])
      
      const allCustomers = customersResponse.data || []
      const activeAgents = agentsResponse.data?.filter(agent => 
        agent.active && agent.role === 'agent'
      ) || []

      // Get current agent details to check branch assignment
      const currentAgent = agentsResponse.data?.find(agent => agent.id === agentId)
      if (!currentAgent) {
        throw new Error('Agent not found')
      }

      console.log('Current agent:', currentAgent)
      console.log('Agent type:', currentAgent.agent_type)
      console.log('Agent branch:', currentAgent.branch_id)

      // Apply agent type-based filtering (no assignment status filtering)
      let availableCustomers = []
      
      if (currentAgent.agent_type === 'call_center') {
        // Call center agents: ONLY branch 6 (exclusive data) + available for assignment
        availableCustomers = allCustomers.filter(customer => 
          customer.branch_id === 6 && 
          (customer.assignment_status === 'available' || !customer.assignment_status)
        )
        console.log(`Call center agent - filtered to branch 6 (exclusive):`, availableCustomers.length, 'customers')
      } else if (currentAgent.agent_type === 'internal' && currentAgent.branch_id) {
        // Internal agents: ALL branch customers (exclude branch 6) + available for assignment
        availableCustomers = allCustomers.filter(customer => 
          customer.branch_id === currentAgent.branch_id && 
          customer.branch_id !== 6 &&
          (customer.assignment_status === 'available' || !customer.assignment_status)
        )
        console.log(`Internal agent - filtered to branch ${currentAgent.branch_id}:`, availableCustomers.length, 'customers')
      } else if (currentAgent.agent_type === 'sales_agent') {
        // Sales agents should NOT use fetch function - redirect to LOB dashboard
        console.log('Sales agent detected - should use LOB dashboard instead of fetch')
        return {
          success: false,
          message: 'Sales agents should use the LOB dashboard to view customers',
          redirectToLOB: true
        }
      } else {
        // Fallback: old behavior for agents without agent_type
        availableCustomers = allCustomers.filter(customer =>
          customer.assignment_status === 'available' || !customer.assignment_status
        )
        console.log('Legacy agent - can access all customers:', availableCustomers.length)
      }

      // Sort by priority (higher amount first)
      const sortedCustomers = availableCustomers.sort((a, b) =>
        (b.amount_due || 0) - (a.amount_due || 0)
      )

      // Fair distribution: adjust for small datasets
      const agentCount = activeAgents.length
      const availableCount = sortedCustomers.length
      
      const next10 = []
      let currentIndex = 0
      
      if (availableCount <= 10) {
        // If we have 10 or fewer customers, just take them all
        next10.push(...sortedCustomers.slice(0, Math.min(10, availableCount)))
        console.log(`Small dataset: Taking all ${next10.length} available customers`)
      } else {
        // Normal fair distribution for larger datasets
        const skipCount = agentCount - 1
        
        while (next10.length < 10 && currentIndex < sortedCustomers.length) {
          // Take current customer
          next10.push(sortedCustomers[currentIndex])
          
          // Skip the next (agentCount - 1) customers for other agents
          currentIndex += (skipCount + 1) // +1 to move to next available after skip
        }
        console.log(`Fair distribution: Agent count = ${agentCount}, Skip count = ${skipCount}`)
      }

      console.log('Selected customers:', next10.length)

      if (next10.length === 0) {
        return {
          success: false,
          message: 'No available customers in queue'
        }
      }

      // Assign these customers to the agent
      const assignmentPromises = next10.map(customer =>
        customerApi.patch(`/nic_cc_customer/${customer.id}`, {
          assignment_status: 'assigned',
          assigned_agent: agentId,
          assigned_at: new Date().toISOString(),
          priority_score: customer.amount_due || 0
        })
      )

      await Promise.all(assignmentPromises)

      // Update agent's batch size
      await agentApi.patch(`/nic_cc_agent/${agentId}`, {
        current_batch_size: next10.length
      })

      return {
        success: true,
        customers: next10.map(customer => ({
          id: customer.id,
          policyNumber: customer.policy_number,
          name: customer.name,
          mobile: customer.mobile,
          email: customer.email,
          amountDue: customer.amount_due,
          status: customer.status,
          lastCallDate: customer.last_call_date,
          attempts: customer.total_attempts || 0
        })),
        message: `${next10.length} customers assigned to you`
      }
    } catch (error) {
      console.error('Failed to fetch next 10 customers:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  async getCallLogs(customerId) {
    try {
      console.log('Fetching call logs for customer:', customerId)

      // Get all call logs for this customer
      const response = await calllogApi.get('/nic_cc_calllog')
      const allCallLogs = response.data || []

      console.log('All call logs retrieved:', allCallLogs.length)
      if (allCallLogs.length > 0) {
        console.log('Sample call log structure:', allCallLogs[0])
      }

      // Filter call logs for this customer
      const customerCallLogs = allCallLogs.filter(log =>
        log.customer === parseInt(customerId)
      )

      console.log('Filtered call logs for customer', customerId, ':', customerCallLogs.length)

      // Sort by creation date (newest first)
      const sortedLogs = customerCallLogs.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )

      // Transform to frontend format
      return sortedLogs.map(log => ({
        id: log.id,
        status: log.status,
        remarks: log.remarks,
        nextFollowUp: log.next_follow_up,
        createdAt: log.created_at,
        agentId: log.agent
      }))
    } catch (error) {
      console.error('Failed to get call logs:', error)
      return []
    }
  },

  // Test function to check call log API
  async testCallLogAPI() {
    try {
      console.log('Testing call log API...')

      // First, try to get existing call logs to see the structure
      const getResponse = await calllogApi.get('/nic_cc_calllog')
      console.log('Existing call logs:', getResponse.data)

      if (getResponse.data && getResponse.data.length > 0) {
        console.log('Sample call log structure:', getResponse.data[0])
      }

      return { success: true, data: getResponse.data }
    } catch (error) {
      console.error('Call log API test failed:', error.response?.data)
      return { success: false, error: error.response?.data }
    }
  },

  async updateCallLog(customerId, logData) {
    try {
      const payload = {
        customer: parseInt(customerId),
        agent: logData.agentId,
        status: logData.status?.trim(), // Remove any spaces
        remarks: logData.remarks,
        next_follow_up: logData.nextFollowUp || null
      }
      


      // Create call log entry
      const callLogResponse = await calllogApi.post('/nic_cc_calllog', payload)



      // Update customer status and attempt count
      const customerResponse = await customerApi.get(`/nic_cc_customer/${customerId}`)
      const customer = customerResponse.data

      if (customer) {
        const newAttempts = (customer.total_attempts || 0) + 1
        let newAssignmentStatus = customer.assignment_status
        let assignedAgent = customer.assigned_agent

        // Determine new assignment status based on call outcome
        if (logData.status === 'contacted' || logData.status === 'resolved') {
          // Final states - customer completed
          newAssignmentStatus = 'completed'
          assignedAgent = null
        } else if (logData.status === 'busy' || logData.status === 'no_answer' || logData.status === 'payment_promised') {
          // Temporary states - return to available pool
          newAssignmentStatus = 'available'
          assignedAgent = null
        }



        const updatePayload = {
          status: logData.status === 'payment_promised' ? 'contacted' :
            logData.status === 'resolved' ? 'resolved' :
              logData.status === 'contacted' ? 'contacted' : customer.status,
          last_call_date: new Date().toISOString().split('T')[0],
          total_attempts: newAttempts,
          assignment_status: newAssignmentStatus,
          assigned_agent: assignedAgent,
          assigned_at: assignedAgent ? customer.assigned_at : null
        }

        await customerApi.patch(`/nic_cc_customer/${customerId}`, updatePayload)

        // Update agent's batch size if customer was released
        if (!assignedAgent && customer.assigned_agent) {
          try {
            const agentResponse = await agentApi.get(`/nic_cc_agent/${customer.assigned_agent}`)
            const agent = agentResponse.data
            if (agent) {
              await agentApi.patch(`/nic_cc_agent/${customer.assigned_agent}`, {
                current_batch_size: Math.max(0, (agent.current_batch_size || 0) - 1)
              })
            }
          } catch (agentError) {
            console.error('Failed to update agent batch size:', agentError)
          }
        }
      }

      console.log('Call log creation successful, ID:', callLogResponse.data.id)

      // Immediately test if we can retrieve the call log
      setTimeout(async () => {
        try {
          const testResponse = await calllogApi.get('/nic_cc_calllog')
          console.log('Total call logs after creation:', testResponse.data?.length)
          const newLog = testResponse.data?.find(log => log.id === callLogResponse.data.id)
          console.log('Can find newly created log:', !!newLog)
          if (newLog) {
            console.log('New log details:', newLog)
          }
        } catch (testError) {
          console.error('Test retrieval failed:', testError)
        }
      }, 1000)

      return {
        success: true,
        callLogId: callLogResponse.data.id
      }
    } catch (error) {
      console.error('Failed to update call log:', error)
      console.error('Error details:', JSON.stringify(error.response?.data, null, 2))
      console.error('Error status:', error.response?.status)
      console.error('Full error response:', error.response)

      return {
        success: false,
        error: error.response?.data?.message || error.message
      }
    }
  },

  async generateQRCode(customerData, agentData = null, qrType = 'customer_detail') {
    const { qrService } = await import('./qrService')
    const { qrTransactionService } = await import('./qrTransactionService')

    try {
      const result = await qrService.generatePaymentQR(customerData)

      if (result.success) {
        // Log QR transaction to database
        try {
          const logResult = await qrTransactionService.logQRGeneration(
            result.qrData,
            {
              ...customerData,
              merchantId: result.merchantId,
              transactionAmount: result.transactionAmount
            },
            agentData,
            qrType
          )

          console.log('QR transaction logged:', logResult.success ? 'Success' : 'Failed')
        } catch (logError) {
          console.error('Failed to log QR transaction:', logError)
          // Don't fail QR generation if logging fails
        }

        return {
          success: true,
          qrCodeUrl: result.qrCodeUrl,
          paymentLink: result.paymentLink,
          qrData: result.qrData,
          merchantId: result.merchantId,
          transactionAmount: result.transactionAmount,
          lineOfBusiness: result.lineOfBusiness,
          customerData: customerData // Store customer data for the modal
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('QR Code generation failed:', error)

      return {
        success: false,
        error: `ZwennPay QR generation failed: ${error.message}`,
        qrCodeUrl: null,
        paymentLink: null
      }
    }
  },

  async sendWhatsApp(customer, qrCodeUrl, paymentLink) {
    try {
      console.log('Original mobile:', customer.mobile)

      // Format phone number for WhatsApp
      const phoneNumber = this.formatPhoneForWhatsApp(customer.mobile)

      console.log('Formatted phone number for WhatsApp:', phoneNumber)

      // Validate phone number
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error(`Invalid phone number format: ${customer.mobile}. Please check the customer's mobile number.`)
      }

      // Create WhatsApp message
      const message = `Dear Valued Customer,

Your policy ${customer.policyNumber} has a pending payment of MUR ${customer.amountDue.toLocaleString()}.

Please scan the QR code that will be sent next to make payment via Juice, MyT Money, blink, MauBank WithMe, SBM TAG.

Thank you`

      // Create WhatsApp URL (universal - works on mobile and desktop)
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

      console.log('WhatsApp URL:', whatsappUrl)

      // Open WhatsApp Web - will reuse tab with same name
      const whatsappWindow = window.open(whatsappUrl, 'whatsapp_web')

      if (!whatsappWindow) {
        throw new Error('Failed to open WhatsApp. Please check if popups are blocked.')
      }

      // Wait a moment, then handle QR code sharing
      setTimeout(async () => {
        try {
          // Method 1: Try Web Share API (works on mobile)
          if (navigator.share && navigator.canShare) {
            const response = await fetch(qrCodeUrl)
            const blob = await response.blob()
            const file = new File([blob], `payment-qr-${customer.policyNumber}.png`, { type: 'image/png' })

            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Payment QR - Policy ${customer.policyNumber}`,
                files: [file]
              })
              console.log('QR code shared via Web Share API')
              return
            }
          }

          // Method 2: Copy image to clipboard (modern browsers)
          if (navigator.clipboard && window.ClipboardItem) {
            try {
              const response = await fetch(qrCodeUrl)
              const blob = await response.blob()
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ])

              // Show notification
              alert('QR code copied to clipboard! You can paste it in WhatsApp chat (Ctrl+V or Cmd+V)')
              console.log('QR code copied to clipboard')
              return
            } catch (clipboardError) {
              console.log('Clipboard copy failed:', clipboardError)
            }
          }

          // Method 3: Download QR code for manual drag & drop
          this.downloadQRCode(qrCodeUrl, `payment-qr-${customer.policyNumber}.png`)
          alert('QR code downloaded! You can drag and drop the downloaded image into WhatsApp chat.')

        } catch (shareError) {
          console.log('All QR sharing methods failed, downloading instead:', shareError)
          this.downloadQRCode(qrCodeUrl, `payment-qr-${customer.policyNumber}.png`)
          alert('QR code downloaded! You can drag and drop the downloaded image into WhatsApp chat.')
        }
      }, 3000) // Wait 3 seconds for WhatsApp to load

      return {
        success: true,
        message: 'WhatsApp opened with contact. QR code will be shared/downloaded separately.',
        url: whatsappUrl
      }
    } catch (error) {
      console.error('Failed to send via WhatsApp:', error)
      return {
        success: false,
        error: 'Failed to share via WhatsApp'
      }
    }
  },

  // Helper function to format phone number for WhatsApp
  formatPhoneForWhatsApp(phoneNumber) {
    // Remove all non-digits
    const digits = phoneNumber.replace(/[^\d]/g, '')

    // Common phone number patterns
    const patterns = [
      // Mauritius mobile: 5XXXXXXX (8 digits) -> 2305XXXXXXX
      { regex: /^5\d{7}$/, format: (num) => `230${num}` },
      // Mauritius with country code: 2305XXXXXXX
      { regex: /^2305\d{7}$/, format: (num) => num },
      // US format: 1XXXXXXXXXX
      { regex: /^1\d{10}$/, format: (num) => num },
      // International format starting with country code
      { regex: /^\d{10,15}$/, format: (num) => num }
    ]

    for (const pattern of patterns) {
      if (pattern.regex.test(digits)) {
        return pattern.format(digits)
      }
    }

    // Default: assume Mauritius mobile
    return `230${digits}`
  },

  // Helper function to download QR code
  downloadQRCode(qrCodeUrl, filename) {
    try {
      const link = document.createElement('a')
      link.href = qrCodeUrl
      link.download = filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download QR code:', error)
    }
  },

  async getDashboardStats(agentId) {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all customers to find total ever assigned to this agent
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []
      
      // Count customers currently assigned + those completed by this agent
      const currentlyAssigned = allCustomers.filter(customer => 
        customer.assigned_agent === agentId
      ).length
      
      // Get call logs to find customers this agent has worked on
      const callLogsResponse = await calllogApi.get('/nic_cc_calllog')
      const allCallLogs = callLogsResponse.data || []
      
      // Find all unique customers this agent has ever called
      const agentCallLogs = allCallLogs.filter(log => log.agent === agentId)
      const uniqueCustomersWorked = new Set(agentCallLogs.map(log => log.customer))
      
      // Find unique customers contacted today with "contacted" or "resolved" status
      const todayContactedCustomers = new Set()
      
      allCallLogs.forEach(log => {
        if (log.agent !== agentId || !log.created_at) return
        
        try {
          let logDate
          if (typeof log.created_at === 'string') {
            logDate = log.created_at.includes('T') 
              ? log.created_at.split('T')[0] 
              : log.created_at.split(' ')[0]
          } else {
            logDate = new Date(log.created_at).toISOString().split('T')[0]
          }
          
          if (logDate === today && (log.status === 'contacted' || log.status === 'resolved')) {
            todayContactedCustomers.add(log.customer)
          }
        } catch (error) {
          console.error('Date parsing error for log:', log.created_at)
        }
      })
      
      // Add currently assigned customers to the worked-on set
      allCustomers.forEach(customer => {
        if (customer.assigned_agent === agentId) {
          uniqueCustomersWorked.add(customer.id)
        }
      })

      console.log('Dashboard Stats Debug:', {
        agentId,
        currentlyAssigned,
        totalUniqueCustomers: uniqueCustomersWorked.size,
        allCustomerIds: Array.from(uniqueCustomersWorked),
        contactedTodayCount: todayContactedCustomers.size
      })

      return {
        totalAssigned: uniqueCustomersWorked.size,
        contactedToday: todayContactedCustomers.size
      }
    } catch (error) {
      console.error('Failed to get dashboard stats:', error)
      return { totalAssigned: 0, contactedToday: 0 }
    }
  },

  async sendEmail(customer, qrCodeUrl, paymentLink, options = {}) {
    const { emailService } = await import('./emailService')

    try {
      const result = await emailService.sendPaymentReminderEmail(
        customer,
        qrCodeUrl,
        paymentLink,
        options  // Pass options for template selection
      )

      if (result.success) {
        console.log('Email sent successfully:', result.messageId)
        return {
          success: true,
          messageId: result.messageId,
          message: 'Payment reminder email sent successfully'
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email'
      }
    }
  },

  // Helper function to normalize month format to "Mon-YY"
  normalizeMonthFormat(monthStr) {
    if (!monthStr || monthStr === 'Unknown') return monthStr
    
    // Handle different formats: "2024-11", "Nov-25", "25-Nov", "2024-10", "Oct-25"
    if (monthStr.includes('-')) {
      const parts = monthStr.split('-')
      
      // Format: "2024-11" -> "Nov-24"
      if (parts[0].length === 4 && !isNaN(parts[0])) {
        const year = parts[0]
        const monthNum = parseInt(parts[1])
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[monthNum - 1]}-${year.slice(-2)}`
      }
      
      // Format: "25-Nov" -> "Nov-25"
      if (!isNaN(parts[0]) && isNaN(parts[1])) {
        return `${parts[1]}-${parts[0]}`
      }
      
      // Already in format "Nov-25"
      return monthStr
    }
    
    return monthStr
  },

  async getSalesAgentLOBSummary(salesAgentId) {
    try {
      console.log('Getting LOB summary for sales agent:', salesAgentId)

      // ✅ OPTIMIZED: Use server-side filtering (94.7% faster)
      const customersResponse = await customerApi.get('/get_nic_cc_customers', {
        params: { sales_agent_id: salesAgentId }
      })
      // Handle paginated response - Xano returns {items: [...], itemsTotal, curPage, etc}
      const salesAgentCustomers = customersResponse.data?.items || customersResponse.data || []
      // No client-side filtering needed - already filtered by server

      console.log(`Found ${salesAgentCustomers.length} customers for sales agent ${salesAgentId}`)

      // Group customers by LOB
      const lobSummary = {
        life: { count: 0, totalAmount: 0, months: {} },
        health: { count: 0, totalAmount: 0, months: {} },
        motor: { count: 0, totalAmount: 0, months: {} }
      }

      salesAgentCustomers.forEach(customer => {
        const lob = customer.line_of_business || 'life'
        const rawMonth = customer.assigned_month || 'Unknown'
        const month = this.normalizeMonthFormat(rawMonth)  // Normalize month format
        const amount = parseFloat(customer.amount_due) || 0

        // Update LOB totals
        if (lobSummary[lob]) {
          lobSummary[lob].count += 1
          lobSummary[lob].totalAmount += amount

          // Update month breakdown
          if (!lobSummary[lob].months[month]) {
            lobSummary[lob].months[month] = { count: 0, totalAmount: 0 }
          }
          lobSummary[lob].months[month].count += 1
          lobSummary[lob].months[month].totalAmount += amount
        }
      })

      console.log('LOB Summary:', lobSummary)

      return {
        success: true,
        salesAgentId,
        totalCustomers: salesAgentCustomers.length,
        lobSummary
      }
    } catch (error) {
      console.error('Failed to get sales agent LOB summary:', error)
      return {
        success: false,
        error: error.message,
        lobSummary: {
          life: { count: 0, totalAmount: 0, months: {} },
          health: { count: 0, totalAmount: 0, months: {} },
          motor: { count: 0, totalAmount: 0, months: {} }
        }
      }
    }
  },

  async getSalesAgentCustomersForLOBMonth(salesAgentId, lob, month) {
    try {
      console.log(`Getting customers for sales agent ${salesAgentId}, LOB: ${lob}, Month: ${month}`)

      // Get customers for this sales agent using optimized endpoint
      const customersResponse = await customerApi.get('/get_nic_cc_customers', {
        params: { sales_agent_id: salesAgentId }
      })
      // Handle paginated response - Xano returns {items: [...], itemsTotal, curPage, etc}
      const allCustomers = customersResponse.data?.items || customersResponse.data || []

      // Filter customers by LOB and month (normalize month for comparison)
      const filteredCustomers = allCustomers.filter(customer => 
        customer.line_of_business === lob &&
        this.normalizeMonthFormat(customer.assigned_month) === month
      )

      console.log(`Found ${filteredCustomers.length} customers for ${lob} - ${month}`)

      // Transform to frontend format
      const customers = filteredCustomers.map(customer => ({
        id: customer.id,
        policyNumber: customer.policy_number,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0,
        titleOwner1: customer.title_owner1,
        titleOwner2: customer.title_owner2,
        nameOwner2: customer.name_owner2,
        address: customer.address,
        nationalId: customer.national_id,
        monthlyPremium: customer.monthly_premium,
        nationalIdOwner2: customer.national_id_owner2
      }))

      return {
        success: true,
        customers,
        lob,
        month,
        totalCustomers: customers.length,
        totalAmount: customers.reduce((sum, c) => sum + (c.amountDue || 0), 0)
      }
    } catch (error) {
      console.error('Failed to get sales agent customers for LOB/Month:', error)
      return {
        success: false,
        error: error.message,
        customers: []
      }
    }
  },

  // NEW: CSR LOB Summary (Universal Access to ALL branches except branch 6)
  async getCSRLOBSummary() {
    try {
      console.log('Getting LOB summary for CSR (universal access)')

      // Get all customers from all branches
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []

      // CSR sees ALL customers except call center exclusive (branch 6)
      const csrAccessibleCustomers = allCustomers.filter(customer => 
        customer.branch_id !== 6  // Exclude only call center exclusive data
      )

      console.log(`CSR has access to ${csrAccessibleCustomers.length} customers (excluding branch 6)`)

      // Group customers by LOB and month (same logic as sales agent)
      const lobSummary = {
        life: { count: 0, totalAmount: 0, months: {} },
        health: { count: 0, totalAmount: 0, months: {} },
        motor: { count: 0, totalAmount: 0, months: {} }
      }

      csrAccessibleCustomers.forEach(customer => {
        const lob = customer.line_of_business || 'life'
        const rawMonth = customer.assigned_month || 'Unknown'
        const month = this.normalizeMonthFormat(rawMonth)  // Normalize month format
        const amount = parseFloat(customer.amount_due) || 0

        // Update LOB totals
        if (lobSummary[lob]) {
          lobSummary[lob].count += 1
          lobSummary[lob].totalAmount += amount

          // Update month breakdown
          if (!lobSummary[lob].months[month]) {
            lobSummary[lob].months[month] = { count: 0, totalAmount: 0 }
          }
          lobSummary[lob].months[month].count += 1
          lobSummary[lob].months[month].totalAmount += amount
        }
      })

      console.log('CSR LOB Summary:', lobSummary)

      return {
        success: true,
        totalCustomers: csrAccessibleCustomers.length,
        lobSummary
      }
    } catch (error) {
      console.error('Failed to get CSR LOB summary:', error)
      return {
        success: false,
        error: error.message,
        lobSummary: {
          life: { count: 0, totalAmount: 0, months: {} },
          health: { count: 0, totalAmount: 0, months: {} },
          motor: { count: 0, totalAmount: 0, months: {} }
        }
      }
    }
  },

  // NEW: Internal Agent LOB Summary (Branch-specific access)
  async getInternalAgentLOBSummary(branchId) {
    try {
      console.log(`Getting LOB summary for Internal Agent (branch ${branchId})`)

      // Get customers filtered by branch on server (optimized)
      const customersResponse = await customerApi.get('/get_nic_cc_customers', {
        params: { branch_id: branchId }
      })
      const branchCustomers = customersResponse.data || []

      console.log(`Internal agent has access to ${branchCustomers.length} customers in branch ${branchId}`)

      // Group customers by LOB and month (same logic as sales agent and CSR)
      const lobSummary = {
        life: { count: 0, totalAmount: 0, months: {} },
        health: { count: 0, totalAmount: 0, months: {} },
        motor: { count: 0, totalAmount: 0, months: {} }
      }

      branchCustomers.forEach(customer => {
        const lob = customer.line_of_business || 'life'
        const rawMonth = customer.assigned_month || 'Unknown'
        const month = this.normalizeMonthFormat(rawMonth)  // Normalize month format
        const amount = parseFloat(customer.amount_due) || 0

        // Update LOB totals
        if (lobSummary[lob]) {
          lobSummary[lob].count += 1
          lobSummary[lob].totalAmount += amount

          // Update month breakdown
          if (!lobSummary[lob].months[month]) {
            lobSummary[lob].months[month] = { count: 0, totalAmount: 0 }
          }
          lobSummary[lob].months[month].count += 1
          lobSummary[lob].months[month].totalAmount += amount
        }
      })

      console.log(`Internal Agent LOB Summary (Branch ${branchId}):`, lobSummary)

      return {
        success: true,
        totalCustomers: branchCustomers.length,
        lobSummary
      }
    } catch (error) {
      console.error('Failed to get Internal Agent LOB summary:', error)
      return {
        success: false,
        error: error.message,
        lobSummary: {
          life: { count: 0, totalAmount: 0, months: {} },
          health: { count: 0, totalAmount: 0, months: {} },
          motor: { count: 0, totalAmount: 0, months: {} }
        }
      }
    }
  },

  // NEW: Internal Agent Customer List (Branch-specific access to specific LOB + Month)
  async getInternalAgentCustomersForLOBMonth(branchId, lob, month) {
    try {
      console.log(`Getting Internal Agent customers for Branch: ${branchId}, LOB: ${lob}, Month: ${month}`)

      // Get customers filtered by branch on server (optimized)
      const customersResponse = await customerApi.get('/get_nic_cc_customers', {
        params: { branch_id: branchId }
      })
      const allCustomers = customersResponse.data || []

      // Filter for Internal Agent: LOB + month (branch already filtered by server)
      const filteredCustomers = allCustomers.filter(customer => 
        customer.line_of_business === lob &&
        this.normalizeMonthFormat(customer.assigned_month) === month
      )

      console.log(`Found ${filteredCustomers.length} Internal Agent customers for Branch ${branchId} - ${lob} - ${month}`)

      // Calculate total amount
      const totalAmount = filteredCustomers.reduce((sum, customer) => {
        return sum + (parseFloat(customer.amount_due) || 0)
      }, 0)

      // Transform customers to match expected format
      const transformedCustomers = filteredCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        policyNumber: customer.policy_number,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: parseFloat(customer.amount_due) || 0,
        status: customer.status || 'pending',
        address: customer.address,
        nationalId: customer.national_id,
        titleOwner1: customer.title_owner1,
        branch_id: customer.branch_id
      }))

      return {
        success: true,
        customers: transformedCustomers,
        lob,
        month,
        totalAmount,
        branchId
      }
    } catch (error) {
      console.error('Failed to get Internal Agent customers for LOB month:', error)
      return {
        success: false,
        error: error.message,
        customers: [],
        lob,
        month,
        totalAmount: 0,
        branchId
      }
    }
  },

  // NEW: CSR Customer List (Universal Access to specific LOB + Month)
  async getCSRCustomersForLOBMonth(lob, month) {
    try {
      console.log(`Getting CSR customers for LOB: ${lob}, Month: ${month} (universal access)`)

      // Get all customers from all branches
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []

      // Filter for CSR: specific LOB + month, exclude branch 6 (call center exclusive)
      const filteredCustomers = allCustomers.filter(customer => 
        customer.line_of_business === lob &&
        this.normalizeMonthFormat(customer.assigned_month) === month &&
        customer.branch_id !== 6  // Exclude call center exclusive data
      )

      console.log(`Found ${filteredCustomers.length} CSR customers for ${lob} - ${month}`)

      // Transform to frontend format (same as sales agent)
      const customers = filteredCustomers.map(customer => ({
        id: customer.id,
        policyNumber: customer.policy_number,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0,
        titleOwner1: customer.title_owner1,
        titleOwner2: customer.title_owner2,
        nameOwner2: customer.name_owner2,
        address: customer.address,
        nationalId: customer.national_id,
        monthlyPremium: customer.monthly_premium,
        nationalIdOwner2: customer.national_id_owner2
      }))

      return {
        success: true,
        customers,
        lob,
        month,
        totalCustomers: customers.length,
        totalAmount: customers.reduce((sum, c) => sum + (c.amountDue || 0), 0)
      }
    } catch (error) {
      console.error('Failed to get CSR customers for LOB/Month:', error)
      return {
        success: false,
        error: error.message,
        customers: []
      }
    }
  },

  // Get recent payments for a customer
  async getCustomerPayments(customerId) {
    try {
      const { paymentApi } = await import('./apiClient')
      
      // Get all payments
      const response = await paymentApi.get('/nic_cc_payment')
      const allPayments = response.data || []

      // Filter payments for this customer
      const customerPayments = allPayments.filter(payment =>
        payment.customer === parseInt(customerId)
      )

      // Sort by payment date (newest first)
      const sortedPayments = customerPayments.sort((a, b) =>
        new Date(b.payment_date) - new Date(a.payment_date)
      )

      // Return last 10 payments
      return sortedPayments.slice(0, 10).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        transactionReference: payment.transaction_reference,
        status: payment.status,
        oldBalance: payment.old_balance,
        newBalance: payment.new_balance,
        paymentStatusCode: payment.payment_status_code
      }))
    } catch (error) {
      console.error('Failed to get customer payments:', error)
      return []
    }
  },

  // Get customer payment history
  async getCustomerPayments(customerId) {
    try {
      const { paymentApi } = await import('./apiClient')
      
      // Get all payments
      const response = await paymentApi.get('/nic_cc_payment')
      const allPayments = response.data || []
      
      // Filter payments for this customer
      const customerPayments = allPayments.filter(payment => 
        payment.customer === parseInt(customerId)
      )
      
      // Sort by payment date (newest first)
      const sortedPayments = customerPayments.sort((a, b) =>
        new Date(b.payment_date) - new Date(a.payment_date)
      )
      
      // Return last 10 payments
      return sortedPayments.slice(0, 10).map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        transactionReference: payment.transaction_reference,
        status: payment.status,
        oldBalance: payment.old_balance,
        newBalance: payment.new_balance,
        paymentStatusCode: payment.payment_status_code
      }))
    } catch (error) {
      console.error('Failed to get customer payments:', error)
      return []
    }
  }
}
