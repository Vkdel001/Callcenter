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

class BrevoSMSService {
  static async sendSMS(to, message) {
    return new Promise((resolve, reject) => {
      // Format phone number for Mauritius (+230)
      let phoneNumber = to.toString().replace(/\D/g, ''); // Remove non-digits
      if (phoneNumber.length === 8 && !phoneNumber.startsWith('230')) {
        phoneNumber = '230' + phoneNumber; // Add Mauritius prefix
      }
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }

      const smsData = {
        sender: 'NIC',
        recipient: phoneNumber,
        content: message
      };

      const postData = JSON.stringify(smsData);

      const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/transactionalSMS/sms',
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
            Logger.info('SMS sent successfully', { to: phoneNumber });
            resolve({ success: true, response: responseData });
          } else {
            Logger.error('SMS sending failed', {
              to: phoneNumber,
              statusCode: res.statusCode,
              response: responseData
            });
            reject(new Error(`SMS sending failed: ${res.statusCode}`));
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

class BrevoEmailService {
  static async sendEmail(to, subject, htmlContent) {
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
            Logger.info('Email sent successfully', { to, subject });
            resolve({ success: true, response: responseData });
          } else {
            Logger.error('Email sending failed', {
              to,
              subject,
              statusCode: res.statusCode,
              response: responseData
            });
            reject(new Error(`Email sending failed: ${res.statusCode}`));
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

      const overdueInstallments = installments.filter(installment => {
        const dueDate = new Date(installment.due_date);
        const today = new Date();
        const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        return daysDiff > 0 && installment.status !== 'paid';
      });

      Logger.info(`Found ${overdueInstallments.length} overdue installments`);
      Logger.info('DEBUG: Sample customers', {
        totalCustomers: customers.length,
        sampleEmails: customers.slice(0, 5).map(c => c.email)
      });

      for (const installment of overdueInstallments) {
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

          // Update reminder count
          const reminderCount = (customer.reminder_count || 0) + 1;
          await XanoAPI.updateCustomer(customer.id, {
            reminder_count: reminderCount,
            last_reminder_date: new Date().toISOString()
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

  static async generateQRSection(customer, installment) {
    try {
      const qrResult = await ZwennPayQRService.generatePaymentQR(customer, installment);
      if (qrResult.success) {
        Logger.info('QR code generated successfully', { 
          customerId: customer.id, 
          installmentId: installment.id
        });
        
        return `
        <div style="text-align: center; margin: 20px 0;">
          <p><strong>Scan to Pay via ZwennPay:</strong></p>
          <img src="${qrResult.qrImageUrl}" alt="ZwennPay QR Code" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; max-width: 200px;">
          <p style="font-size: 12px; color: #666;">Merchant ID: ${qrResult.merchantId} | Amount: MUR ${qrResult.amount}</p>
          ${qrResult.testMode ? '<p style="font-size: 10px; color: #f59e0b;">Test Mode</p>' : ''}
          <p style="font-size: 12px; color: #666;">Powered by ZwennPay</p>
        </div>
        `;
      }
    } catch (error) {
      Logger.error('Failed to generate QR code', { customerId: customer.id, error: error.message });
    }
    
    // Fallback if QR generation fails
    return `
    <div style="text-align: center; margin: 20px 0; padding: 20px; border: 2px dashed #ccc;">
      <p style="color: #666;">QR Code temporarily unavailable</p>
      <p style="font-size: 12px; color: #666;">Please use the "Pay Now Online" button above</p>
    </div>
    `;
  }

  static async sendPaymentReminder(customer, installment) {
    const subject = `Payment Reminder - NIC Life Insurance`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Payment Reminder</h2>
        <p>Dear ${customer.name || 'Valued Customer'},</p>
        <p>This is a friendly reminder that your payment is overdue.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details:</h3>
          <p><strong>Amount Due:</strong> MUR ${installment.amount}</p>
          <p><strong>Due Date:</strong> ${new Date(installment.due_date).toLocaleDateString()}</p>
          <p><strong>Policy Number:</strong> ${customer.policy_number || 'N/A'}</p>
        </div>
        
        <p>Please make your payment as soon as possible to avoid any service interruption.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <p><strong>Quick Payment Options:</strong></p>
          <a href="https://payments.niclmauritius.site/reminder/${installment.id}" style="background-color: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Pay Now Online
          </a>
        </div>
        
        ${await this.generateQRSection(customer, installment)}
        
        <p>If you have any questions, please contact us at:</p>
        <p>📞 Phone: +230-212-3456<br>
        📧 Email: ${CONFIG.SENDER_EMAIL}<br>
        🌐 Website: https://payments.niclmauritius.site</p>
        
        <p>Thank you for your attention to this matter.</p>
        
        <p>Best regards,<br>
        <strong>NIC Life Insurance Mauritius</strong></p>
      </div>
    `;

    try {
      await BrevoEmailService.sendEmail(customer.email, subject, htmlContent);
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
    
    const message = `NIC Life Insurance: ${isOverdue ? 'OVERDUE' : 'Payment Due'} - MUR ${installment.amount} ${isOverdue ? 'was' : ''} due ${dueDate}. Pay now: ${reminderUrl}`;

    try {
      await BrevoSMSService.sendSMS(customer.mobile, message);
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
      await BrevoEmailService.sendEmail(customer.email, subject, htmlContent);
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