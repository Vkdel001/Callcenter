# Railway Webhook Multi-Month Policy Payment Fix - Design Document

## Overview

This document outlines the design approach for fixing the Railway webhook's multi-month policy payment allocation issue. The current webhook uses simple policy number lookup which causes payment misallocation when multiple records exist for the same policy across different months.

## Problem Analysis

### Current Implementation Issues

1. **Simple Policy Lookup**: The webhook searches for customers using only `policy_number`, always finding the first matching record
2. **No Month Context**: QR codes don't include month information, making it impossible to target specific month records
3. **Payment Misallocation**: Payments intended for specific months get applied to wrong records
4. **Data Integrity Risk**: Multiple records for same policy can have inconsistent payment states

### Current Code Flow (webhookcode.js)

```javascript
// Current problematic lookup - finds first match only
const customer = customersResponse.data.find(
  c => c.policy_number === originalPolicyNumber
);
```

## Design Options Analysis

### Option 1: Enhanced QR Code Context (Comprehensive)
- **Approach**: Modify QR generation to include month information
- **Pros**: Most accurate, deterministic matching
- **Cons**: Requires frontend changes, QR regeneration for existing customers
- **Status**: Not selected for initial implementation

### Option 2: Fallback Logic Only (Selected Approach)
- **Approach**: Keep current QR format, add smart fallback logic in webhook
- **Pros**: No frontend changes, backward compatible, immediate deployment
- **Cons**: Requires fallback strategy when multiple records exist
- **Status**: **SELECTED FOR IMPLEMENTATION**

## Option 2: Fallback Logic Design

### Core Strategy

When multiple records exist for the same policy number, implement intelligent fallback logic to select the most appropriate record for payment application.

### Fallback Decision Tree

```
1. Single Record Found
   └── Apply payment directly ✅

2. Multiple Records Found
   ├── Check for "current month" record
   │   └── Apply to current month if exists ✅
   ├── Check for "latest assigned_month" record  
   │   └── Apply to most recent month ✅
   ├── Check for "highest balance" record
   │   └── Apply to record with highest amount_due ✅
   └── Fallback to "first record" with logging ⚠️
```

### Fallback Strategy Options

#### Strategy A: Latest Month Priority
- **Logic**: Select record with the most recent `assigned_month` value
- **Rationale**: Customers typically pay their most recent installments first
- **Implementation**: Parse month strings (e.g., "Dec-25") and find latest chronologically

#### Strategy B: Highest Balance Priority  
- **Logic**: Select record with the highest `amount_due` value
- **Rationale**: Customers often prioritize paying off larger outstanding amounts
- **Implementation**: Compare `amount_due` values and select maximum

#### Strategy C: Current Month Priority
- **Logic**: Select record where `assigned_month` matches current calendar month
- **Rationale**: Customers are most likely paying current month's premium
- **Implementation**: Match current month-year against `assigned_month` field

#### Strategy D: Hybrid Approach (Recommended)
- **Logic**: Combine multiple strategies with priority order
- **Priority Order**:
  1. Current month match (if exists)
  2. Latest month (most recent)
  3. Highest balance
  4. First record (with warning log)

### Implementation Architecture

#### Enhanced Customer Lookup Function

```javascript
async function findTargetCustomerRecord(policyNumber) {
  // Get all records for policy
  const allCustomers = await getAllCustomersForPolicy(policyNumber);
  
  if (allCustomers.length === 0) {
    return { success: false, error: 'No customer found' };
  }
  
  if (allCustomers.length === 1) {
    return { 
      success: true, 
      customer: allCustomers[0], 
      selectionReason: 'single_record' 
    };
  }
  
  // Multiple records - apply fallback logic
  const selectedCustomer = applyFallbackLogic(allCustomers);
  
  return {
    success: true,
    customer: selectedCustomer.record,
    selectionReason: selectedCustomer.reason,
    alternativeRecords: allCustomers.filter(c => c.id !== selectedCustomer.record.id)
  };
}
```

#### Fallback Logic Implementation

```javascript
function applyFallbackLogic(customerRecords) {
  // Strategy 1: Current month priority
  const currentMonth = getCurrentMonthString(); // e.g., "Jan-25"
  const currentMonthRecord = customerRecords.find(
    c => c.assigned_month === currentMonth
  );
  
  if (currentMonthRecord) {
    return {
      record: currentMonthRecord,
      reason: 'current_month_match'
    };
  }
  
  // Strategy 2: Latest month priority
  const latestRecord = findLatestMonthRecord(customerRecords);
  if (latestRecord) {
    return {
      record: latestRecord,
      reason: 'latest_month'
    };
  }
  
  // Strategy 3: Highest balance priority
  const highestBalanceRecord = customerRecords.reduce((max, current) => 
    (current.amount_due > max.amount_due) ? current : max
  );
  
  return {
    record: highestBalanceRecord,
    reason: 'highest_balance'
  };
}
```

