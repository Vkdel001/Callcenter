#!/usr/bin/env node

/**
 * Quick fix for current backend service
 * This patches the immediate error without full deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying quick fix to current backend service...');

// Read current service file
const serviceFile = 'backend-reminder-service.cjs';
let content = fs.readFileSync(serviceFile, 'utf8');

console.log('📋 Current file size:', content.length, 'characters');

// Fix 1: Add null check for agents array
const agentMapFix = `
    const agentMap = {};
    if (agents && Array.isArray(agents)) {
      agents.forEach(agent => {
        agentMap[agent.id] = agent;
      });
    } else {
      Logger.warn('Agents API returned invalid data, skipping agent mapping', { agents });
    }`;

// Replace the problematic agents.forEach line
content = content.replace(
  /const agentMap = {};\s*agents\.forEach\(agent => {\s*agentMap\[agent\.id\] = agent;\s*}\);/,
  agentMapFix.trim()
);

// Fix 2: Better error logging in processPaymentReminders
const errorHandlingFix = `
    } catch (error) {
      Logger.error('Error processing payment reminders', { 
        error: error.message, 
        stack: error.stack,
        customersCount: customers ? customers.length : 'undefined',
        installmentsCount: installments ? installments.length : 'undefined',
        paymentPlansCount: paymentPlans ? paymentPlans.length : 'undefined',
        agentsCount: agents ? (Array.isArray(agents) ? agents.length : 'not-array') : 'undefined'
      });
    }`;

// Replace the generic error handling
content = content.replace(
  /} catch \(error\) {\s*Logger\.error\('Error processing payment reminders', error\);\s*}/,
  errorHandlingFix.trim()
);

// Fix 3: Add null check for customer lookup
const customerLookupFix = `
        // Get agent for CC (new logic)
        let agent = null;
        if (installment.payment_plan && paymentPlanMap[installment.payment_plan]) {
          const paymentPlan = paymentPlanMap[installment.payment_plan];
          if (paymentPlan.created_by_agent && agentMap[paymentPlan.created_by_agent]) {
            agent = agentMap[paymentPlan.created_by_agent];
          }
        }

        if (customer && customer.email) {`;

// This is a more complex replacement, let's just add the agent lookup
if (!content.includes('let agent = null;')) {
  // Add agent lookup before the customer email check
  content = content.replace(
    /if \(customer && customer\.email\) {/,
    customerLookupFix.trim()
  );
}

// Write the fixed content
fs.writeFileSync(serviceFile + '.fixed', content);

console.log('✅ Quick fix applied and saved to:', serviceFile + '.fixed');
console.log('📋 Fixed file size:', content.length, 'characters');

console.log('\n🚀 To apply the fix:');
console.log('1. sudo cp backend-reminder-service.cjs.fixed backend-reminder-service.cjs');
console.log('2. sudo pkill -f backend-reminder-service');
console.log('3. sudo -u www-data nohup /usr/bin/node backend-reminder-service.cjs > /var/log/nic-reminder-service.log 2>&1 &');
console.log('4. tail -f /var/log/nic-reminder-service.log');

console.log('\n⚠️ Note: This is a temporary fix. For full features (agent CC, enhanced QR), deploy the updated service.');