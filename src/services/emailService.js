import { apiClient } from './apiClient'

class EmailService {
  constructor() {
    this.brevoApiUrl = 'https://api.brevo.com/v3'
    this.apiKey = import.meta.env.VITE_BREVO_API_KEY


  }

  async sendTransactionalEmail({
    to,
    subject,
    htmlContent,
    textContent,
    attachments = [],
    templateId = null,
    templateParams = {}
  }) {
    try {
      const payload = {
        sender: {
          name: import.meta.env.VITE_SENDER_NAME || 'Insurance Company',
          email: import.meta.env.VITE_SENDER_EMAIL || 'noreply@insurance.com'
        },
        replyTo: {
          name: import.meta.env.VITE_REPLY_TO_NAME || import.meta.env.VITE_SENDER_NAME || 'Insurance Company',
          email: import.meta.env.VITE_REPLY_TO_EMAIL || import.meta.env.VITE_SENDER_EMAIL || 'noreply@insurance.com'
        },
        to: [
          {
            email: to.email,
            name: to.name || to.email
          }
        ],
        subject,
        ...(templateId ? {
          templateId,
          params: templateParams
        } : {
          htmlContent,
          textContent: textContent || this.stripHtml(htmlContent)
        }),
        ...(attachments.length > 0 && { attachment: attachments })
      }

      const response = await fetch(`${this.brevoApiUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Brevo API Error: ${error.message || response.statusText}`)
      }

      const result = await response.json()
      return {
        success: true,
        messageId: result.messageId,
        data: result
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async sendPaymentReminderEmail(customer, qrCodeUrl, paymentLink) {
    const htmlContent = this.generatePaymentReminderHTML(customer, qrCodeUrl, paymentLink)
    const textContent = this.generatePaymentReminderText(customer, paymentLink)

    return await this.sendTransactionalEmail({
      to: {
        email: customer.email,
        name: customer.name
      },
      subject: `Payment Reminder - Policy ${customer.policyNumber}`,
      htmlContent,
      textContent
      // No attachments - QR code is embedded in HTML
    })
  }

  generatePaymentReminderHTML(customer, qrCodeUrl, paymentLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .amount { font-size: 24px; font-weight: bold; color: #dc2626; }
          .qr-section { text-align: center; margin: 20px 0; }
          .qr-code { max-width: 200px; border: 1px solid #ddd; }

          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NIC Life Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Payment Reminder</h2>
          </div>
          
          <div class="content">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <p>This is a friendly reminder that your insurance policy has a pending payment.</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Policy Number:</strong> ${customer.policyNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">MUR ${customer.amountDue.toLocaleString()}</span></p>
            </div>
            
            ${qrCodeUrl ? `
            <div class="qr-section">
              <h3>Quick Payment via QR Code</h3>
              <img src="${qrCodeUrl}" alt="Payment QR Code" class="qr-code" style="max-width: 200px; border: 1px solid #ddd;">
              <p>Scan this QR code with your mobile banking app to make payment instantly.</p>
            </div>
            ` : ''}
            

            
            <p>If you have any questions or need assistance, please contact our customer service team.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong><br>
            Customer Service Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  generatePaymentReminderText(customer, paymentLink) {
    return `
Dear ${customer.name},

This is a friendly reminder that your insurance policy has a pending payment.

Policy Number: ${customer.policyNumber}
Amount Due: MUR ${customer.amountDue.toLocaleString()}

Please use the QR code above to make your payment via mobile banking.

If you have any questions or need assistance, please contact our customer service team.

Thank you for your prompt attention to this matter.

Best regards,
NIC Life Insurance Mauritius
Customer Service Team

---
This is an automated message. Please do not reply to this email.
    `.trim()
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }

  // Convert image URL to base64 for Brevo attachment
  async urlToBase64(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      const blob = await response.blob()

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          // Remove data:image/png;base64, prefix for Brevo
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Failed to convert URL to base64:', error)
      throw error
    }
  }

  // Get email templates from Brevo (optional)
  async getTemplates() {
    try {
      const response = await fetch(`${this.brevoApiUrl}/smtp/templates`, {
        headers: {
          'Accept': 'application/json',
          'api-key': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to fetch email templates:', error)
      return { templates: [] }
    }
  }

  // Send using Brevo template (if you create templates in Brevo dashboard)
  async sendTemplateEmail(templateId, to, templateParams) {
    return await this.sendTransactionalEmail({
      to,
      templateId,
      templateParams
    })
  }
  // Send AOD PDF via email
  async sendAODEmail(customer, aodData, pdfBlob, installments = []) {
    try {
      // Convert PDF blob to base64 for attachment
      const pdfBase64 = await this.blobToBase64(pdfBlob)
      
      const htmlContent = this.generateAODEmailHTML(customer, aodData, installments)
      const textContent = this.generateAODEmailText(customer, aodData, installments)
      
      const attachment = {
        name: `AOD_${aodData.policy_number}_${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBase64,
        type: 'application/pdf'
      }

      return await this.sendTransactionalEmail({
        to: {
          email: customer.email,
          name: customer.name
        },
        subject: `Acknowledgment of Debt Agreement - Policy ${aodData.policy_number}`,
        htmlContent,
        textContent,
        attachments: [attachment]
      })
    } catch (error) {
      console.error('AOD email sending failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  generateAODEmailHTML(customer, aodData, installments) {
    const paymentMethodText = this.getPaymentMethodDescription(aodData)
    const installmentTable = installments.length > 0 ? this.generateInstallmentTableHTML(installments) : ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acknowledgment of Debt Agreement</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #003366; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #003366; }
          .amount { font-size: 20px; font-weight: bold; color: #dc2626; }
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .important { background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NIC Life Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Acknowledgment of Debt Agreement</h2>
          </div>
          
          <div class="content">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <p>Thank you for completing your Acknowledgment of Debt (AOD) agreement with NIC Life Insurance Mauritius. Please find the attached legal document for your records.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #003366;">Agreement Details</h3>
              <p><strong>Policy Number:</strong> ${aodData.policy_number}</p>
              <p><strong>Outstanding Amount:</strong> <span class="amount">MUR ${aodData.outstanding_amount.toLocaleString()}</span></p>
              <p><strong>Payment Method:</strong> ${paymentMethodText}</p>
              <p><strong>Agreement Date:</strong> ${new Date(aodData.agreement_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> Active</p>
            </div>

            ${installmentTable}
            
            <div class="important">
              <h4 style="margin-top: 0;">Important Information:</h4>
              <ul style="margin: 10px 0;">
                <li><strong>Legal Document:</strong> The attached PDF is a legally binding agreement</li>
                <li><strong>Keep Safe:</strong> Please keep this document for your records</li>
                <li><strong>Payment Reminders:</strong> You will receive reminders before each payment due date</li>
                <li><strong>Contact Us:</strong> If you have any questions, please contact our customer service team</li>
              </ul>
            </div>
            
            <p>We appreciate your commitment to resolving this matter and look forward to your continued partnership with NIC Life Insurance Mauritius.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong><br>
            Customer Service Team</p>
          </div>
          
          <div class="footer">
            <p>NIC Centre, 217 Royal Road, Curepipe, Mauritius</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  generateAODEmailText(customer, aodData, installments) {
    const paymentMethodText = this.getPaymentMethodDescription(aodData)
    let installmentText = ''
    
    if (installments.length > 0) {
      installmentText = `\n\nPayment Schedule:\n${installments.map((inst, i) => 
        `${i + 1}. ${new Date(inst.due_date).toLocaleDateString()} - MUR ${inst.amount.toLocaleString()}`
      ).join('\n')}`
    }

    return `
NIC Life Insurance Mauritius
Acknowledgment of Debt Agreement

Dear ${customer.name},

Thank you for completing your Acknowledgment of Debt (AOD) agreement with NIC Life Insurance Mauritius. Please find the attached legal document for your records.

Agreement Details:
- Policy Number: ${aodData.policy_number}
- Outstanding Amount: MUR ${aodData.outstanding_amount.toLocaleString()}
- Payment Method: ${paymentMethodText}
- Agreement Date: ${new Date(aodData.agreement_date).toLocaleDateString()}
- Status: Active
${installmentText}

Important Information:
- The attached PDF is a legally binding agreement
- Please keep this document for your records
- You will receive reminders before each payment due date
- If you have any questions, please contact our customer service team

We appreciate your commitment to resolving this matter and look forward to your continued partnership with NIC Life Insurance Mauritius.

Best regards,
NIC Life Insurance Mauritius
Customer Service Team

---
NIC Centre, 217 Royal Road, Curepipe, Mauritius
This is an automated message. Please do not reply to this email.
    `.trim()
  }

  generateInstallmentTableHTML(installments) {
    if (!installments || installments.length === 0) return ''

    const rows = installments.map(installment => `
      <tr>
        <td>${installment.installment_number}</td>
        <td>${new Date(installment.due_date).toLocaleDateString()}</td>
        <td>MUR ${installment.amount.toLocaleString()}</td>
        <td>${installment.status}</td>
      </tr>
    `).join('')

    return `
      <div class="info-box">
        <h3 style="margin-top: 0; color: #003366;">Payment Schedule</h3>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Due Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p><em>You will receive individual payment reminders with QR codes for each installment.</em></p>
      </div>
    `
  }

  getPaymentMethodDescription(aodData) {
    switch (aodData.payment_method) {
      case 'installments':
        return `Monthly Installments (${aodData.total_installments} payments of MUR ${aodData.installment_amount.toLocaleString()})`
      case 'fund_deduction':
        return `Fund Value Deduction (MUR ${aodData.fund_deduction_amount.toLocaleString()} from Policy ${aodData.fund_policy_number})`
      case 'benefits_transfer':
        return `Benefits Transfer (From Policy ${aodData.source_policy_number} to Policy ${aodData.target_policy_number})`
      default:
        return 'Payment arrangement as agreed'
    }
  }

  // Convert blob to base64 for email attachment
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        // Remove data:application/pdf;base64, prefix for Brevo
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async sendPasswordResetEmail(email, name, otp) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0;">NIC Life Insurance</h1>
            <p style="color: #6b7280; margin: 5px 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${name},</h2>
            <p>We received a request to reset your password for your NIC Life Insurance call center account.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #666;">Your Password Reset Code</p>
              <div style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 10px 0; letter-spacing: 4px;">${otp}</div>
              <p style="margin: 0; font-size: 12px; color: #666;">Valid for 5 minutes</p>
            </div>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
              <strong>Security Notice:</strong>
              <ul style="margin: 10px 0;">
                <li>This code will expire in 5 minutes</li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this reset, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you have any questions, please contact our IT support team.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong></p>
          </div>
        </div>
      `

      const textContent = `
        NIC Life Insurance - Password Reset Request
        
        Hello ${name},
        
        We received a request to reset your password for your call center account.
        
        Your Password Reset Code: ${otp}
        (Valid for 5 minutes)
        
        Security Notice:
        - This code will expire in 5 minutes
        - Do not share this code with anyone
        - If you didn't request this reset, please ignore this email
        
        Best regards,
        NIC Life Insurance Mauritius
      `

      return await this.sendTransactionalEmail({
        to: { email, name },
        subject: 'NIC Life Insurance - Password Reset Code',
        htmlContent,
        textContent
      })
    } catch (error) {
      console.error('Password reset email failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const emailService = new EmailService()