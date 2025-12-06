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
    templateParams = {},
    sender = null,
    cc = null,
    replyTo = null
  }) {
    try {
      const payload = {
        sender: sender || {
          name: import.meta.env.VITE_SENDER_NAME || 'Insurance Company',
          email: import.meta.env.VITE_SENDER_EMAIL || 'noreply@insurance.com'
        },
        replyTo: replyTo || {
          name: import.meta.env.VITE_REPLY_TO_NAME || import.meta.env.VITE_SENDER_NAME || 'Insurance Company',
          email: import.meta.env.VITE_REPLY_TO_EMAIL || import.meta.env.VITE_SENDER_EMAIL || 'noreply@insurance.com'
        },
        to: [
          {
            email: to.email,
            name: to.name || to.email
          }
        ],
        ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
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

  // Get LOB-specific sender configuration
  getSenderConfig(lob) {
    const lobName = lob ? lob.charAt(0).toUpperCase() + lob.slice(1) : 'Life'
    return {
      name: `NIC ${lobName} Insurance`,
      email: import.meta.env.VITE_SENDER_EMAIL || 'arrears@niclmauritius.site'
    }
  }

  async sendPaymentReminderEmail(customer, qrCodeUrl, paymentLink, options = {}) {
    try {
      const isNewPolicy = options.isNewPolicy || false
      const lob = options.lineOfBusiness || 'life'
      const referenceNumber = options.referenceNumber || customer.policyNumber || 'N/A'
      const agentEmail = options.agentEmail || null
      const agentName = options.agentName || null
      
      // Convert QR code URL to base64 for inline attachment (better for Gmail)
      let qrBase64 = null;
      let attachments = [];
      
      if (qrCodeUrl) {
        try {
          // If it's already a data URL, extract the base64 part
          if (qrCodeUrl.startsWith('data:image')) {
            qrBase64 = qrCodeUrl.split(',')[1];
          } else {
            // Otherwise, fetch and convert to base64
            qrBase64 = await this.urlToBase64(qrCodeUrl);
          }
          
          // Add as inline attachment with CID
          attachments.push({
            name: 'qr-code.png',
            content: qrBase64,
            type: 'image/png'
          });
        } catch (error) {
          console.warn('Failed to convert QR to base64, using URL fallback:', error);
        }
      }
      
      // Get LOB-specific sender
      const sender = this.getSenderConfig(lob)
      const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)
      
      // Choose template and subject based on context
      let htmlContent, textContent, subject
      
      if (isNewPolicy) {
        // New policy welcome email
        subject = `Welcome to NIC ${lobName} Insurance - Your Initial Premium Payment`
        htmlContent = this.generateNewPolicyWelcomeHTML(customer, qrCodeUrl, paymentLink, lob, referenceNumber, qrBase64 ? 'cid:qr-code.png' : qrCodeUrl, agentEmail, agentName)
        textContent = this.generateNewPolicyWelcomeText(customer, paymentLink, lob, referenceNumber, agentEmail, agentName)
      } else {
        // Payment reminder email - NOW WITH AGENT INFO
        subject = `Payment Reminder - ${lobName} Policy ${referenceNumber}`
        htmlContent = this.generatePaymentReminderHTML(customer, qrCodeUrl, paymentLink, qrBase64 ? 'cid:qr-code.png' : qrCodeUrl, lob, referenceNumber, agentEmail, agentName)
        textContent = this.generatePaymentReminderText(customer, paymentLink, lob, referenceNumber, agentEmail, agentName)
      }

      // Prepare email options
      const emailOptions = {
        to: {
          email: customer.email,
          name: customer.name
        },
        subject,
        htmlContent,
        textContent,
        attachments,
        sender  // Use LOB-specific sender
      }

      // Add CC and Reply-To for agent if provided
      if (agentEmail) {
        emailOptions.cc = [{
          email: agentEmail,
          name: agentName || 'Agent'
        }]
        emailOptions.replyTo = {
          email: agentEmail,
          name: agentName || 'Your Agent'
        }
      }

      return await this.sendTransactionalEmail(emailOptions)
    } catch (error) {
      console.error('Payment reminder email failed:', error);
      return {
        success: false,
        error: error.message
      }
    }
  }

  generatePaymentReminderHTML(customer, qrCodeUrl, paymentLink, qrImageSrc = null, lob = 'life', referenceNumber = 'N/A', agentEmail = null, agentName = null) {
    // Use inline CID if available, otherwise use URL
    const qrSrc = qrImageSrc || qrCodeUrl;
    const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)
    
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
          .agent-contact { background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NIC ${lobName} Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal;">Payment Reminder</h2>
          </div>
          
          <div class="content">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <p>This is a friendly reminder that your insurance policy has a pending payment.</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Policy Number:</strong> ${referenceNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">MUR ${customer.amountDue.toLocaleString()}</span></p>
            </div>
            
            ${qrSrc ? `
            <div class="qr-section">
              <h3>Quick Payment via QR Code</h3>
              <img src="${qrSrc}" alt="Payment QR Code" class="qr-code" style="max-width: 200px; border: 1px solid #ddd;">
              <p>Scan this QR code with your mobile banking app to make payment instantly.</p>
            </div>
            ` : ''}
            
            ${agentEmail ? `
            <div class="agent-contact">
              <h4 style="margin-top: 0; color: #000;">Your Agent Contact</h4>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${agentName || 'Your Agent'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: #2563eb;">${agentEmail}</a></p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">For any questions or assistance, please contact your agent directly by replying to this email.</p>
            </div>
            ` : '<p>If you have any questions or need assistance, please contact our customer service team.</p>'}
            
            <p>Thank you for your prompt attention to this matter.</p>
            
            <p>Best regards,<br>
            <strong>NIC ${lobName} Insurance Mauritius</strong><br>
            Customer Service Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message${agentEmail ? '' : '. Please do not reply to this email'}.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  generatePaymentReminderText(customer, paymentLink, lob = 'life', referenceNumber = 'N/A', agentEmail = null, agentName = null) {
    const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)
    const agentContact = agentEmail ? `

YOUR AGENT CONTACT:
Name: ${agentName || 'Your Agent'}
Email: ${agentEmail}

For any questions or assistance, please contact your agent directly by replying to this email.
` : 'If you have any questions or need assistance, please contact our customer service team.'
    
    return `
Dear ${customer.name},

This is a friendly reminder that your insurance policy has a pending payment.

Policy Number: ${referenceNumber}
Amount Due: MUR ${customer.amountDue.toLocaleString()}

Please use the QR code above to make your payment via mobile banking.
${agentContact}

Thank you for your prompt attention to this matter.

Best regards,
NIC ${lobName} Insurance Mauritius
Customer Service Team

---
This is an automated message.
    `.trim()
  }

  // NEW: Welcome email for new policies (sales agents)
  generateNewPolicyWelcomeHTML(customer, qrCodeUrl, paymentLink, lob = 'life', referenceNumber = 'N/A', qrImageSrc = null, agentEmail = null, agentName = null) {
    const qrSrc = qrImageSrc || qrCodeUrl;
    const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NIC ${lobName} Insurance</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffffff; color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #e5e7eb; }
          .content { padding: 20px; background: #ffffff; }
          .amount { font-size: 24px; font-weight: bold; color: #000; }
          .qr-section { text-align: center; margin: 20px 0; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .qr-code { max-width: 200px; border: 1px solid #ddd; }
          .agent-contact { background: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #000; margin: 0;">Welcome to NIC ${lobName} Insurance!</h1>
            <h2 style="margin: 10px 0 0 0; font-weight: normal; color: #000;">Your Initial Premium Payment</h2>
          </div>
          
          <div class="content">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <p>Thank you for choosing NIC ${lobName} Insurance Mauritius for your insurance needs!</p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; color: #000;">Your Application Details</h3>
              <p><strong>Application Form Number:</strong> ${referenceNumber}</p>
              <p><strong>Line of Business:</strong> ${lobName} Insurance</p>
              <p><strong>Initial Premium:</strong> <span class="amount">MUR ${customer.amountDue.toLocaleString()}</span></p>
            </div>
            
            ${qrSrc ? `
            <div class="qr-section">
              <h3 style="color: #000;">Complete Your Payment</h3>
              <img src="${qrSrc}" alt="Payment QR Code" class="qr-code" style="max-width: 200px; border: 1px solid #ddd;">
              <p>Scan this QR code with your mobile banking app to pay your initial premium instantly.</p>
            </div>
            ` : ''}
            
            ${agentEmail ? `
            <div class="agent-contact">
              <h4 style="margin-top: 0; color: #000;">Your Sales Agent Contact</h4>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${agentName || 'Sales Agent'}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${agentEmail}" style="color: #2563eb;">${agentEmail}</a></p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">For any questions or assistance, please contact your sales agent directly.</p>
            </div>
            ` : '<p>If you have any questions, please contact your sales agent or our customer service team.</p>'}
            
            <p>Best regards,<br>
            <strong>NIC ${lobName} Insurance Mauritius</strong><br>
            Sales Team</p>
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

  generateNewPolicyWelcomeText(customer, paymentLink, lob = 'life', referenceNumber = 'N/A', agentEmail = null, agentName = null) {
    const lobName = lob.charAt(0).toUpperCase() + lob.slice(1)
    const agentContact = agentEmail ? `

YOUR SALES AGENT CONTACT:
Name: ${agentName || 'Sales Agent'}
Email: ${agentEmail}

For any questions or assistance, please contact your sales agent directly.
` : 'If you have any questions, please contact your sales agent or our customer service team.'
    
    return `
Welcome to NIC ${lobName} Insurance Mauritius!

Dear ${customer.name},

Thank you for choosing NIC ${lobName} Insurance for your insurance needs!

Your Application Details:
- Application Form Number: ${referenceNumber}
- Line of Business: ${lobName} Insurance
- Initial Premium: MUR ${customer.amountDue.toLocaleString()}

COMPLETE YOUR PAYMENT:
Please scan the QR code in this email with your mobile banking app to pay your initial premium instantly.
${agentContact}

Best regards,
NIC ${lobName} Insurance Mauritius
Sales Team

---
NIC Centre, 217 Royal Road, Curepipe, Mauritius
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
            
            <p>Thank you for completing your Acknowledgment of Debt (AOD) agreement with NIC Life Insurance Mauritius.</p>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #92400e;">📝 Action Required: Please Sign and Return</h4>
              <p style="margin: 10px 0; color: #92400e;">
                <strong>Please sign the attached AOD document and return it to us within 30 days by:</strong>
              </p>
              <ul style="margin: 10px 0; color: #92400e;">
                <li>Email: Send signed copy to <strong>nicarlife@nicl.mu</strong></li>
                <li>Office: Bring signed document to our office</li>
              </ul>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
                <em>Your payment plan will be activated only after we receive your signed document.</em>
              </p>
            </div>
            
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
                <li><strong>Signature Required:</strong> Please sign and return this document within 30 days</li>
                <li><strong>Legal Document:</strong> This becomes binding only after your signature</li>
                <li><strong>Payment Schedule:</strong> Reminders will start after we receive your signed copy</li>
                <li><strong>Deadline:</strong> You have 30 days from today to return the signed document</li>
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

  // Format phone number to international format for SMS
  formatPhoneForSMS(phoneNumber) {
    if (!phoneNumber) return null
    
    // Remove any spaces, dashes, or other characters
    const cleaned = phoneNumber.toString().replace(/\D/g, '')
    
    // If already has country code (starts with 230), add +
    if (cleaned.startsWith('230')) {
      return `+${cleaned}`
    }
    
    // If it's a local Mauritius number (8 digits), add +230
    if (cleaned.length === 8) {
      return `+230${cleaned}`
    }
    
    // If it's 7 digits (missing leading digit), assume it should be 8 digits
    if (cleaned.length === 7) {
      return `+2305${cleaned}` // Assume mobile starts with 5
    }
    
    // If already international format, return as is
    if (cleaned.startsWith('+')) {
      return cleaned
    }
    
    // Default: assume it's a Mauritius number and add +230
    return `+230${cleaned}`
  }

  // Send SMS via Brevo
  async sendSMS({ to, message, sender = 'NIC Life' }) {
    try {
      // Format phone number to international format
      const formattedPhone = this.formatPhoneForSMS(to)
      
      if (!formattedPhone) {
        throw new Error('Invalid phone number provided')
      }

      console.log(`Sending SMS to: ${to} -> formatted: ${formattedPhone}`)

      const payload = {
        type: 'transactional',
        unicodeEnabled: false,
        sender: sender.substring(0, 11), // SMS sender max 11 chars
        recipient: formattedPhone,
        content: message
      }

      const response = await fetch(`${this.brevoApiUrl}/transactionalSMS/sms`, {
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
        throw new Error(`Brevo SMS API Error: ${error.message || response.statusText}`)
      }

      const result = await response.json()
      return {
        success: true,
        messageId: result.reference,
        data: result
      }
    } catch (error) {
      console.error('SMS sending failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Send installment reminder email
  async sendInstallmentReminderEmail(customer, installment, paymentPlan, reminderUrl) {
    try {
      const htmlContent = this.generateInstallmentReminderHTML(customer, installment, paymentPlan, reminderUrl)
      const textContent = this.generateInstallmentReminderText(customer, installment, paymentPlan, reminderUrl)

      return await this.sendTransactionalEmail({
        to: {
          email: customer.email,
          name: customer.name
        },
        subject: `Payment Reminder - Installment ${installment.installment_number} Due`,
        htmlContent,
        textContent
      })
    } catch (error) {
      console.error('Installment reminder email failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Send installment reminder SMS
  async sendInstallmentReminderSMS(customer, installment, paymentPlan, reminderUrl) {
    try {
      // Check if customer has a mobile number
      if (!customer.mobile) {
        return {
          success: false,
          error: 'No mobile number available for customer'
        }
      }

      const message = this.generateInstallmentReminderSMS(customer, installment, paymentPlan, reminderUrl)
      
      console.log(`Sending SMS reminder to customer: ${customer.name}, mobile: ${customer.mobile}`)
      
      return await this.sendSMS({
        to: customer.mobile,
        message,
        sender: 'NIC Life'
      })
    } catch (error) {
      console.error('Installment reminder SMS failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Send both email and SMS reminder
  async sendInstallmentReminder(customer, installment, paymentPlan, reminderUrl) {
    const results = {
      email: { success: false },
      sms: { success: false }
    }

    // Send email reminder
    if (customer.email) {
      results.email = await this.sendInstallmentReminderEmail(customer, installment, paymentPlan, reminderUrl)
    }

    // Send SMS reminder
    if (customer.mobile) {
      results.sms = await this.sendInstallmentReminderSMS(customer, installment, paymentPlan, reminderUrl)
    }

    return {
      success: results.email.success || results.sms.success,
      results
    }
  }

  generateInstallmentReminderHTML(customer, installment, paymentPlan, reminderUrl) {
    const dueDate = new Date(installment.due_date).toLocaleDateString()
    const isOverdue = new Date(installment.due_date) < new Date()
    const statusText = isOverdue ? 'OVERDUE' : 'DUE SOON'
    const statusColor = isOverdue ? '#dc2626' : '#f59e0b'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #1e3a8a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status-banner { padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; background: ${statusColor}; color: white; }
          .payment-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #1e3a8a; text-align: center; margin: 20px 0; }
          .qr-section { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #e5e7eb; }
          .qr-code { max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 4px; }
          .cta-button { display: inline-block; background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 10px; font-size: 16px; }
          .cta-button:hover { background: #15803d; }
          .secondary-button { display: inline-block; background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 10px; font-size: 16px; }
          .secondary-button:hover { background: #1e40af; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NIC Life Insurance Mauritius</h1>
            <p>Payment Reminder</p>
          </div>
          
          <div class="content">
            <div class="status-banner">
              <h2 style="margin: 0;">Payment ${statusText}</h2>
              <p style="margin: 5px 0 0 0;">Installment ${installment.installment_number} of ${paymentPlan.total_installments}</p>
            </div>

            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <p>This is a reminder that your installment payment is ${isOverdue ? 'overdue' : 'due soon'}.</p>
            
            <div class="payment-details">
              <p><strong>Policy Number:</strong> ${paymentPlan.policy_number}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Installment:</strong> ${installment.installment_number} of ${paymentPlan.total_installments}</p>
            </div>

            <div class="amount">MUR ${installment.amount.toLocaleString()}</div>
            
            ${installment.qr_code_url ? `
            <div class="qr-section">
              <h3 style="margin-top: 0; color: #1e3a8a;">Quick Payment via QR Code</h3>
              <img src="${installment.qr_code_url}" alt="Payment QR Code" class="qr-code">
              <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;">
                Scan this QR code with your mobile banking app to pay instantly
              </p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              ${installment.qr_code_url ? `
                <a href="${reminderUrl}" class="cta-button">📱 Scan QR Code to Pay</a>
              ` : ''}
              <a href="${reminderUrl}" class="secondary-button">🔗 View Payment Details</a>
            </div>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>💡 Payment Options:</strong><br>
                • Scan the QR code above with your mobile banking app<br>
                • Click the buttons above to access your payment page<br>
                • Contact our customer service for assistance
              </p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚠️ Important:</strong> If you have already made this payment, please ignore this reminder. 
                It may take 1-2 business days for payments to reflect in our system.
              </p>
            </div>
            
            <p>If you have any questions, please contact our customer service team.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong></p>
          </div>
          
          <div class="footer">
            <p>NIC Centre, 217 Royal Road, Curepipe, Mauritius</p>
            <p>This is an automated reminder. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  generateInstallmentReminderText(customer, installment, paymentPlan, reminderUrl) {
    const dueDate = new Date(installment.due_date).toLocaleDateString()
    const isOverdue = new Date(installment.due_date) < new Date()
    const statusText = isOverdue ? 'OVERDUE' : 'DUE SOON'

    return `
NIC Life Insurance Mauritius
Payment Reminder - ${statusText}

Dear ${customer.name},

Your installment payment is ${isOverdue ? 'overdue' : 'due soon'}.

Payment Details:
- Policy Number: ${paymentPlan.policy_number}
- Due Date: ${dueDate}
- Installment: ${installment.installment_number} of ${paymentPlan.total_installments}
- Amount: MUR ${installment.amount.toLocaleString()}

PAYMENT OPTIONS:
${installment.qr_code_url ? '• Scan the QR code in this email with your mobile banking app' : ''}
• Visit your payment page: ${reminderUrl}
• Contact our customer service for assistance

Payment Link: ${reminderUrl}

If you have any questions, please contact our customer service team.

Best regards,
NIC Life Insurance Mauritius

---
NIC Centre, 217 Royal Road, Curepipe, Mauritius
This is an automated reminder.
    `.trim()
  }

  generateInstallmentReminderSMS(customer, installment, paymentPlan, reminderUrl) {
    const dueDate = new Date(installment.due_date).toLocaleDateString()
    const isOverdue = new Date(installment.due_date) < new Date()
    
    return `NIC Life Insurance
Payment ${isOverdue ? 'OVERDUE' : 'Due'}: MUR ${installment.amount.toLocaleString()}
Due Date: ${dueDate}
Installment ${installment.installment_number} of ${paymentPlan.total_installments}

Pay now: ${reminderUrl}
Ignore if already paid.

Policy: ${paymentPlan.policy_number}`
  }

  // Send signature reminder email
  async sendSignatureReminderEmail(customer, aod, reminderNumber, daysRemaining, agent) {
    try {
      const reminderTitles = {
        1: 'Gentle Reminder',
        2: 'Important Notice', 
        3: 'Final Notice'
      }

      const reminderMessages = {
        1: 'We sent your AOD document a week ago. Please sign and return it at your convenience.',
        2: 'Important: We still need your signed AOD document to activate your payment plan.',
        3: `Final Notice: Your AOD will expire in ${daysRemaining} days. Please return the signed document immediately.`
      }

      const urgencyColors = {
        1: '#3b82f6', // Blue
        2: '#f59e0b', // Orange
        3: '#dc2626'  // Red
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AOD Signature Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${urgencyColors[reminderNumber]}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .reminder-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColors[reminderNumber]}; }
            .deadline-box { background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0; }
            .action-box { background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NIC Life Insurance Mauritius</h1>
              <h2 style="margin: 10px 0 0 0; font-weight: normal;">${reminderTitles[reminderNumber]} - AOD Signature Required</h2>
            </div>
            
            <div class="content">
              <p>Dear <strong>${customer.name}</strong>,</p>
              
              <div class="reminder-box">
                <h3 style="margin-top: 0; color: ${urgencyColors[reminderNumber]};">Reminder ${reminderNumber} of 3</h3>
                <p>${reminderMessages[reminderNumber]}</p>
              </div>

              <div class="deadline-box">
                <h4 style="margin-top: 0; color: #dc2626;">⏰ Time Remaining: ${daysRemaining} days</h4>
                <p style="margin: 0; color: #dc2626;">
                  Your AOD document will expire if not returned by the deadline.
                </p>
              </div>

              <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e5e7eb;">
                <p><strong>Policy Number:</strong> ${aod.policy_number}</p>
                <p><strong>Outstanding Amount:</strong> MUR ${aod.outstanding_amount.toLocaleString()}</p>
                <p><strong>AOD Created:</strong> ${new Date(aod.agreement_date).toLocaleDateString()}</p>
              </div>

              <div class="action-box">
                <h4 style="margin-top: 0; color: #0ea5e9;">📝 How to Return Your Signed Document:</h4>
                <ul style="margin: 10px 0;">
                  <li><strong>Email:</strong> Send signed copy to <strong>nicarlife@nicl.mu</strong></li>
                  <li><strong>Office:</strong> Bring signed document to NIC Centre, 217 Royal Road, Curepipe</li>
                </ul>
              </div>

              <p>Once we receive your signed document, your payment plan will be activated and you'll receive your payment schedule.</p>
              
              <p>If you have any questions, please contact our customer service team.</p>
              
              <p>Best regards,<br>
              <strong>NIC Life Insurance Mauritius</strong></p>
            </div>
            
            <div class="footer">
              <p>NIC Centre, 217 Royal Road, Curepipe, Mauritius</p>
              <p>This is an automated reminder.</p>
            </div>
          </div>
        </body>
        </html>
      `

      const textContent = `
NIC Life Insurance Mauritius
${reminderTitles[reminderNumber]} - AOD Signature Required

Dear ${customer.name},

Reminder ${reminderNumber} of 3
${reminderMessages[reminderNumber]}

Time Remaining: ${daysRemaining} days
Your AOD document will expire if not returned by the deadline.

Policy Details:
- Policy Number: ${aod.policy_number}
- Outstanding Amount: MUR ${aod.outstanding_amount.toLocaleString()}
- AOD Created: ${new Date(aod.agreement_date).toLocaleDateString()}

How to Return Your Signed Document:
• Email: Send signed copy to nicarlife@nicl.mu
• Office: Bring signed document to NIC Centre, 217 Royal Road, Curepipe

Once we receive your signed document, your payment plan will be activated.

Best regards,
NIC Life Insurance Mauritius
      `.trim()

      // Send email with BCC to agent
      const result = await this.sendTransactionalEmail({
        to: {
          email: customer.email,
          name: customer.name
        },
        subject: `${reminderTitles[reminderNumber]}: AOD Signature Required - Policy ${aod.policy_number}`,
        htmlContent,
        textContent
      })

      // Send BCC to agent
      if (agent && agent.email) {
        await this.sendTransactionalEmail({
          to: {
            email: agent.email,
            name: agent.name
          },
          subject: `[BCC] AOD Signature Reminder ${reminderNumber} sent to ${customer.name}`,
          htmlContent: `
            <p>This is a copy of the signature reminder sent to your customer.</p>
            <p><strong>Customer:</strong> ${customer.name} (${customer.email})</p>
            <p><strong>Policy:</strong> ${aod.policy_number}</p>
            <p><strong>Reminder:</strong> ${reminderNumber} of 3</p>
            <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
            <hr>
            ${htmlContent}
          `,
          textContent: `[BCC] AOD Signature Reminder sent to ${customer.name}\n\n${textContent}`
        })
      }

      return result
    } catch (error) {
      console.error('Signature reminder email failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Send AOD expiry notification
  async sendAODExpiryNotification(customer, aod, agent) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>NIC Life Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0;">AOD Document Expired</h2>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc2626;">AOD Document Has Expired</h3>
              <p>Your Acknowledgment of Debt document has expired as we did not receive the signed copy within 30 days.</p>
            </div>

            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e5e7eb;">
              <p><strong>Policy Number:</strong> ${aod.policy_number}</p>
              <p><strong>Outstanding Amount:</strong> MUR ${aod.outstanding_amount.toLocaleString()}</p>
              <p><strong>Original AOD Date:</strong> ${new Date(aod.agreement_date).toLocaleDateString()}</p>
            </div>

            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0ea5e9;">Next Steps:</h4>
              <p>If you still wish to set up a payment plan, please contact us to create a new AOD agreement.</p>
              <p><strong>Contact:</strong> nicarlife@nicl.mu or visit our office</p>
            </div>

            <p>We're here to help you resolve your outstanding amount. Please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong></p>
          </div>
        </div>
      `

      // Send to customer
      await this.sendTransactionalEmail({
        to: {
          email: customer.email,
          name: customer.name
        },
        subject: `AOD Document Expired - Policy ${aod.policy_number}`,
        htmlContent,
        textContent: `Your AOD document for policy ${aod.policy_number} has expired. Please contact us to create a new agreement if needed.`
      })

      // Notify agent
      if (agent && agent.email) {
        await this.sendTransactionalEmail({
          to: {
            email: agent.email,
            name: agent.name
          },
          subject: `[Alert] AOD Expired - ${customer.name} (${aod.policy_number})`,
          htmlContent: `
            <p><strong>AOD Expired Alert</strong></p>
            <p>The following AOD has expired due to no signature received:</p>
            <ul>
              <li><strong>Customer:</strong> ${customer.name}</li>
              <li><strong>Policy:</strong> ${aod.policy_number}</li>
              <li><strong>Amount:</strong> MUR ${aod.outstanding_amount.toLocaleString()}</li>
              <li><strong>Created:</strong> ${new Date(aod.agreement_date).toLocaleDateString()}</li>
            </ul>
            <p>Please follow up with the customer if needed.</p>
          `,
          textContent: `AOD Expired: ${customer.name} (${aod.policy_number}) - MUR ${aod.outstanding_amount.toLocaleString()}`
        })
      }

      return { success: true }
    } catch (error) {
      console.error('AOD expiry notification failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Send AOD activation confirmation
  async sendAODActivationConfirmation(customer, aod) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1>NIC Life Insurance Mauritius</h1>
            <h2 style="margin: 10px 0 0 0;">Payment Plan Activated!</h2>
          </div>
          
          <div style="padding: 20px;">
            <p>Dear <strong>${customer.name}</strong>,</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #16a34a; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #16a34a;">✅ Your Payment Plan is Now Active</h3>
              <p>Thank you for returning your signed AOD document. Your payment plan has been activated and payment reminders will begin as scheduled.</p>
            </div>

            <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #e5e7eb;">
              <p><strong>Policy Number:</strong> ${aod.policy_number}</p>
              <p><strong>Payment Method:</strong> ${aod.payment_method}</p>
              <p><strong>Start Date:</strong> ${aod.start_date ? new Date(aod.start_date).toLocaleDateString() : 'As agreed'}</p>
            </div>

            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0ea5e9;">What Happens Next:</h4>
              <ul>
                <li>You will receive payment reminders before each due date</li>
                <li>Each reminder will include a QR code for easy payment</li>
                <li>You can contact us anytime if you have questions</li>
              </ul>
            </div>

            <p>Thank you for your cooperation in completing this process.</p>
            
            <p>Best regards,<br>
            <strong>NIC Life Insurance Mauritius</strong></p>
          </div>
        </div>
      `

      return await this.sendTransactionalEmail({
        to: {
          email: customer.email,
          name: customer.name
        },
        subject: `Payment Plan Activated - Policy ${aod.policy_number}`,
        htmlContent,
        textContent: `Your payment plan for policy ${aod.policy_number} has been activated. You will receive payment reminders as scheduled.`
      })
    } catch (error) {
      console.error('AOD activation confirmation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
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