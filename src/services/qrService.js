class QRService {
  constructor() {
    this.zwennPayApiUrl = 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR'
    // LOB-specific merchant codes
    this.merchantCodes = {
      life: import.meta.env.VITE_ZWENNPAY_MERCHANT_LIFE || '56',
      health: import.meta.env.VITE_ZWENNPAY_MERCHANT_HEALTH || '153',
      motor: import.meta.env.VITE_ZWENNPAY_MERCHANT_MOTOR || '155'
    }
    // Fallback to old single merchant ID if new ones not configured
    this.defaultMerchantId = import.meta.env.VITE_ZWENNPAY_MERCHANT_ID || '56'
    this.testMode = import.meta.env.VITE_QR_TEST_MODE === 'true' || false
  }

  /**
   * Get merchant ID based on Line of Business (LOB)
   * @param {string} lineOfBusiness - 'life', 'health', or 'motor'
   * @returns {string} Merchant ID for the specified LOB
   * @throws {Error} If LOB is invalid or merchant code not configured
   */
  getMerchantIdForLOB(lineOfBusiness) {
    if (!lineOfBusiness) {
      throw new Error('❌ Line of Business (LOB) is required')
    }
    
    // Normalize LOB to lowercase
    const lob = lineOfBusiness.toLowerCase().trim()
    
    // Validate LOB is one of the expected values
    const validLOBs = ['life', 'health', 'motor']
    if (!validLOBs.includes(lob)) {
      throw new Error(`❌ Invalid Line of Business: "${lineOfBusiness}". Must be one of: life, health, motor`)
    }
    
    // Get merchant code for LOB
    const merchantId = this.merchantCodes[lob]
    
    if (!merchantId) {
      throw new Error(`❌ Merchant code not configured for LOB: ${lob}. Please check environment variables.`)
    }
    
    console.log(`🏦 Merchant ID selected: ${merchantId} for LOB: ${lob}`)
    
    return merchantId
  }

  /**
   * Sanitize policy number for QR code generation
   * Replaces hyphens (-) and slashes (/) with dots (.)
   * This ensures compatibility with payment systems and QR scanners
   * 
   * Examples:
   * - "LIFE-001" → "LIFE.001"
   * - "HEALTH/2024/001" → "HEALTH.2024.001"
   * - "M-2024-001" → "M.2024.001"
   * 
   * @param {string} policyNumber - Original policy number
   * @returns {string} Sanitized policy number safe for QR codes
   */
  sanitizePolicyNumber(policyNumber) {
    if (!policyNumber) return ''
    
    // Replace all hyphens and slashes with dots
    const sanitized = policyNumber
      .replace(/-/g, '.')  // Replace all hyphens with dots
      .replace(/\//g, '.')  // Replace all slashes with dots
    
    console.log(`Policy number sanitized: "${policyNumber}" → "${sanitized}"`)
    return sanitized
  }

  /**
   * Format customer name for QR code generation
   * Ensures name fits within 24-character limit required by payment systems
   * 
   * Format: [Title] [FirstInitial] [LastName]
   * 
   * Examples:
   * - "Mr Robert Davis Quatre Bornes" → "Mr R Bornes"
   * - "Vikram Ronald Kumar" → "V Kumar"
   * - "Mrs Sarah-Jane Wilson" → "Mrs S Wilson"
   * 
   * @param {string} fullName - Original customer full name
   * @returns {string} Formatted name (max 24 characters)
   */
  formatCustomerNameForQR(fullName) {
    if (!fullName) return ''
    
    // Clean and split name into parts
    const parts = fullName.trim().split(/\s+/)
    
    if (parts.length === 0) return ''
    
    // Common titles to identify
    const titles = ['Mr', 'Mrs', 'Ms', 'Dr', 'Miss', 'Prof', 'Sir', 'Madam']
    
    let title = ''
    let startIndex = 0
    
    // Check if first part is a title
    if (titles.includes(parts[0])) {
      title = parts[0]
      startIndex = 1
    }
    
    // Handle single name case
    if (parts.length === 1) {
      const formatted = parts[0].substring(0, 24)
      console.log(`Customer name formatted for QR: "${fullName}" → "${formatted}" (${formatted.length} chars)`)
      return formatted
    }
    
    // Get first name initial (no dot)
    const firstName = parts[startIndex] || ''
    const firstInitial = firstName.charAt(0).toUpperCase()
    
    // Get last name (last word in the name)
    const lastName = parts[parts.length - 1] || ''
    
    // Format: [Title] [FirstInitial] [LastName]
    let formatted = ''
    if (title) {
      formatted = `${title} ${firstInitial} ${lastName}`
    } else {
      formatted = `${firstInitial} ${lastName}`
    }
    
    // Truncate if exceeds 24 characters
    if (formatted.length > 24) {
      formatted = formatted.substring(0, 24).trim()
    }
    
    console.log(`Customer name formatted for QR: "${fullName}" (${fullName.length} chars) → "${formatted}" (${formatted.length} chars)`)
    
    return formatted
  }

  async generatePaymentQR(customerData) {
    // If in test mode, use mock data
    if (this.testMode) {
      return this.generateTestQR(customerData)
    }

    try {
      // ✅ STEP 1: Fetch customer from Xano to get LOB
      if (!customerData.id) {
        throw new Error('❌ Customer ID is required to generate QR code')
      }
      
      const { customerApi } = await import('./apiClient')
      const customerResponse = await customerApi.get(`/nic_cc_customer/${customerData.id}`)
      const fullCustomer = customerResponse.data
      
      if (!fullCustomer) {
        throw new Error(`❌ Customer ${customerData.id} not found in database`)
      }
      
      const lineOfBusiness = fullCustomer.line_of_business
      
      if (!lineOfBusiness) {
        throw new Error(`❌ Customer ${customerData.id} (${customerData.name}) has no Line of Business (LOB) defined in database. Please update customer data.`)
      }
      
      console.log(`📋 Customer ${customerData.id} (${customerData.name}): LOB = ${lineOfBusiness}`)
      
      // ✅ STEP 2: Get LOB-specific merchant ID
      const merchantId = this.getMerchantIdForLOB(lineOfBusiness)
      
      // Sanitize policy number for QR code compatibility
      const sanitizedPolicyNumber = this.sanitizePolicyNumber(customerData.policyNumber)
      
      // Format customer name to fit 24-character limit
      const formattedCustomerName = this.formatCustomerNameForQR(customerData.name)

      const payload = {
        "MerchantId": parseInt(merchantId),
        "SetTransactionAmount": true,
        "TransactionAmount": customerData.amountDue.toString(),
        "SetConvenienceIndicatorTip": false,
        "ConvenienceIndicatorTip": 0,
        "SetConvenienceFeeFixed": false,
        "ConvenienceFeeFixed": 0,
        "SetConvenienceFeePercentage": false,
        "ConvenienceFeePercentage": 0,
        "SetAdditionalBillNumber": true,
        "AdditionalRequiredBillNumber": false,
        "AdditionalBillNumber": sanitizedPolicyNumber,
        "SetAdditionalMobileNo": true,
        "AdditionalRequiredMobileNo": false,
        "AdditionalMobileNo": customerData.mobile.replace(/[^\d]/g, ''), // Clean mobile number
        "SetAdditionalStoreLabel": false,
        "AdditionalRequiredStoreLabel": false,
        "AdditionalStoreLabel": "",
        "SetAdditionalLoyaltyNumber": false,
        "AdditionalRequiredLoyaltyNumber": false,
        "AdditionalLoyaltyNumber": "",
        "SetAdditionalReferenceLabel": false,
        "AdditionalRequiredReferenceLabel": false,
        "AdditionalReferenceLabel": "",
        "SetAdditionalCustomerLabel": true,
        "AdditionalRequiredCustomerLabel": false,
        "AdditionalCustomerLabel": formattedCustomerName,
        "SetAdditionalTerminalLabel": false,
        "AdditionalRequiredTerminalLabel": false,
        "AdditionalTerminalLabel": "",
        "SetAdditionalPurposeTransaction": true,
        "AdditionalRequiredPurposeTransaction": false,
        "AdditionalPurposeTransaction": "NIC Life"
      }

      console.log('Generating QR with payload:', payload)

      const response = await fetch(this.zwennPayApiUrl, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ZwennPay API Error: ${response.status} - ${errorText}`)
      }

      const qrData = (await response.text()).trim()

      if (!qrData || qrData.toLowerCase() === 'null' || qrData.toLowerCase() === 'none') {
        throw new Error('No valid QR data received from ZwennPay')
      }

      // Generate branded QR code image
      const qrCodeUrl = await this.createBrandedQRCode(qrData, customerData)

      return {
        success: true,
        qrData,
        qrCodeUrl,
        paymentLink: `https://zwennpay.com/pay?data=${encodeURIComponent(qrData)}`, // Adjust based on ZwennPay's payment URL structure
        merchantId: merchantId,
        transactionAmount: customerData.amountDue,
        lineOfBusiness: lineOfBusiness
      }

    } catch (error) {
      console.error('QR Generation failed:', error)
      
      // If it's a CORS or network error, fall back to test mode
      if (error.message.includes('fetch') || error.message.includes('CORS') || error.message.includes('network')) {
        console.log('Network/CORS error detected, falling back to test QR generation')
        return this.generateTestQR(customerData)
      }
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Generate test QR with valid ZwennPay-like data structure
  async generateTestQR(customerData) {
    try {
      // ✅ STEP 1: Fetch customer from Xano to get LOB (same as production)
      if (!customerData.id) {
        throw new Error('❌ [TEST MODE] Customer ID is required to generate QR code')
      }
      
      const { customerApi } = await import('./apiClient')
      const customerResponse = await customerApi.get(`/nic_cc_customer/${customerData.id}`)
      const fullCustomer = customerResponse.data
      
      if (!fullCustomer) {
        throw new Error(`❌ [TEST MODE] Customer ${customerData.id} not found in database`)
      }
      
      const lineOfBusiness = fullCustomer.line_of_business
      
      if (!lineOfBusiness) {
        throw new Error(`❌ [TEST MODE] Customer ${customerData.id} (${customerData.name}) has no Line of Business (LOB) defined in database. Please update customer data.`)
      }
      
      console.log(`📋 [TEST MODE] Customer ${customerData.id} (${customerData.name}): LOB = ${lineOfBusiness}`)
      
      // ✅ STEP 2: Get LOB-specific merchant ID
      const merchantId = this.getMerchantIdForLOB(lineOfBusiness)
      
      // Sanitize policy number for test QR as well
      const sanitizedPolicyNumber = this.sanitizePolicyNumber(customerData.policyNumber)
      
      // Format customer name to fit 24-character limit
      const formattedCustomerName = this.formatCustomerNameForQR(customerData.name)
      
      // Simulate ZwennPay QR data format
      const testQrData = `00020101021226580014com.zwennpay.qr01${merchantId.toString().padStart(2, '0')}${sanitizedPolicyNumber}0208${customerData.amountDue.toString()}5204000053034805802MU5925NIC Life Insurance Maurit6009Port Louis620705036304`
      
      const qrCodeUrl = await this.createBrandedQRCode(testQrData, customerData)
      
      return {
        success: true,
        qrData: testQrData,
        qrCodeUrl,
        paymentLink: `https://zwennpay.com/pay?merchant=${merchantId}&amount=${customerData.amountDue}&ref=${sanitizedPolicyNumber}`,
        merchantId: merchantId,
        transactionAmount: customerData.amountDue,
        lineOfBusiness: lineOfBusiness,
        testMode: true
      }
    } catch (error) {
      console.error('Test QR generation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async createBrandedQRCode(qrData, customerData) {
    try {
      // Create canvas for branded QR code
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Set canvas size (more compact design)
      canvas.width = 400
      canvas.height = 440
      
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Generate basic QR code first
      const qrCodeDataUrl = await this.generateQRCodeImage(qrData)
      
      return new Promise((resolve) => {
        // Load logos
        const maucasLogo = new Image()
        const zwennPayLogo = new Image()
        const qrImg = new Image()
        
        let imagesLoaded = 0
        const totalImages = 3
        
        const checkAllLoaded = () => {
          imagesLoaded++
          if (imagesLoaded === totalImages) {
            drawBrandedQR()
          }
        }
        
        const drawBrandedQR = () => {
          // Top section - MauCAS logo area (white background)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, 70)
          
          // Draw MauCAS logo (bigger)
          const maucasWidth = 160
          const maucasHeight = 50
          const maucasX = (canvas.width - maucasWidth) / 2
          ctx.drawImage(maucasLogo, maucasX, 10, maucasWidth, maucasHeight)
          
          // QR Code in center (much closer to logo and bigger)
          const qrSize = 220
          const qrX = (canvas.width - qrSize) / 2
          const qrY = 65
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
          
          // NIC branding (adjusted for bigger QR)
          ctx.fillStyle = '#333333'
          ctx.font = 'bold 32px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('NIC', canvas.width / 2, 325)
          
          // Amount
          ctx.font = 'bold 20px Arial'
          ctx.fillText(`Amount: ${customerData.amountDue.toLocaleString()}`, canvas.width / 2, 355)
          
          // Powered by text
          ctx.font = '12px Arial'
          ctx.fillStyle = '#666666'
          ctx.fillText('Powered by', canvas.width / 2, 385)
          
          // Draw ZwennPay logo
          const zwennWidth = 120
          const zwennHeight = 35
          const zwennX = (canvas.width - zwennWidth) / 2
          ctx.drawImage(zwennPayLogo, zwennX, 395, zwennWidth, zwennHeight)
          
          // Convert canvas to data URL
          resolve(canvas.toDataURL('image/png'))
        }
        
        // Load all images
        maucasLogo.onload = checkAllLoaded
        maucasLogo.onerror = (e) => {
          console.error('Failed to load MauCAS logo:', e)
          checkAllLoaded()
        }
        maucasLogo.crossOrigin = 'anonymous'
        maucasLogo.src = '/images/maucas2.jpeg'
        
        zwennPayLogo.onload = checkAllLoaded  
        zwennPayLogo.onerror = (e) => {
          console.error('Failed to load ZwennPay logo:', e)
          checkAllLoaded()
        }
        zwennPayLogo.crossOrigin = 'anonymous'
        zwennPayLogo.src = '/images/zwennPay.jpg'
        
        qrImg.onload = checkAllLoaded
        qrImg.onerror = (e) => {
          console.error('Failed to load QR code image:', e)
          checkAllLoaded()
        }
        qrImg.crossOrigin = 'anonymous'
        qrImg.src = qrCodeDataUrl
      })
      
    } catch (error) {
      console.error('Branded QR creation failed:', error)
      // Fallback to basic QR code
      return this.generateQRCodeImage(qrData)
    }
  }

  async generateQRCodeImage(qrData) {
    try {
      // Using QR Server API to generate QR code image
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/`
      const params = new URLSearchParams({
        size: '300x300',
        data: qrData,
        format: 'png',
        ecc: 'L',
        margin: 10,
        qzone: 2,
        bgcolor: 'ffffff',
        color: '000000'
      })

      const qrImageUrl = `${qrApiUrl}?${params.toString()}`
      
      // Verify the QR code image is accessible
      const testResponse = await fetch(qrImageUrl, { method: 'HEAD' })
      if (!testResponse.ok) {
        throw new Error('Failed to generate QR code image')
      }

      return qrImageUrl
    } catch (error) {
      console.error('QR Image generation failed:', error)
      // Fallback to a simple QR code
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`
    }
  }

  // Alternative method using Google Charts API (backup)
  generateQRCodeImageGoogle(qrData) {
    const size = '300x300'
    const encodedData = encodeURIComponent(qrData)
    return `https://chart.googleapis.com/chart?chs=${size}&cht=qr&chl=${encodedData}&choe=UTF-8`
  }

  // Validate QR data format
  validateQRData(qrData) {
    if (!qrData || typeof qrData !== 'string') {
      return false
    }
    
    // Basic validation - adjust based on ZwennPay's QR data format
    return qrData.length > 10 && !qrData.toLowerCase().includes('null')
  }

  // Get payment status (if ZwennPay provides this endpoint)
  async getPaymentStatus(transactionId) {
    try {
      // This would be the actual ZwennPay status endpoint
      // const response = await fetch(`https://api.zwennpay.com:9425/api/v1.0/Transaction/Status/${transactionId}`)
      // return await response.json()
      
      // Mock implementation for now
      return {
        status: 'pending',
        transactionId,
        message: 'Payment status check not implemented yet'
      }
    } catch (error) {
      console.error('Payment status check failed:', error)
      return {
        status: 'unknown',
        error: error.message
      }
    }
  }
}

export const qrService = new QRService()