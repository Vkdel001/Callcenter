// CSR Function Testing Script
// Run this in browser console after logging in as CSR

console.log('🧪 Testing CSR Functions...')

// Test 1: CSR LOB Summary
console.log('\n📊 Test 1: CSR LOB Summary')
customerService.getCSRLOBSummary().then(result => {
  console.log('CSR LOB Summary Result:', result)
  if (result.success) {
    console.log('✅ CSR LOB Summary working!')
    console.log('Total customers:', result.totalCustomers)
    console.log('Life customers:', result.lobSummary.life.count)
    console.log('Health customers:', result.lobSummary.health.count)
    console.log('Motor customers:', result.lobSummary.motor.count)
  } else {
    console.log('❌ CSR LOB Summary failed:', result.error)
  }
}).catch(error => {
  console.log('❌ CSR LOB Summary error:', error)
})

// Test 2: CSR Customer List for Life - Oct-25
console.log('\n👥 Test 2: CSR Customer List (Life - Oct-25)')
customerService.getCSRCustomersForLOBMonth('life', 'Oct-25').then(result => {
  console.log('CSR Customer List Result:', result)
  if (result.success) {
    console.log('✅ CSR Customer List working!')
    console.log('Customers found:', result.customers.length)
    console.log('Total amount:', result.totalAmount)
    if (result.customers.length > 0) {
      console.log('Sample customer:', result.customers[0])
    }
  } else {
    console.log('❌ CSR Customer List failed:', result.error)
  }
}).catch(error => {
  console.log('❌ CSR Customer List error:', error)
})

// Test 3: Compare CSR vs Sales Agent access
console.log('\n🔍 Test 3: Access Comparison')
console.log('Current user:', window.currentUser)
console.log('Agent type:', window.currentUser?.agent_type)

if (window.currentUser?.agent_type === 'csr') {
  console.log('✅ User is CSR - should have universal access')
} else if (window.currentUser?.agent_type === 'sales_agent') {
  console.log('✅ User is Sales Agent - should have limited access')
} else {
  console.log('ℹ️ User is not CSR or Sales Agent')
}

console.log('\n🎯 CSR Testing Complete!')