### Logging and Audit Strategy

#### Enhanced Logging Requirements

1. **Multi-Record Detection**: Log when multiple records are found
2. **Selection Logic**: Record which fallback strategy was used
3. **Alternative Records**: Log details of records NOT selected
4. **Payment Application**: Track which specific record received the payment

#### Audit Log Structure

```javascript
const auditLog = {
  timestamp: new Date().toISOString(),
  policy_number: originalPolicyNumber,
  payment_amount: amountPaid,
  transaction_reference: paymentData.transactionReference,
  
  // Multi-record handling
  total_records_found: allCustomers.length,
  selected_record: {
    id: selectedCustomer.id,
    assigned_month: selectedCustomer.assigned_month,
    amount_due: selectedCustomer.amount_due,
    selection_reason: selectionReason
  },
  
  // Alternative records (for audit trail)
  alternative_records: alternativeRecords.map(r => ({
    id: r.id,
    assigned_month: r.assigned_month,
    amount_due: r.amount_due
  })),
  
  // Payment result
  old_balance: currentBalance,
  new_balance: newBalance,
  payment_status: 'success'
};
```

### Error Handling Strategy

#### Graceful Degradation

1. **API Failures**: If Xano API fails, log error but don't crash
2. **Invalid Data**: Handle missing or malformed `assigned_month` values
3. **Calculation Errors**: Validate balance calculations before applying
4. **Duplicate Payments**: Detect and prevent duplicate payment processing

#### Fallback Safety Measures

1. **Balance Validation**: Ensure new balance is never negative
2. **Amount Validation**: Verify payment amount is reasonable
3. **Record Validation**: Confirm selected record exists before updating
4. **Transaction Atomicity**: Use database transactions where possible

### Performance Considerations

#### Optimization Strategies

1. **Batch API Calls**: Fetch all customer records in single request
2. **Caching**: Cache customer lookups for duplicate callbacks
3. **Async Processing**: Use async/await for non-blocking operations
4. **Error Recovery**: Implement retry logic for transient failures

### Testing Strategy

#### Test Scenarios

1. **Single Record**: Verify normal payment processing continues to work
2. **Multiple Records - Current Month**: Test current month selection priority
3. **Multiple Records - Latest Month**: Test chronological month selection
4. **Multiple Records - Highest Balance**: Test balance-based selection
5. **Edge Cases**: Test invalid months, equal balances, missing data

#### Test Data Requirements

```javascript
// Test scenario: Policy with multiple months
const testCustomers = [
  {
    id: 1,
    policy_number: "HEALTH/2024/001",
    assigned_month: "Nov-24",
    amount_due: 1500,
    name: "John Doe"
  },
  {
    id: 2, 
    policy_number: "HEALTH/2024/001",
    assigned_month: "Dec-24", 
    amount_due: 2000,
    name: "John Doe"
  },
  {
    id: 3,
    policy_number: "HEALTH/2024/001", 
    assigned_month: "Jan-25",
    amount_due: 1800,
    name: "John Doe"
  }
];
```

## Implementation Plan

### Phase 1: Core Fallback Logic
1. Implement multi-record detection
2. Add fallback selection strategies
3. Enhance logging and audit trails
4. Update error handling

### Phase 2: Testing and Validation
1. Create comprehensive test suite
2. Test with real multi-month data
3. Validate fallback logic accuracy
4. Performance testing

### Phase 3: Deployment and Monitoring
1. Deploy to Railway staging environment
2. Monitor payment processing logs
3. Validate payment allocation accuracy
4. Production deployment

## Risk Assessment

### High Risk Items
- **Payment Misallocation**: Fallback logic could still select wrong record
- **Data Corruption**: Balance calculations could create inconsistencies
- **Performance Impact**: Multiple record lookups could slow processing

### Mitigation Strategies
- **Extensive Testing**: Test all fallback scenarios thoroughly
- **Audit Logging**: Comprehensive logging for troubleshooting
- **Rollback Plan**: Keep current webhook as backup
- **Monitoring**: Real-time alerts for payment processing issues

## Success Criteria

1. **Zero Payment Misallocation**: All payments applied to appropriate records
2. **Audit Compliance**: Complete traceability of payment allocation decisions
3. **Performance Maintained**: No significant increase in processing time
4. **Backward Compatibility**: Existing single-record policies continue working
5. **Error Reduction**: Fewer customer service inquiries about payment allocation

## Next Steps

1. **User Approval**: Get approval on fallback strategy preference
2. **Implementation Tasks**: Create detailed task breakdown
3. **Development**: Implement enhanced webhook logic
4. **Testing**: Comprehensive testing with multi-month scenarios
5. **Deployment**: Staged rollout with monitoring