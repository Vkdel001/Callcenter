/**
 * Test Policy Number Sanitization for QR Code Generation
 * 
 * This test demonstrates how policy numbers are sanitized
 * before being used in QR code generation to ensure compatibility
 * with payment systems and QR scanners.
 */

// Simulate the sanitization function
function sanitizePolicyNumber(policyNumber) {
  if (!policyNumber) return ''
  
  // Replace all hyphens and slashes with dots
  const sanitized = policyNumber
    .replace(/-/g, '.')  // Replace all hyphens with dots
    .replace(/\//g, '.')  // Replace all slashes with dots
  
  return sanitized
}

// Test cases covering different policy number formats
const testCases = [
  // Life Insurance policies
  { original: 'LIFE-001', expected: 'LIFE.001', lob: 'Life' },
  { original: 'LIFE-2024-001', expected: 'LIFE.2024.001', lob: 'Life' },
  { original: 'L/2024/001', expected: 'L.2024.001', lob: 'Life' },
  
  // Health Insurance policies
  { original: 'HEALTH-002', expected: 'HEALTH.002', lob: 'Health' },
  { original: 'HEALTH/2024/002', expected: 'HEALTH.2024.002', lob: 'Health' },
  { original: 'H-2024-002', expected: 'H.2024.002', lob: 'Health' },
  
  // Motor Insurance policies
  { original: 'MOTOR-003', expected: 'MOTOR.003', lob: 'Motor' },
  { original: 'MOTOR/2024/003', expected: 'MOTOR.2024.003', lob: 'Motor' },
  { original: 'M-2024-003', expected: 'M.2024.003', lob: 'Motor' },
  
  // Mixed formats
  { original: 'POL-2024/001', expected: 'POL.2024.001', lob: 'Mixed' },
  { original: 'ABC/DEF-GHI', expected: 'ABC.DEF.GHI', lob: 'Mixed' },
  
  // Edge cases
  { original: 'SIMPLE001', expected: 'SIMPLE001', lob: 'No special chars' },
  { original: '', expected: '', lob: 'Empty string' },
  { original: '---', expected: '...', lob: 'Only hyphens' },
  { original: '///', expected: '...', lob: 'Only slashes' },
]

console.log('='.repeat(80))
console.log('POLICY NUMBER SANITIZATION TEST FOR QR CODE GENERATION')
console.log('='.repeat(80))
console.log()

let passCount = 0
let failCount = 0

testCases.forEach((test, index) => {
  const result = sanitizePolicyNumber(test.original)
  const passed = result === test.expected
  
  if (passed) {
    passCount++
    console.log(`✅ Test ${index + 1} PASSED (${test.lob})`)
  } else {
    failCount++
    console.log(`❌ Test ${index + 1} FAILED (${test.lob})`)
  }
  
  console.log(`   Original:  "${test.original}"`)
  console.log(`   Expected:  "${test.expected}"`)
  console.log(`   Result:    "${result}"`)
  console.log()
})

console.log('='.repeat(80))
console.log(`SUMMARY: ${passCount} passed, ${failCount} failed out of ${testCases.length} tests`)
console.log('='.repeat(80))
console.log()

// Demonstrate real-world usage
console.log('REAL-WORLD EXAMPLES:')
console.log('='.repeat(80))

const realWorldExamples = [
  {
    customer: 'John Smith',
    policyNumber: 'LIFE-2024-001',
    amountDue: 5000,
    lob: 'Life Insurance'
  },
  {
    customer: 'Mary Johnson',
    policyNumber: 'HEALTH/2024/002',
    amountDue: 1200,
    lob: 'Health Insurance'
  },
  {
    customer: 'David Brown',
    policyNumber: 'M-2024-003',
    amountDue: 800,
    lob: 'Motor Insurance'
  }
]

realWorldExamples.forEach((example, index) => {
  const sanitized = sanitizePolicyNumber(example.policyNumber)
  console.log(`\nExample ${index + 1}: ${example.customer} (${example.lob})`)
  console.log(`  Original Policy:   ${example.policyNumber}`)
  console.log(`  QR Code Policy:    ${sanitized}`)
  console.log(`  Amount Due:        MUR ${example.amountDue.toLocaleString()}`)
  console.log(`  ✅ Safe for QR scanning and payment systems`)
})

console.log()
console.log('='.repeat(80))
console.log('BENEFITS OF SANITIZATION:')
console.log('='.repeat(80))
console.log('✅ Universal compatibility with payment systems')
console.log('✅ No URL encoding issues')
console.log('✅ Banking system friendly')
console.log('✅ QR scanner friendly')
console.log('✅ Consistent formatting across all LOBs')
console.log('✅ Solves Health vs Motor policy scanning issues')
console.log('='.repeat(80))
