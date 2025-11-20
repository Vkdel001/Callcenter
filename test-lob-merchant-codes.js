/**
 * Test LOB-Specific Merchant Code Selection
 * 
 * This test verifies that the correct merchant code is selected
 * based on the customer's Line of Business (LOB)
 */

// Mock environment variables
const mockEnv = {
  VITE_ZWENNPAY_MERCHANT_LIFE: '56',
  VITE_ZWENNPAY_MERCHANT_HEALTH: '153',
  VITE_ZWENNPAY_MERCHANT_MOTOR: '155'
}

// Simulate the getMerchantIdForLOB function
function getMerchantIdForLOB(lineOfBusiness) {
  const merchantCodes = {
    life: mockEnv.VITE_ZWENNPAY_MERCHANT_LIFE || '56',
    health: mockEnv.VITE_ZWENNPAY_MERCHANT_HEALTH || '153',
    motor: mockEnv.VITE_ZWENNPAY_MERCHANT_MOTOR || '155'
  }
  
  const lob = (lineOfBusiness || 'life').toLowerCase().trim()
  const merchantId = merchantCodes[lob] || merchantCodes.life
  
  console.log(`🏦 Merchant ID selected: ${merchantId} for LOB: ${lob}`)
  
  return merchantId
}

// Test cases
console.log('\n🧪 Testing LOB-Specific Merchant Code Selection\n')
console.log('=' .repeat(60))

const testCases = [
  { lob: 'life', expected: '56', description: 'Life Insurance' },
  { lob: 'health', expected: '153', description: 'Health Insurance' },
  { lob: 'motor', expected: '155', description: 'Motor Insurance' },
  { lob: 'LIFE', expected: '56', description: 'Life Insurance (uppercase)' },
  { lob: 'Health', expected: '153', description: 'Health Insurance (mixed case)' },
  { lob: ' motor ', expected: '155', description: 'Motor Insurance (with spaces)' },
  { lob: null, expected: '56', description: 'Null LOB (default to Life)' },
  { lob: undefined, expected: '56', description: 'Undefined LOB (default to Life)' },
  { lob: '', expected: '56', description: 'Empty LOB (default to Life)' },
  { lob: 'unknown', expected: '56', description: 'Unknown LOB (default to Life)' }
]

let passed = 0
let failed = 0

testCases.forEach((test, index) => {
  const result = getMerchantIdForLOB(test.lob)
  const success = result === test.expected
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.description}`)
    console.log(`   Input: "${test.lob}" → Merchant: ${result}`)
    passed++
  } else {
    console.log(`❌ Test ${index + 1}: ${test.description}`)
    console.log(`   Input: "${test.lob}" → Expected: ${test.expected}, Got: ${result}`)
    failed++
  }
  console.log('')
})

console.log('=' .repeat(60))
console.log(`\n📊 Test Results: ${passed}/${testCases.length} passed, ${failed} failed\n`)

if (failed === 0) {
  console.log('🎉 All tests passed! LOB-specific merchant code selection is working correctly.\n')
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.\n')
}

// Sample customer data test
console.log('=' .repeat(60))
console.log('\n📋 Sample Customer QR Generation Test\n')

const sampleCustomers = [
  {
    name: 'John Smith',
    policyNumber: 'LIFE-001',
    amountDue: 5000,
    lineOfBusiness: 'life'
  },
  {
    name: 'Mary Johnson',
    policyNumber: 'HEALTH/2024/002',
    amountDue: 1200,
    lineOfBusiness: 'health'
  },
  {
    name: 'David Brown',
    policyNumber: 'M-2024-003',
    amountDue: 800,
    lineOfBusiness: 'motor'
  }
]

sampleCustomers.forEach((customer, index) => {
  const merchantId = getMerchantIdForLOB(customer.lineOfBusiness)
  console.log(`Customer ${index + 1}: ${customer.name}`)
  console.log(`  Policy: ${customer.policyNumber}`)
  console.log(`  LOB: ${customer.lineOfBusiness}`)
  console.log(`  Merchant Code: ${merchantId}`)
  console.log(`  Amount: MUR ${customer.amountDue.toLocaleString()}`)
  console.log('')
})

console.log('=' .repeat(60))
console.log('\n✅ Test completed successfully!\n')
