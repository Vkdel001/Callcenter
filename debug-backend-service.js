#!/usr/bin/env node

/**
 * Debug script to identify backend service errors
 * Run this to see what's causing the payment reminder processing error
 */

import https from 'https';

// Configuration (same as backend service)
const CONFIG = {
  XANO_BASE_URL: process.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io',
  XANO_CUSTOMER_API: process.env.VITE_XANO_CUSTOMER_API || 'Q4jDYUWL',
  XANO_PAYMENT_API: process.env.VITE_XANO_PAYMENT_API || '05i62DIx',
};

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
          'User-Agent': 'NIC-Debug-Script/1.0'
        }
      };
      
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
            console.error('Failed to parse response:', responseData);
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Request failed:', error.message);
        reject(error);
      });
      
      req.end();
    });
  }
  
  static async getCustomers() {
    try {
      return await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_customer`);
    } catch (error) {
      console.error('Failed to fetch customers:', error.message);
      return [];
    }
  }
  
  static async getInstallments() {
    try {
      return await this.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_installment`);
    } catch (error) {
      console.error('Failed to fetch installments:', error.message);
      return [];
    }
  }

  static async getPaymentPlans() {
    try {
      return await this.makeRequest(`${CONFIG.XANO_PAYMENT_API}/nic_cc_payment_plan`);
    } catch (error) {
      console.error('Failed to fetch payment plans:', error.message);
      return [];
    }
  }

  static async getAgents() {
    try {
      return await this.makeRequest(`${CONFIG.XANO_CUSTOMER_API}/nic_cc_agent`);
    } catch (error) {
      console.error('Failed to fetch agents:', error.message);
      return [];
    }
  }
}

async function debugPaymentReminders() {
  console.log('🔍 Debugging Payment Reminder Processing...\n');
  
  try {
    console.log('1. Testing API connections...');
    
    // Test each API endpoint
    const customers = await XanoAPI.getCustomers();
    console.log(`✅ Customers API: ${customers.length} records`);
    
    const installments = await XanoAPI.getInstallments();
    console.log(`✅ Installments API: ${installments.length} records`);
    
    const paymentPlans = await XanoAPI.getPaymentPlans();
    console.log(`✅ Payment Plans API: ${paymentPlans.length} records`);
    
    const agents = await XanoAPI.getAgents();
    console.log(`✅ Agents API: ${agents ? agents.length : 'undefined'} records`);
    if (!agents) {
      console.log('❌ Agents API returned undefined - this is the source of the error!');
    }
    
    console.log('\n2. Analyzing data relationships...');
    
    // Check for overdue installments (current logic)
    const overdueInstallments = installments.filter(installment => {
      const dueDate = new Date(installment.due_date);
      const today = new Date();
      const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      return daysDiff > 0 && installment.status !== 'paid';
    });
    
    console.log(`📊 Found ${overdueInstallments.length} overdue installments`);
    
    // Create lookup maps
    const customerMap = {};
    customers.forEach(customer => {
      customerMap[customer.id] = customer;
    });

    const paymentPlanMap = {};
    paymentPlans.forEach(plan => {
      paymentPlanMap[plan.id] = plan;
    });

    const agentMap = {};
    if (agents && Array.isArray(agents)) {
      agents.forEach(agent => {
        agentMap[agent.id] = agent;
      });
    } else {
      console.log('⚠️ Agents data is not an array, skipping agent mapping');
    }
    
    console.log('\n3. Testing installment processing logic...');
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const installment of overdueInstallments.slice(0, 5)) { // Test first 5
      try {
        console.log(`\n📋 Processing installment ${installment.id}:`);
        console.log(`   - Customer ID: ${installment.customer_id}`);
        console.log(`   - Payment Plan: ${installment.payment_plan}`);
        console.log(`   - Due Date: ${installment.due_date}`);
        console.log(`   - Amount: ${installment.amount}`);
        
        const customer = customerMap[installment.customer_id];
        console.log(`   - Customer Found: ${!!customer}`);
        
        if (customer) {
          console.log(`   - Customer Email: ${customer.email || 'NO EMAIL'}`);
          console.log(`   - Customer Name: ${customer.first_name} ${customer.last_name}`);
        }
        
        // Get agent for CC (new logic)
        let agent = null;
        if (installment.payment_plan && paymentPlanMap[installment.payment_plan]) {
          const paymentPlan = paymentPlanMap[installment.payment_plan];
          console.log(`   - Payment Plan Found: ${!!paymentPlan}`);
          console.log(`   - Created By Agent: ${paymentPlan.created_by_agent || 'NONE'}`);
          
          if (paymentPlan.created_by_agent && agentMap[paymentPlan.created_by_agent]) {
            agent = agentMap[paymentPlan.created_by_agent];
            console.log(`   - Agent Found: ${agent.email || 'NO EMAIL'}`);
          }
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing installment ${installment.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   - Processed: ${processedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ No errors found in data processing logic');
      console.log('🔧 The issue might be in the email sending or database update logic');
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugPaymentReminders().then(() => {
  console.log('\n🏁 Debug completed');
}).catch(error => {
  console.error('💥 Debug script crashed:', error.message);
});