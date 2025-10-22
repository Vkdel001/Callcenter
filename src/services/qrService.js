class QRService {
  constructor() {
    this.zwennPayApiUrl = 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR'
    this.merchantId = import.meta.env.VITE_ZWENNPAY_MERCHANT_ID || 151
    this.testMode = import.meta.env.VITE_QR_TEST_MODE === 'true' || false
  }

  async generatePaymentQR(customerData) {
    // If in test mode, use mock data
    if (this.testMode) {
      return this.generateTestQR(customerData)
    }

    try {
      const payload = {
        "MerchantId": parseInt(this.merchantId),
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
        "AdditionalBillNumber": customerData.policyNumber,
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
        "AdditionalCustomerLabel": customerData.name,
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
        merchantId: this.merchantId,
        transactionAmount: customerData.amountDue
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
      // Simulate ZwennPay QR data format
      const testQrData = `00020101021226580014com.zwennpay.qr01${this.merchantId.toString().padStart(2, '0')}${customerData.policyNumber}0208${customerData.amountDue.toString()}5204000053034805802MU5925NIC Life Insurance Maurit6009Port Louis620705036304`
      
      const qrCodeUrl = await this.createBrandedQRCode(testQrData, customerData)
      
      return {
        success: true,
        qrData: testQrData,
        qrCodeUrl,
        paymentLink: `https://zwennpay.com/pay?merchant=${this.merchantId}&amount=${customerData.amountDue}&ref=${customerData.policyNumber}`,
        merchantId: this.merchantId,
        transactionAmount: customerData.amountDue,
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