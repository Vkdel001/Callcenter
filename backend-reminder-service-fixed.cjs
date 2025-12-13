#!/usr/bin/env node

/**
 * NIC Call Center - Backend Reminder Service (Fixed Version)
 * Runs as a system service on Ubuntu server
 * Handles automated payment and signature reminders with agent CC functionality
 * 
 * Features:
 * - Payment reminders with QR codes
 * - Agent CC functionality for installment reminders
 * - Robust error handling and logging
 * - Graceful fallbacks for API failures
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Xano API Configuration
  XANO_BASE_URL: process.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io',
  XANO_CUSTOMER_API: process.env.VITE_XANO_CUSTOMER_API || 'Q4jDYUWL',
  XANO_PAYMENT_API: process.env.VITE_XANO_PAYMENT_API || '05i62DIx',

  // Brevo API Configuration
  BREVO_API_KEY: process.env.VITE_BREVO_API_KEY || '',
  SENDER_EMAIL: process.env.VITE_SENDER_EMAIL || 'arrears@niclmauritius.site',
  SENDER_NAME: process.env.VITE_SENDER_NAME || 'NIC Life Insurance Mauritius',

  // Service Configuration
  CHECK_INTERVAL: 30 * 60 * 1000, // 30 minutes
  BUSINESS_HOURS_START: 9, // 9 AM
  BUSINESS_HOURS_END: 17,  // 5 PM
  TIMEZONE: 'Indian/Mauritius',

  // ZwennPay Configuration
  ZWENNPAY_API_URL: 'https://api.zwennpay.com:9425/api/v1.0/Common/GetMerchantQR',
  ZWENNPAY_MERCHANT_ID: process.env.VITE_ZWENNPAY_MERCHANT_ID || 151,
  QR_TEST_MODE: process.env.VITE_QR_TEST_MODE === 'true' || false,

  // Logging
  LOG_FILE: '/var/log/nic-reminder-service.log',
  DEBUG: true
};

class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data) : null,
      pid: process.pid
    };

    const logLine = `${timestamp} [${level.toUpperCase()}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}\n`;

    // Console output
    if (CONFIG.DEBUG || level === 'ERROR') {
      console.log(logLine.trim());
    }

    // File logging
    try {
      fs.appendFileSync(CONFIG.LOG_FILE, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  static info(message, data) { this.log('INFO', message, data); }
  static warn(message, data) { this.log('WARN', message, data); }
  static error(message, data) { this.log('ERROR', message, data); }
  static debug(message, data) { this.log('DEBUG', message, data); }
}

class XanoAPI {
  static async makeRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = `${CONFIG.XANO_BASE_URL}/api:${endpoint}`;
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NIC-Reminder-Service/1.0'
        }
      };

      if (data && method !== 'GET') {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            Logger.error('Failed to parse Xano response', { url, responseData: responseData.substring(0, 200) });
            reject(new Error('Invalid JSON response from Xano'));
          }
        });
      });

      req.on('error', (error) => {
        Logger.error('Xano API request failed', { url, error: error.message });
        reject(error);
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  static async getCustomers() {
    try {
      const result = await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_customer`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      Logger.error('Failed to fetch customers', { error: error.message });
      return [];
    }
  }

  static async getInstallments() {
    try {
      const result = await this.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_installment`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      Logger.error('Failed to fetch installments', { error: error.message });
      return [];
    }
  }

  static async getPaymentPlans() {
    try {
      const result = await this.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_payment_plan`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      Logger.error('Failed to fetch payment plans', { error: error.message });
      return [];
    }
  }

  static async getAgents() {
    try {
      const result = await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_agent`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      Logger.warn('Failed to fetch agents - agent CC will be disabled', { error: error.message });
      return [];
    }
  }

  static async updateCustomer(customerId, data) {
    try {
      return await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_customer/${customerId}`, 'PATCH', data);
    } catch (error) {
      Logger.error('Failed to update customer', { customerId, error: error.message });
      throw error;
    }
  }
}

class BrevoEmailService {
  // Convert image URL to base64 for Gmail compatibility
  static async urlToBase64(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET'
      };

      const req = protocol.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString('base64');
            Logger.debug('QR code converted to base64 successfully', { 
              url: url.substring(0, 50) + '...', 
              base64Length: base64.length 
            });
            resolve(base64);
          } else {
            Logger.error('Failed to fetch QR image', { url, statusCode: res.statusCode });
            reject(new Error(`Failed to fetch image: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        Logger.error('QR image fetch request failed', { url, error: error.message });
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('QR image fetch timeout'));
      });

      req.end();
    });
  }

  static async sendEmail(to, subject, htmlContent, cc = null, attachments = []) {
    return new Promise((resolve, reject) => {
      const emailData = {
        sender: {
          name: CONFIG.SENDER_NAME,
          email: CONFIG.SENDER_EMAIL
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      };

      // Add CC if provided and valid
      if (cc && cc.email && cc.email.includes('@')) {
        emailData.cc = [{ 
          email: cc.email, 
          name: cc.name || 'Agent' 
        }];
      }

      // Add attachments for Gmail compatibility (CID references)
      if (attachments && attachments.length > 0) {
        emailData.attachment = attachments;
      }

      const postData = JSON.stringify(emailData);

      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': CONFIG.BREVO_API_KEY,
          'content-type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            Logger.info('Email sent successfully', { 
              to, 
              subject, 
              cc: cc?.email || 'none',
              statusCode: res.statusCode 
            });
            resolve({ success: true, response: responseData });
          } else {
            Logger.error('Email sending failed', {
              to,
              subject,
              cc: cc?.email || 'none',
              statusCode: res.statusCode,
              response: responseData.substring(0, 200)
            });
            reject(new Error(`Email sending failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        Logger.error('Email request failed', { to, subject, cc: cc?.email, error: error.message });
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}

class ReminderService {
  static isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= CONFIG.BUSINESS_HOURS_START && hour < CONFIG.BUSINESS_HOURS_END;
  }

  static async processPaymentReminders() {
    Logger.info('Processing payment reminders...');

    try {
      // Fetch all required data with error handling
      const customers = await XanoAPI.getCustomers();
      const installments = await XanoAPI.getInstallments();
      const paymentPlans = await XanoAPI.getPaymentPlans();
      const agents = await XanoAPI.getAgents();

      Logger.info('Data fetched successfully', {
        customersCount: customers.length,
        installmentsCount: installments.length,
        paymentPlansCount: paymentPlans.length,
        agentsCount: agents.length
      });

      // Create lookup maps for better performance
      const customerMap = {};
      customers.forEach(customer => {
        customerMap[customer.id] = customer;
      });

      const paymentPlanMap = {};
      paymentPlans.forEach(plan => {
        paymentPlanMap[plan.id] = plan;
      });

      const agentMap = {};
      if (Array.isArray(agents)) {
        agents.forEach(agent => {
          agentMap[agent.id] = agent;
        });
      } else {
        Logger.warn('Agents data is not an array, agent CC will be disabled', { agentsType: typeof agents });
      }

      // Find installments that need reminders (only 2 reminders: 7 days before and 3 days before)
      const installmentsNeedingReminders = installments.filter(installment => {
        const dueDate = new Date(installment.due_date);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const reminderCount = installment.reminder_sent_count || 0;

        // Only send 2 reminders: 7 days before and 3 days before due date
        // Stop sending if already sent 2 reminders
        if (reminderCount >= 2) {
          return false;
        }

        // Send reminder if due in 7 days (first reminder) or 3 days (second reminder)
        return (daysDiff === 7 && reminderCount === 0) || (daysDiff === 3 && reminderCount === 1);
      });

      Logger.info(`Found ${installmentsNeedingReminders.length} installments needing reminders`);

      for (const installment of installmentsNeedingReminders) {
        try {
          // Find payment plan for this installment (by ID)
          const paymentPlan = paymentPlanMap[installment.payment_plan];

          // Find customer for this payment plan (by customer ID)
          const customer = paymentPlan ? customerMap[paymentPlan.customer] : null;

          // Get agent for CC (if available)
          let agent = null;
          if (paymentPlan && paymentPlan.created_by_agent && agentMap[paymentPlan.created_by_agent]) {
            agent = agentMap[paymentPlan.created_by_agent];
          }

          Logger.debug('Processing installment', {
            installmentId: installment.id,
            paymentPlanId: installment.payment_plan,
            paymentPlanFound: !!paymentPlan,
            customerFound: !!customer,
            customerEmail: customer?.email || 'NO_EMAIL',
            agentFound: !!agent,
            agentEmail: agent?.email || 'NO_AGENT'
          });

          if (customer && customer.email) {
            // Send email reminder with agent CC
            await this.sendPaymentReminder(customer, installment, agent);

            // Update installment reminder count
            const reminderCount = (installment.reminder_sent_count || 0) + 1;
            await XanoAPI.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_installment/${installment.id}`, 'PATCH', {
              reminder_sent_count: reminderCount,
              last_reminder_sent: new Date().toISOString()
            });

            // Add delay between communications to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            Logger.warn('Skipping installment - no customer or email', {
              installmentId: installment.id,
              hasCustomer: !!customer,
              hasEmail: customer?.email || false
            });
          }
        } catch (installmentError) {
          Logger.error('Error processing individual installment', {
            installmentId: installment.id,
            error: installmentError.message,
            stack: installmentError.stack
          });
          // Continue with next installment
        }
      }

      Logger.info('Payment reminder processing completed successfully');

    } catch (error) {
      Logger.error('Error processing payment reminders', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  static async processSignatureReminders() {
    Logger.info('Processing signature reminders...');

    try {
      const customers = await XanoAPI.getCustomers();

      const pendingSignatures = customers.filter(customer => {
        return customer.signature_status === 'pending_signature' && customer.email;
      });

      Logger.info(`Found ${pendingSignatures.length} pending signatures`);

      for (const customer of pendingSignatures) {
        try {
          const sentDate = customer.signature_sent_date ? new Date(customer.signature_sent_date) : null;
          const daysSinceSent = sentDate ? Math.floor((new Date() - sentDate) / (1000 * 60 * 60 * 24)) : 0;

          // Send reminder every 7 days, max 4 reminders (28 days total)
          const reminderCount = customer.signature_reminder_count || 0;

          if (daysSinceSent >= 7 && reminderCount < 4) {
            await this.sendSignatureReminder(customer);

            // Update reminder count
            await XanoAPI.updateCustomer(customer.id, {
              signature_reminder_count: reminderCount + 1,
              last_signature_reminder: new Date().toISOString()
            });

            // Add delay between emails
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Mark as expired after 30 days
          if (daysSinceSent >= 30) {
            await XanoAPI.updateCustomer(customer.id, {
              signature_status: 'expired'
            });
            Logger.info(`Signature expired for customer ${customer.id}`);
          }
        } catch (customerError) {
          Logger.error('Error processing signature reminder for customer', {
            customerId: customer.id,
            error: customerError.message
          });
          // Continue with next customer
        }
      }

    } catch (error) {
      Logger.error('Error processing signature reminders', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  static generateQRSection(customer, installment, qrImageSrc = null) {
    // Use existing QR code from database (generated when installment was created)
    if (installment.qr_code_url) {
      Logger.debug('Using existing QR code from database', { 
        customerId: customer.id, 
        installmentId: installment.id,
        qrCodeUrl: installment.qr_code_url
      });
      
      // Use CID reference or fallback to external URL (same pattern as frontend)
      const qrSrc = qrImageSrc || installment.qr_code_url;
      const isGmailCompatible = qrImageSrc && qrImageSrc.startsWith('cid:');
      
      return `
      <div style="text-align: center; margin: 20px 0; background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
        <h3 style="margin-top: 0; color: #1e3a8a;">Quick Payment via QR Code</h3>
        <img src="${qrSrc}" alt="Payment QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
        <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;">
          Scan this QR code with your mobile banking app to pay instantly
        </p>
        <div style="background: ${isGmailCompatible ? '#e8f5e8' : '#fff3cd'}; padding: 8px; border-radius: 4px; margin: 10px 0;">
          <p style="font-size: 11px; color: ${isGmailCompatible ? '#2d5a2d' : '#856404'}; margin: 0;">
            ${isGmailCompatible ? 
              '✅ This QR code works in ALL email clients including Gmail' : 
              '📧 Gmail users: Click "Display images" at the top of this email to see the QR code'
            }
          </p>
        </div>
        <p style="font-size: 12px; color: #666;">Powered by ZwennPay</p>
      </div>
      `;
    } else {
      Logger.warn('No QR code available for installment', { 
        customerId: customer.id, 
        installmentId: installment.id 
      });
      return '';
    }
  }

  static async sendPaymentReminder(customer, installment, agent = null) {
    const reminderCount = (installment.reminder_sent_count || 0) + 1;
    const reminderText = reminderCount === 1 ? 'First Reminder' : 'Final Reminder';
    const subject = `${reminderText} - Payment Due - NIC Life Insurance`;
    const reminderUrl = `https://payments.niclmauritius.site/reminder/${installment.id}`;
    const dueDate = new Date(installment.due_date).toLocaleDateString();
    const daysUntilDue = Math.ceil((new Date(installment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    const statusText = daysUntilDue === 7 ? 'DUE IN 7 DAYS' : daysUntilDue === 3 ? 'DUE IN 3 DAYS' : 'DUE SOON';
    const statusColor = daysUntilDue === 3 ? '#dc2626' : '#f59e0b';

    // Apply Gmail QR compatibility fix (same pattern as frontend)
    let qrBase64 = null;
    let attachments = [];
    
    if (installment.qr_code_url) {
      try {
        Logger.info('🔄 Converting QR code for Gmail compatibility...', {
          customerId: customer.id,
          installmentId: installment.id
        });
        
        // If it's already a data URL, extract the base64 part
        if (installment.qr_code_url.startsWith('data:image')) {
          qrBase64 = installment.qr_code_url.split(',')[1];
        } else {
          // Otherwise, fetch and convert to base64 (same as frontend method)
          qrBase64 = await BrevoEmailService.urlToBase64(installment.qr_code_url);
        }
        
        // Add as inline attachment with CID (same as frontend method)
        attachments.push({
          name: 'qr-code.png',
          content: qrBase64,
          type: 'image/png'
        });
        
        Logger.info('✅ QR code converted to CID attachment for Gmail', {
          customerId: customer.id,
          installmentId: installment.id
        });
      } catch (error) {
        Logger.warn('⚠️ Failed to convert QR to base64, using URL fallback', {
          customerId: customer.id,
          installmentId: installment.id,
          error: error.message
        });
      }
    }
    
    const htmlContent = `
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
          .secondary-button { display: inline-block; background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 10px; font-size: 16px; }
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
              <h2 style="margin: 0;">${reminderText} - Payment ${statusText}</h2>
              <p style="margin: 5px 0 0 0;">Installment ${installment.installment_number || 1}</p>
            </div>

            <p>Dear <strong>${customer.name || customer.first_name + ' ' + customer.last_name || 'Valued Customer'}</strong>,</p>
            
            <p>This is ${reminderCount === 1 ? 'a friendly reminder' : 'your final reminder'} that your installment payment is due ${daysUntilDue === 7 ? 'in 7 days' : daysUntilDue === 3 ? 'in 3 days' : 'soon'}.</p>
            
            <div class="payment-details">
              <p><strong>Policy Number:</strong> ${customer.policy_number || 'N/A'}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Amount:</strong> MUR ${installment.amount}</p>
            </div>

            <div class="amount">MUR ${installment.amount.toLocaleString()}</div>
            
            ${this.generateQRSection(customer, installment, qrBase64 ? 'cid:qr-code.png' : null)}
            
            <div style="text-align: center; margin: 30px 0;">
              ${installment.qr_code_url ? `
                <a href="${reminderUrl}" class="cta-button">📱 Scan QR Code to Pay</a>
              ` : ''}
              <a href="${reminderUrl}" class="secondary-button">🔗 View Payment Details</a>
            </div>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>💡 Payment Options:</strong><br>
                ${installment.qr_code_url ? '• Scan the QR code above with your mobile banking app<br>' : ''}
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
    `;

    try {
      await BrevoEmailService.sendEmail(customer.email, subject, htmlContent, agent, attachments);
      Logger.info('Payment reminder sent successfully', {
        customerId: customer.id,
        email: customer.email,
        installmentId: installment.id,
        agentCC: agent?.email || 'none',
        qrCodeIncluded: installment.qr_code_url ? 'yes' : 'no',
        gmailCompatible: qrBase64 ? 'yes' : 'no'
      });
    } catch (error) {
      Logger.error('Failed to send payment reminder', {
        customerId: customer.id,
        installmentId: installment.id,
        error: error.message
      });
      throw error;
    }
  }

  static async sendSignatureReminder(customer) {
    const subject = `Signature Required - Acknowledgment of Debt`;
    const qrUrl = `https://payments.niclmauritius.site/qr/${customer.id}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Signature Required</h2>
        <p>Dear ${customer.first_name} ${customer.last_name},</p>
        <p>We need your signature on the Acknowledgment of Debt document.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Action Required</h3>
          <p>Please sign your AOD document within the next few days to avoid any delays in processing your payment plan.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${qrUrl}" style="background-color: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Sign Document Now
          </a>
        </div>
        
        <p>Or scan this QR code with your mobile device:</p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" alt="QR Code" style="border: 1px solid #ddd; padding: 10px;">
        </div>
        
        <p>If you have any questions, please contact us immediately.</p>
        
        <p>Best regards,<br>
        <strong>NIC Life Insurance Mauritius</strong></p>
      </div>
    `;

    try {
      await BrevoEmailService.sendEmail(customer.email, subject, htmlContent);
      Logger.info('Signature reminder sent successfully', {
        customerId: customer.id,
        email: customer.email
      });
    } catch (error) {
      Logger.error('Failed to send signature reminder', {
        customerId: customer.id,
        error: error.message
      });
      throw error;
    }
  }
}

class ReminderServiceDaemon {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  async start() {
    if (this.isRunning) {
      Logger.warn('Service is already running');
      return;
    }

    Logger.info('Starting NIC Reminder Service (Fixed Version)...', {
      pid: process.pid,
      interval: CONFIG.CHECK_INTERVAL,
      businessHours: `${CONFIG.BUSINESS_HOURS_START}:00 - ${CONFIG.BUSINESS_HOURS_END}:00`,
      features: ['payment_reminders', 'signature_reminders', 'agent_cc', 'qr_codes']
    });

    this.isRunning = true;

    // Run immediately on start
    await this.runReminderCycle();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.runReminderCycle();
    }, CONFIG.CHECK_INTERVAL);

    Logger.info('NIC Reminder Service started successfully');
  }

  async runReminderCycle() {
    try {
      if (!ReminderService.isBusinessHours()) {
        Logger.debug('Outside business hours, skipping reminder cycle');
        return;
      }

      Logger.info('Starting reminder cycle...');

      await ReminderService.processPaymentReminders();
      await ReminderService.processSignatureReminders();

      Logger.info('Reminder cycle completed successfully');

    } catch (error) {
      Logger.error('Error in reminder cycle', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  stop() {
    if (!this.isRunning) {
      Logger.warn('Service is not running');
      return;
    }

    Logger.info('Stopping NIC Reminder Service...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    Logger.info('NIC Reminder Service stopped');
  }
}

// Handle process signals
const service = new ReminderServiceDaemon();

process.on('SIGINT', () => {
  Logger.info('Received SIGINT, shutting down gracefully...');
  service.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('Received SIGTERM, shutting down gracefully...');
  service.stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
});

// Start the service
if (require.main === module) {
  service.start().catch((error) => {
    Logger.error('Failed to start service', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

module.exports = { ReminderServiceDaemon, ReminderService, Logger };