import { emailService } from './emailService'

class OTPService {
  constructor() {
    this.otpStorage = new Map() // In production, use Redis or database
    this.otpExpiry = 5 * 60 * 1000 // 5 minutes
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Store OTP with expiry
  storeOTP(email, otp, type = 'login') {
    const expiryTime = Date.now() + this.otpExpiry
    const otpData = {
      otp,
      expiryTime,
      attempts: 0,
      type
    }
    
    if (type === 'password_reset') {
      // Use localStorage for password reset OTPs (survives page navigation)
      localStorage.setItem(`otp_reset_${email}`, JSON.stringify(otpData))
    } else {
      // Use Map for login OTPs (temporary)
      this.otpStorage.set(email, otpData)
    }
    
    // Auto-cleanup after expiry
    setTimeout(() => {
      this.otpStorage.delete(email)
    }, this.otpExpiry)
  }

  // Verify OTP
  verifyOTP(email, inputOtp) {
    const otpData = this.otpStorage.get(email)
    
    if (!otpData) {
      return { success: false, error: 'OTP expired or not found' }
    }

    if (Date.now() > otpData.expiryTime) {
      this.otpStorage.delete(email)
      return { success: false, error: 'OTP expired' }
    }

    otpData.attempts += 1

    if (otpData.attempts > 3) {
      this.otpStorage.delete(email)
      return { success: false, error: 'Too many attempts. Please request new OTP.' }
    }

    if (otpData.otp !== inputOtp) {
      return { success: false, error: 'Invalid OTP' }
    }

    // OTP verified successfully
    this.otpStorage.delete(email)
    return { success: true }
  }

  // Send OTP via email
  async sendOTP(email, name) {
    try {
      const otp = this.generateOTP()
      this.storeOTP(email, otp)

      const htmlContent = this.generateOTPEmailHTML(name, otp)
      const textContent = this.generateOTPEmailText(name, otp)

      const result = await emailService.sendTransactionalEmail({
        to: { email, name },
        subject: 'NIC Life Insurance - Login Verification Code',
        htmlContent,
        textContent
      })

      if (result.success) {
        return {
          success: true,
          message: 'OTP sent successfully',
          expiryMinutes: 5
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to send OTP:', error)
      return {
        success: false,
        error: 'Failed to send OTP. Please try again.'
      }
    }
  }

  generateOTPEmailHTML(name, otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-box { 
            background: white; 
            border: 2px solid #1e40af; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
            margin: 20px 0; 
          }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #1e40af; 
            letter-spacing: 8px; 
            margin: 10px 0; 
          }
          .warning { 
            background: #fef3cd; 
            border: 1px solid #fecaca; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NIC Life Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Login Verification</h2>
          </div>
          
          <div class="content">
            <p>Dear <strong>${name}</strong>,</p>
            
            <p>You are attempting to log in to your NIC Life Insurance call center account. Please use the verification code below to complete your login:</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; font-size: 12px; color: #666;">Valid for 5 minutes</p>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>This code will expire in 5 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact our IT support team.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong><br>
            IT Security Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated security message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  generateOTPEmailText(name, otp) {
    return `
Dear ${name},

You are attempting to log in to your NIC Life Insurance call center account.

Your Verification Code: ${otp}

This code will expire in 5 minutes.

SECURITY NOTICE:
- Do not share this code with anyone
- If you didn't request this code, please ignore this email

Best regards,
NIC Life Insurance Mauritius
IT Security Team

---
This is an automated security message. Please do not reply to this email.
    `.trim()
  }

  // Get remaining time for OTP
  getRemainingTime(email) {
    const otpData = this.otpStorage.get(email)
    if (!otpData) return 0
    
    const remaining = otpData.expiryTime - Date.now()
    return Math.max(0, Math.ceil(remaining / 1000)) // seconds
  }
  async sendPasswordResetOTP(email) {
    try {
      // Check if user exists first
      const { agentApi } = await import('./apiClient')
      const response = await agentApi.get('/nic_cc_agent')
      const allAgents = response.data || []
      
      const agent = allAgents.find(a => a.email === email && a.active === true)
      if (!agent) {
        return {
          success: false,
          error: 'No account found with this email address'
        }
      }

      // Generate and store OTP for password reset
      const otp = this.generateOTP()
      console.log('Generated OTP for password reset:', otp)
      this.storeOTP(email, otp, 'password_reset')
      console.log('Stored OTP for email:', email)
      
      // Verify it was stored
      const stored = this.otpStorage.get(email)
      console.log('Verification - stored data:', stored)

      // Send password reset email
      const { emailService } = await import('./emailService')
      const result = await emailService.sendPasswordResetEmail(email, agent.name, otp)

      if (result.success) {
        return {
          success: true,
          message: 'Password reset code sent to your email'
        }
      } else {
        return {
          success: false,
          error: 'Failed to send reset code'
        }
      }
    } catch (error) {
      console.error('Password reset OTP failed:', error)
      return {
        success: false,
        error: 'Failed to send reset code'
      }
    }
  }

  async verifyPasswordResetOTP(email, otp) {
    try {
      // Get password reset OTP from localStorage
      const storedDataStr = localStorage.getItem(`otp_reset_${email}`)
      
      console.log('Stored OTP data string:', storedDataStr)
      
      if (!storedDataStr) {
        return {
          success: false,
          error: 'No password reset OTP found for this email'
        }
      }
      
      const storedData = JSON.parse(storedDataStr)
      console.log('Parsed stored data:', storedData)
      
      if (storedData.type !== 'password_reset') {
        return {
          success: false,
          error: `Wrong OTP type. Expected: password_reset, Found: ${storedData.type}`
        }
      }

      if (storedData.otp !== otp) {
        return {
          success: false,
          error: 'Invalid verification code'
        }
      }

      if (Date.now() > storedData.expiryTime) {
        localStorage.removeItem(`otp_reset_${email}`)
        return {
          success: false,
          error: 'Verification code has expired'
        }
      }

      // Don't clear OTP yet - we need it for password reset confirmation
      return {
        success: true,
        message: 'OTP verified successfully'
      }
    } catch (error) {
      console.error('Password reset OTP verification failed:', error)
      return {
        success: false,
        error: 'Verification failed'
      }
    }
  }
}

export const otpService = new OTPService()