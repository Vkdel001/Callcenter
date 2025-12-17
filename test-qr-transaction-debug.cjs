require('dotenv').config();
const axios = require('axios');

const XANO_BASE_URL = process.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io';
const XANO_QR_TRANSACTIONS_API_KEY = process.env.VITE_XANO_QR_TRANSACTIONS_API || '6MaKDJBx';

async function debugQRTransaction() {
  try {
    console.log('🔍 Fetching QR transactions for policy: 09889');
    
    // Get all QR transactions
    const qrResponse = await axios.get(
      `${XANO_BASE_URL}/api:${XANO_QR_TRANSACTIONS_API_KEY}/nic_qr_transactions`
    );
    
    console.log(`📊 Total QR transactions: ${qrResponse.data.length}`);
    
    // Find matching transactions for policy 09889
    const matchingTransactions = qrResponse.data.filter(
      t => t.policy_number === '09889'
    );
    
    console.log(`🎯 Matching transactions for policy 09889: ${matchingTransactions.length}`);
    
    if (matchingTransactions.length > 0) {
      matchingTransactions.forEach((transaction, index) => {
        console.log(`\n📋 Transaction ${index + 1}:`);
        console.log(`   ID: ${transaction.id}`);
        console.log(`   Policy: ${transaction.policy_number}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   QR Type: ${transaction.qr_type}`);
        console.log(`   Customer Name: ${transaction.customer_name || 'Missing'}`);
        console.log(`   Customer Email: ${transaction.customer_email || 'Missing'}`);
        console.log(`   Agent Name: ${transaction.agent_name || 'Missing'}`);
        console.log(`   Agent Email: ${transaction.agent_email || 'Missing'}`);
        console.log(`   Created: ${transaction.created_at}`);
        console.log(`   Line of Business: ${transaction.line_of_business || 'Missing'}`);
      });
    } else {
      console.log('❌ No transactions found for policy 09889');
      
      // Show a few recent transactions for reference
      console.log('\n📋 Recent transactions (last 5):');
      const recentTransactions = qrResponse.data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
        
      recentTransactions.forEach((transaction, index) => {
        console.log(`   ${index + 1}. Policy: ${transaction.policy_number}, Status: ${transaction.status}, Type: ${transaction.qr_type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugQRTransaction();