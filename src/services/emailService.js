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
}

export const emailService = new EmailService()