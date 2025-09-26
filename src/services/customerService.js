import { customerApi, assignmentApi, calllogApi, agentApi } from './apiClient'

export const customerService = {
  async getAssignedCustomers(agentId) {
    try {
      // Get customers assigned to this agent
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []

      // Filter customers assigned to this agent
      const assignedCustomers = allCustomers.filter(customer =>
        customer.assigned_agent === agentId && customer.assignment_status === 'assigned'
      )

      console.log('Retrieved assigned customers:', assignedCustomers.length)

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
        attempts: customer.total_attempts || 0
      }))
    } catch (error) {
      console.error('Failed to get assigned customers:', error)
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
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        amountDue: customer.amount_due,
        status: customer.status,
        lastCallDate: customer.last_call_date,
        attempts: customer.total_attempts || 0
      }
    } catch (error) {
      console.error('Failed to get customer:', error)
      return null
    }
  },

  async fetchNext10Customers(agentId) {
    try {
      // Get all customers
      const customersResponse = await customerApi.get('/nic_cc_customer')
      const allCustomers = customersResponse.data || []

      // Filter available customers (not assigned, not completed, not escalated)
      const availableCustomers = allCustomers.filter(customer =>
        customer.assignment_status === 'available' || !customer.assignment_status
      )

      // Sort by priority (higher amount first)
      const sortedCustomers = availableCustomers.sort((a, b) =>
        (b.amount_due || 0) - (a.amount_due || 0)
      )

      // Take top 10
      const next10 = sortedCustomers.slice(0, 10)

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
        status: logData.status,
        remarks: logData.remarks,
        next_follow_up: logData.nextFollowUp || null
      }
      
      console.log('Creating call log with payload:', JSON.stringify(payload, null, 2))
      console.log('Raw logData received:', JSON.stringify(logData, null, 2))

      // Create call log entry
      const callLogResponse = await calllogApi.post('/nic_cc_calllog', payload)

      console.log('Call log created:', callLogResponse.data)

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



        await customerApi.patch(`/nic_cc_customer/${customerId}`, {
          status: logData.status === 'payment_promised' ? 'contacted' :
            logData.status === 'resolved' ? 'resolved' :
              logData.status === 'contacted' ? 'contacted' : customer.status,
          last_call_date: new Date().toISOString().split('T')[0],
          total_attempts: newAttempts,
          assignment_status: newAssignmentStatus,
          assigned_agent: assignedAgent,
          assigned_at: assignedAgent ? customer.assigned_at : null,
          escalation_reason: newAssignmentStatus === 'escalation' ? `${newAttempts} failed attempts` : null
        })

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

  async generateQRCode(customerData) {
    const { qrService } = await import('./qrService')

    try {
      const result = await qrService.generatePaymentQR(customerData)

      if (result.success) {
        return {
          qrCodeUrl: result.qrCodeUrl,
          paymentLink: result.paymentLink,
          qrData: result.qrData,
          merchantId: result.merchantId,
          transactionAmount: result.transactionAmount
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
      const message = `Hi ${customer.name},

Your NIC Life Insurance policy ${customer.policyNumber} has a pending payment of MUR ${customer.amountDue.toLocaleString()}.

Please scan the QR code that will be sent next to make payment via mobile banking.

Thank you,
NIC Life Insurance Mauritius`

      // Create WhatsApp Web URL
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`

      console.log('WhatsApp URL:', whatsappUrl)

      // Open WhatsApp Web - will reuse tab with same name
      const whatsappWindow = window.open(whatsappUrl, 'whatsapp_web')

      if (!whatsappWindow) {
        throw new Error('Failed to open WhatsApp Web. Please check if popups are blocked.')
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
        message: 'WhatsApp Web opened with contact. QR code will be shared/downloaded separately.',
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

  async sendEmail(customer, qrCodeUrl, paymentLink) {
    const { emailService } = await import('./emailService')

    try {
      const result = await emailService.sendPaymentReminderEmail(
        customer,
        qrCodeUrl,
        paymentLink
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
  }
}