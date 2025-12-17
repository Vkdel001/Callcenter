#!/usr/bin/env node

/**
 * Railway Environment Variables Verification Script
 * 
 * This script verifies that all required environment variables
 * are properly set on Railway for the webhook deployment.
 */

console.log('🔍 Railway Environment Variables Verification\n');

// Required environment variables for the webhook
const requiredVars = {
  'VITE_XANO_BASE_URL': {
    expected: 'https://xbde-ekcn-8kg2.n7e.xano.io',
    description: 'Xano base URL for API calls'
  },
  'VITE_XANO_CUSTOMER_API': {
    expected: 'Q4jDYUWL',
    description: 'API key for nic_cc_customer table'
  },
  'VITE_XANO_PAYMENT_API': {
    expected: '05i62DIx',
    description: 'API key for nic_cc_payment table'
  },
  'VITE_XANO_QR_TRANSACTIONS_API': {
    expected: '6MaKDJBx',
    description: 'API key for nic_qr_transactions table'
  }
};

// Optional environment variables
const optionalVars = {
  'PORT': {
    expected: '3000',
    description: 'Server port (Railway sets this automatically)'
  }
};

let allGood = true;

console.log('📋 Required Environment Variables:');
console.log('=====================================');

for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const matches = value === config.expected ? '✅' : '⚠️';
  
  console.log(`${status} ${varName}`);
  console.log(`   Description: ${config.description}`);
  console.log(`   Expected: ${config.expected}`);
  console.log(`   Actual: ${value || 'NOT SET'}`);
  console.log(`   Match: ${matches} ${value === config.expected ? 'Perfect' : 'Different value'}`);
  console.log('');
  
  if (!value) {
    allGood = false;
  }
}

console.log('📋 Optional Environment Variables:');
console.log('==================================');

for (const [varName, config] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  const status = value ? '✅' : 'ℹ️';
  
  console.log(`${status} ${varName}`);
  console.log(`   Description: ${config.description}`);
  console.log(`   Value: ${value || 'Not set (will use default)'}`);
  console.log('');
}

console.log('🎯 Verification Summary:');
console.log('========================');

if (allGood) {
  console.log('✅ All required environment variables are set!');
  console.log('✅ Webhook is ready for deployment on Railway');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('   1. Deploy webhook to Railway');
  console.log('   2. Test health endpoint: /health');
  console.log('   3. Verify webhook endpoint: /api/payment/v1/response-callback');
} else {
  console.log('❌ Some required environment variables are missing!');
  console.log('');
  console.log('🔧 To fix this on Railway:');
  console.log('   1. Go to Railway dashboard');
  console.log('   2. Select your webhook service');
  console.log('   3. Go to Variables tab');
  console.log('   4. Add missing variables');
  console.log('   5. Redeploy the service');
}

console.log('');
console.log('📖 For detailed instructions, see: RAILWAY_WEBHOOK_DEPLOYMENT_GUIDE.md');

// Exit with error code if variables are missing
process.exit(allGood ? 0 : 1);