import QRCode from 'qrcode'

/**
 * QR Code Generator Utility
 * Generates base64 QR codes for Gmail compatibility
 */
class QRGenerator {
  /**
   * Generate base64 QR code from data
   * @param {string} qrData - The data to encode in QR code
   * @param {Object} options - QR code options
   * @returns {Promise<string>} Base64 data URL
   */
  static async generateBase64QR(qrData, options = {}) {
    try {
      const defaultOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M',
        ...options
      }

      const qrBase64 = await QRCode.toDataURL(qrData, defaultOptions)
      return qrBase64 // Returns: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
    } catch (error) {
      console.error('Failed to generate base64 QR code:', error)
      throw new Error(`QR generation failed: ${error.message}`)
    }
  }

  /**
   * Extract QR data from installment for payment
   * @param {Object} installment - Installment object
   * @param {Object} customer - Customer object
   * @returns {string} QR data string
   */
  static extractQRDataFromInstallment(installment, customer) {
    // If we have stored QR data, use it
    if (installment.qr_code_data) {
      return installment.qr_code_data
    }

    // Otherwise, reconstruct QR data (ZwennPay format)
    const merchantId = import.meta.env.VITE_ZWENNPAY_MERCHANT_ID || '151'
    const policyNumber = customer.policy_number || customer.policyNumber || customer.id
    const amount = installment.amount

    // ZwennPay QR format
    const qrData = `00020101021226580014com.zwennpay.qr01${merchantId.toString().padStart(2, '0')}${policyNumber}0208${amount}5204000053034805802MU5925NIC Life Insurance6009Port Louis`
    
    return qrData
  }

  /**
   * Generate QR code for installment payment
   * @param {Object} installment - Installment object
   * @param {Object} customer - Customer object
   * @param {Object} options - QR generation options
   * @returns {Promise<string>} Base64 QR code
   */
  static async generateInstallmentQR(installment, customer, options = {}) {
    try {
      const qrData = this.extractQRDataFromInstallment(installment, customer)
      return await this.generateBase64QR(qrData, options)
    } catch (error) {
      console.error('Failed to generate installment QR:', error)
      throw error
    }
  }

  /**
   * Check if QR code generation is supported
   * @returns {boolean} True if QR generation is available
   */
  static isSupported() {
    try {
      return typeof QRCode !== 'undefined'
    } catch {
      return false
    }
  }

  /**
   * Generate test QR code for validation
   * @returns {Promise<string>} Base64 test QR code
   */
  static async generateTestQR() {
    const testData = 'Test QR Code - NIC Life Insurance'
    return await this.generateBase64QR(testData, {
      width: 150,
      margin: 1
    })
  }
}

export { QRGenerator }