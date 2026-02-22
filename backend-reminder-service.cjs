#!/usr/bin/env node

/**
 * NIC Call Center - Backend Reminder Service
 * Runs as a system service on Ubuntu server
 * Handles automated payment and signature reminders
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

  // Email Service Configuration
  EMAIL_SERVICE_URL: 'http://localhost:3005',
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
            Logger.error('Failed to parse Xano response', { url, responseData });
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
      return await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_customer`);
    } catch (error) {
      Logger.error('Failed to fetch customers', error);
      return [];
    }
  }

  static async getInstallments() {
    try {
      return await this.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_installment`);
    } catch (error) {
      Logger.error('Failed to fetch installments', error);
      return [];
    }
  }

  static async getPaymentPlans() {
    try {
      return await this.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_payment_plan`);
    } catch (error) {
      Logger.error('Failed to fetch payment plans', error);
      return [];
    }
  }

  static async updateCustomer(customerId, data) {
    try {
      return await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_customer/${customerId}`, 'PATCH', data);
    } catch (error) {
      Logger.error('Failed to update customer', { customerId, error });
      throw error;
    }
  }
}

class ZwennPayQRService {
  static async generatePaymentQR(customer, installment) {
    if (CONFIG.QR_TEST_MODE) {
      return this.generateTestQR(customer, installment);
    }

    try {
      const payload = {
        "MerchantId": parseInt(CONFIG.ZWENNPAY_MERCHANT_ID),
        "SetTransactionAmount": true,
        "TransactionAmount": installment.amount.toString(),
        "SetConvenienceIndicatorTip": false,
        "ConvenienceIndicatorTip": 0,
        "SetConvenienceFeeFixed": false,
        "ConvenienceFeeFixed": 0,
        "SetConvenienceFeePercentage": false,
        "ConvenienceFeePercentage": 0,
        "SetAdditionalBillNumber": true,
        "AdditionalRequiredBillNumber": false,
        "AdditionalBillNumber": customer.policy_number || `INS-${customer.id}`,
        "SetAdditionalMobileNo": true,
        "AdditionalRequiredMobileNo": false,
        "AdditionalMobileNo": customer.mobile ? customer.mobile.replace(/[^\d]/g, '') : '',
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
        "AdditionalCustomerLabel": customer.name || 'NIC Customer',
        "SetAdditionalTerminalLabel": false,
        "AdditionalRequiredTerminalLabel": false,
        "AdditionalTerminalLabel": "",
        "SetAdditionalPurposeTransaction": true,
        "AdditionalRequiredPurposeTransaction": false,
        "AdditionalPurposeTransaction": "NIC Life Insurance Payment"
      };

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify(payload);
        const urlObj = new URL(CONFIG.ZWENNPAY_API_URL);

        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'accept': 'text/plain',
            'Content-Type': 'application/json',
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
              const qrData = responseData.trim();
              if (qrData && qrData.toLowerCase() !== 'null') {
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
                resolve({
                  success: true,
                  qrData,
                  qrImageUrl,
                  merchantId: CONFIG.ZWENNPAY_MERCHANT_ID,
                  amount: installment.amount
                });
              } else {
                reject(new Error('Invalid QR data received from ZwennPay'));
              }
            } else {
              reject(new Error(`ZwennPay API Error: ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          Logger.error('ZwennPay QR request failed', { error: error.message });
          reject(error);
        });

        req.write(postData);
        req.end();
      });

    } catch (error) {
      Logger.error('ZwennPay QR generation failed', error);
      return this.generateTestQR(customer, installment);
    }
  }

  static generateTestQR(customer, installment) {
    const testQrData = `00020101021226580014com.zwennpay.qr01${CONFIG.ZWENNPAY_MERCHANT_ID.toString().padStart(2, '0')}${customer.policy_number || customer.id}0208${installment.amount}5204000053034805802MU5925NIC Life Insurance6009Port Louis`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(testQrData)}`;

    return {
      success: true,
      qrData: testQrData,
      qrImageUrl,
      merchantId: CONFIG.ZWENNPAY_MERCHANT_ID,
      amount: installment.amount,
      testMode: true
    };
  }
}

class EmailServiceClient {
  static async sendEmail(to, subject, htmlContent, cc = null, replyTo = null) {
    return new Promise((resolve, reject) => {
      const payload = {
        sender: {
          name: CONFIG.SENDER_NAME,
          email: CONFIG.SENDER_EMAIL
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        ...(cc && { cc }),
        ...(replyTo && { replyTo })
      };

      const postData = JSON.stringify(payload);
      const urlObj = new URL(`${CONFIG.EMAIL_SERVICE_URL}/api/email/send`);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 3005,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.success) {
              Logger.info('Email sent successfully', { to, subject });
              resolve({ success: true, response: parsed });
            } else {
              Logger.error('Email sending failed', {
                to,
                subject,
                statusCode: res.statusCode,
                response: responseData
              });
              reject(new Error(`Email sending failed: ${parsed.error || res.statusCode}`));
            }
          } catch (error) {
            reject(new Error('Failed to parse email service response'));
          }
        });
      });

      req.on('error', (error) => {
        Logger.error('Email request failed', { to, subject, error: error.message });
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  static async sendSMS(to, message) {
    return new Promise((resolve, reject) => {
      // Format phone number for Mauritius (+230)
      let phoneNumber = to.toString().replace(/\D/g, '');
      if (phoneNumber.length === 8 && !phoneNumber.startsWith('230')) {
        phoneNumber = '230' + phoneNumber;
      }
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }

      const payload = {
        sender: 'NIC Life',
        recipient: phoneNumber,
        content: message
      };

      const postData = JSON.stringify(payload);
      const urlObj = new URL(`${CONFIG.EMAIL_SERVICE_URL}/api/email/send-sms`);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 3005,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.success) {
              Logger.info('SMS sent successfully', { to: phoneNumber });
              resolve({ success: true, response: parsed });
            } else {
              Logger.error('SMS sending failed', {
                to: phoneNumber,
                statusCode: res.statusCode,
                response: responseData
              });
              reject(new Error(`SMS sending failed: ${parsed.error || res.statusCode}`));
            }
          } catch (error) {
            reject(new Error('Failed to parse email service response'));
          }
        });
      });

      req.on('error', (error) => {
        Logger.error('SMS request failed', { to: phoneNumber, error: error.message });
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
      const customers = await XanoAPI.getCustomers();
      const installments = await XanoAPI.getInstallments();
      const paymentPlans = await XanoAPI.getPaymentPlans();

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
      Logger.info('DEBUG: Sample customers', {
        totalCustomers: customers.length,
        sampleEmails: customers.slice(0, 5).map(c => c.email)
      });

      for (const installment of installmentsNeedingReminders) {
        // Find payment plan for this installment (by ID)
        const paymentPlan = paymentPlans.find(plan => plan.id === installment.payment_plan);

        // Find customer for this payment plan (by customer ID)
        const customer = paymentPlan ? customers.find(c => c.id === paymentPlan.customer) : null;

        Logger.info('DEBUG: Processing installment', {
          installmentId: installment.id,
          paymentPlan: installment.payment_plan,
          paymentPlanFound: !!paymentPlan,
          paymentPlanCustomer: paymentPlan ? paymentPlan.customer : 'NO_PLAN',
          customerFound: !!customer,
          customerEmail: customer ? customer.email : 'NO_CUSTOMER'
        });

        if (customer && customer.email) {
          Logger.info('DEBUG: Sending email to customer', {
            customerId: customer.id,
            email: customer.email
          });

          // Send email reminder
          await this.sendPaymentReminder(customer, installment);

          // Send SMS reminder if phone number exists
          if (customer.mobile) {
            await this.sendPaymentSMS(customer, installment);
          }

          // Update installment reminder count
          const reminderCount = (installment.reminder_sent_count || 0) + 1;
          await XanoAPI.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_installment/${installment.id}`, 'PATCH', {
            reminder_sent_count: reminderCount,
            last_reminder_sent: new Date().toISOString()
          });

          // Add delay between communications to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

    } catch (error) {
      Logger.error('Error processing payment reminders', error);
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
      }

    } catch (error) {
      Logger.error('Error processing signature reminders', error);
    }
  }

  static generateQRSection(customer, installment) {
    // Use existing QR code from database (generated when installment was created)
    if (installment.qr_code_url) {
      Logger.info('Using existing QR code from database', { 
        customerId: customer.id, 
        installmentId: installment.id,
        qrCodeUrl: installment.qr_code_url
      });
      
      return `
      <div style="text-align: center; margin: 20px 0; background: white; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
        <h3 style="margin-top: 0; color: #1e3a8a;">Quick Payment via QR Code</h3>
        <img src="${installment.qr_code_url}" alt="Payment QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
        <p style="margin: 15px 0 5px 0; font-size: 14px; color: #666;">
          Scan this QR code with your mobile banking app to pay instantly
        </p>
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

  static async sendPaymentReminder(customer, installment) {
    const reminderCount = (installment.reminder_sent_count || 0) + 1;
    const reminderText = reminderCount === 1 ? 'First Reminder' : 'Final Reminder';
    const subject = `${reminderText} - Payment Due - NIC Life Insurance`;
    const reminderUrl = `https://payments.niclmauritius.site/reminder/${installment.id}`;
    const dueDate = new Date(installment.due_date).toLocaleDateString();
    const daysUntilDue = Math.ceil((new Date(installment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
    const statusText = daysUntilDue === 7 ? 'DUE IN 7 DAYS' : daysUntilDue === 3 ? 'DUE IN 3 DAYS' : 'DUE SOON';
    const statusColor = daysUntilDue === 3 ? '#dc2626' : '#f59e0b';
    
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

            <p>Dear <strong>${customer.name || 'Valued Customer'}</strong>,</p>
            
            <p>This is ${reminderCount === 1 ? 'a friendly reminder' : 'your final reminder'} that your installment payment is due ${daysUntilDue === 7 ? 'in 7 days' : daysUntilDue === 3 ? 'in 3 days' : 'soon'}.</p>
            
            <div class="payment-details">
              <p><strong>Policy Number:</strong> ${customer.policy_number || 'N/A'}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Amount:</strong> MUR ${installment.amount}</p>
            </div>

            <div class="amount">MUR ${installment.amount.toLocaleString()}</div>
            
            ${this.generateQRSection(customer, installment)}
            
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
      await EmailServiceClient.sendEmail(customer.email, subject, htmlContent);
      Logger.info('Payment reminder sent', {
        customerId: customer.id,
        email: customer.email,
        installmentId: installment.id
      });
    } catch (error) {
      Logger.error('Failed to send payment reminder', {
        customerId: customer.id,
        error: error.message
      });
    }
  }

  static async sendPaymentSMS(customer, installment) {
    const reminderUrl = `https://payments.niclmauritius.site/reminder/${installment.id}`;
    const dueDate = new Date(installment.due_date).toLocaleDateString();
    const isOverdue = new Date(installment.due_date) < new Date();
    
    const message = `NIC Life Insurance: ${isOverdue ? 'OVERDUE' : 'Payment Due'} - MUR ${installment.amount} ${isOverdue ? 'was' : ''} due ${dueDate}. Pay now: ${reminderUrl}. Ignore if already paid.`;

    try {
      await EmailServiceClient.sendSMS(customer.mobile, message);
      Logger.info('Payment SMS sent', {
        customerId: customer.id,
        mobile: customer.mobile,
        installmentId: installment.id
      });
    } catch (error) {
      Logger.error('Failed to send payment SMS', {
        customerId: customer.id,
        error: error.message
      });
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
      await EmailServiceClient.sendEmail(customer.email, subject, htmlContent);
      Logger.info('Signature reminder sent', {
        customerId: customer.id,
        email: customer.email
      });
    } catch (error) {
      Logger.error('Failed to send signature reminder', {
        customerId: customer.id,
        error: error.message
      });
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

    Logger.info('Starting NIC Reminder Service...', {
      pid: process.pid,
      interval: CONFIG.CHECK_INTERVAL,
      businessHours: `${CONFIG.BUSINESS_HOURS_START}:00 - ${CONFIG.BUSINESS_HOURS_END}:00`
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
      Logger.error('Error in reminder cycle', error);
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
  Logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled rejection', { reason, promise });
});

// Start the service
if (require.main === module) {
  service.start().catch((error) => {
    Logger.error('Failed to start service', error);
    process.exit(1);
  });
}

module.exports = { ReminderServiceDaemon, ReminderService, Logger };