#!/usr/bin/env node

/**
 * Webhook Startup Script
 * Loads environment variables and starts the webhook server
 */

const fs = require('fs');
const path = require('path');

// Function to load environment variables from file
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Environment file not found: ${filePath}`);
    return;
  }

  const envContent = fs.readFileSync(filePath, 'utf8');
  const lines = envContent.split('\n');

  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key] = value;
      }
    }
  });
}

console.log('🚀 Starting NIC Webhook Server...\n');

// Load environment variables from .env file
require('dotenv').config();

console.log('📁 Environment variables loaded from .env file');

// Check configuration using VITE_ variables (matching your .env)
console.log('\n🔍 Checking configuration...');

const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY;
const XANO_BASE_URL = process.env.VITE_XANO_BASE_URL;
const QR_TRANSACTIONS_API = process.env.VITE_XANO_QR_TRANSACTIONS_API;

console.log(`   📧 BREVO_API_KEY: ${BREVO_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`   🗄️ XANO_BASE_URL: ${XANO_BASE_URL ? '✅ Configured' : '❌ Missing'}`);
console.log(`   📱 QR_TRANSACTIONS_API: ${QR_TRANSACTIONS_API ? '✅ Configured' : '❌ Missing'}`);

if (BREVO_API_KEY) {
  console.log('\n✅ Email notifications will work!');
} else {
  console.log('\n⚠️ Email notifications will be skipped (missing VITE_BREVO_API_KEY)');
  console.log('   QR transaction processing will still work.');
}

console.log('\n🎯 Starting webhook server...');

// Start the webhook server
require('./webhookcode-fixed.js');