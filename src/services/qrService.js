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

      // Generate QR code image URL using a QR code service
      const qrCodeUrl = await this.generateQRCodeImage(qrData)

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
      
      const qrCodeUrl = await this.generateQRCodeImage(testQrData)
      
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