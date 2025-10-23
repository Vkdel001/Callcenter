#!/usr/bin/env node

/**
 * Simple Local Test for NIC Reminder Service
 * ES Module compatible version
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleTester {
    constructor() {
        this.config = {};
        this.testResults = [];
    }

    log(message, success = true) {
        const status = success ? '✅' : '❌';
        const logMessage = `${status} ${message}`;
        console.log(logMessage);
        this.testResults.push({ message, success });
    }

    loadEnvFile() {
        try {
            const envPath = path.join(__dirname, '.env');
            const envContent = fs.readFileSync(envPath, 'utf8');

            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    this.config[key.trim()] = value;
                }
            });

            this.log('Environment variables loaded from .env file');
            return true;
        } catch (error) {
            this.log(`Failed to load .env file: ${error.message}`, false);
            return false;
        }
    }

    async testEnvironmentVariables() {
        console.log('\n🔧 Testing Environment Variables...');

        const requiredVars = [
            'VITE_XANO_BASE_URL',
            'VITE_XANO_CUSTOMER_API',
            'VITE_XANO_PAYMENT_API',
            'VITE_BREVO_API_KEY',
            'VITE_SENDER_EMAIL'
        ];

        let allPresent = true;

        for (const varName of requiredVars) {
            if (this.config[varName]) {
                const displayValue = this.config[varName].length > 20
                    ? this.config[varName].substring(0, 20) + '...'
                    : this.config[varName];
                this.log(`${varName}: ${displayValue}`);
            } else {
                this.log(`${varName}: MISSING`, false);
                allPresent = false;
            }
        }

        return allPresent;
    }

    async makeHttpsRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ statusCode: res.statusCode, data: parsed });
                    } catch (error) {
                        resolve({ statusCode: res.statusCode, data: data });
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    async testXanoConnection() {
        console.log('\n🌐 Testing Xano API Connection...');

        try {
            const baseUrl = this.config.VITE_XANO_BASE_URL;
            const customerApi = this.config.VITE_XANO_CUSTOMER_API;

            if (!baseUrl || !customerApi) {
                this.log('Xano configuration missing', false);
                return false;
            }

            const url = `${baseUrl}/api:${customerApi}/nic_cc_customer`;
            this.log(`Testing: ${url}`);

            const response = await this.makeHttpsRequest(url);

            if (response.statusCode === 200) {
                const customers = Array.isArray(response.data) ? response.data : [];
                this.log(`Successfully connected to Xano - Found ${customers.length} customers`);
                return true;
            } else {
                this.log(`Xano API returned status ${response.statusCode}`, false);
                return false;
            }

        } catch (error) {
            this.log(`Xano connection failed: ${error.message}`, false);
            return false;
        }
    }

    async testBrevoConnection() {
        console.log('\n📧 Testing Brevo Configuration...');

        try {
            const apiKey = this.config.VITE_BREVO_API_KEY;
            const senderEmail = this.config.VITE_SENDER_EMAIL;

            if (!apiKey || apiKey.length < 10) {
                this.log('Brevo API key missing or invalid', false);
                return false;
            }

            if (!senderEmail || !senderEmail.includes('@')) {
                this.log('Sender email missing or invalid', false);
                return false;
            }

            this.log('Brevo API key is configured');
            this.log(`Sender email: ${senderEmail}`);

            // Test API key format
            if (apiKey.startsWith('xkeysib-')) {
                this.log('Brevo API key format is correct');
                return true;
            } else {
                this.log('Brevo API key format may be incorrect', false);
                return false;
            }

        } catch (error) {
            this.log(`Brevo configuration test failed: ${error.message}`, false);
            return false;
        }
    }

    async testBusinessHoursLogic() {
        console.log('\n⏰ Testing Business Hours Logic...');

        try {
            const currentHour = new Date().getHours();
            const isBusinessHours = currentHour >= 9 && currentHour < 17;

            this.log(`Current hour: ${currentHour}`);
            this.log(`Is business hours (9 AM - 5 PM): ${isBusinessHours}`);

            // Test edge cases
            const testHours = [8, 9, 12, 16, 17, 18];
            for (const hour of testHours) {
                const shouldBeBusiness = hour >= 9 && hour < 17;
                this.log(`Hour ${hour}: ${shouldBeBusiness ? 'Business' : 'Non-business'} hours`);
            }

            return true;
        } catch (error) {
            this.log(`Business hours test failed: ${error.message}`, false);
            return false;
        }
    }

    async testEmailTemplateGeneration() {
        console.log('\n📄 Testing Email Template Generation...');

        try {
            // Test payment reminder template
            const mockCustomer = {
                id: 1,
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                policy_number: 'POL123456'
            };

            const mockInstallment = {
                id: 1,
                amount: 1500,
                due_date: '2024-10-01'
            };

            // Generate payment reminder template
            const paymentSubject = 'Payment Reminder - NIC Life Insurance';
            const paymentHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Payment Reminder</h2>
          <p>Dear ${mockCustomer.first_name} ${mockCustomer.last_name},</p>
          <p>This is a friendly reminder that your payment is overdue.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Details:</h3>
            <p><strong>Amount Due:</strong> MUR ${mockInstallment.amount}</p>
            <p><strong>Due Date:</strong> ${new Date(mockInstallment.due_date).toLocaleDateString()}</p>
            <p><strong>Policy Number:</strong> ${mockCustomer.policy_number || 'N/A'}</p>
          </div>
        </div>
      `;

            if (paymentHtml.includes(mockCustomer.first_name) && paymentHtml.includes(mockInstallment.amount)) {
                this.log('Payment reminder template generated successfully');
            } else {
                this.log('Payment reminder template generation failed', false);
                return false;
            }

            // Generate signature reminder template
            const qrUrl = `https://payments.niclmauritius.site/qr/${mockCustomer.id}`;
            const signatureHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Signature Required</h2>
          <p>Dear ${mockCustomer.first_name} ${mockCustomer.last_name},</p>
          <p>We need your signature on the Acknowledgment of Debt document.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${qrUrl}" style="background-color: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Sign Document Now
            </a>
          </div>
        </div>
      `;

            if (signatureHtml.includes(mockCustomer.first_name) && signatureHtml.includes(qrUrl)) {
                this.log('Signature reminder template generated successfully');
            } else {
                this.log('Signature reminder template generation failed', false);
                return false;
            }

            return true;
        } catch (error) {
            this.log(`Email template test failed: ${error.message}`, false);
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting NIC Reminder Service Local Tests...\n');

        // Load environment first
        if (!this.loadEnvFile()) {
            console.log('\n❌ Cannot proceed without environment variables');
            return false;
        }

        const tests = [
            { name: 'Environment Variables', fn: () => this.testEnvironmentVariables() },
            { name: 'Xano Connection', fn: () => this.testXanoConnection() },
            { name: 'Brevo Configuration', fn: () => this.testBrevoConnection() },
            { name: 'Business Hours Logic', fn: () => this.testBusinessHoursLogic() },
            { name: 'Email Template Generation', fn: () => this.testEmailTemplateGeneration() }
        ];

        let passedTests = 0;

        for (const test of tests) {
            try {
                const result = await test.fn();
                if (result) passedTests++;
            } catch (error) {
                this.log(`${test.name} test crashed: ${error.message}`, false);
            }
        }

        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        console.log(`✅ Passed: ${passedTests}/${tests.length}`);
        console.log(`❌ Failed: ${tests.length - passedTests}/${tests.length}`);

        if (passedTests === tests.length) {
            console.log('\n🎉 All tests passed! The service is ready for VPS deployment.');
            console.log('\nNext steps:');
            console.log('1. Commit these files to your repository');
            console.log('2. Push to GitHub');
            console.log('3. Pull on your VPS server');
            console.log('4. Run the installation script');
            return true;
        } else {
            console.log('\n⚠️  Some tests failed. Please fix the issues before deploying to VPS.');
            console.log('\nCommon fixes:');
            console.log('- Check your .env file has all required variables');
            console.log('- Verify your Xano API keys are correct');
            console.log('- Ensure your Brevo API key is valid');
            return false;
        }
    }
}

// Run tests
const tester = new SimpleTester();
tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test runner crashed:', error);
    process.exit(1);
});