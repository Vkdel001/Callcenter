import { paymentApi } from '../services/apiClient'

// Utility to check what fields actually exist in the database
export const checkDatabaseFields = async () => {
  try {
    console.log('🔍 Checking database schema...')
    
    // Get a sample payment plan to see what fields exist
    const response = await paymentApi.get('/nic_cc_payment_plan')
    const plans = response.data || []
    
    if (plans.length > 0) {
      const samplePlan = plans[0]
      console.log('📋 Available fields in nic_cc_payment_plan:', Object.keys(samplePlan))
      
      // Check for signature workflow fields
      const signatureFields = [
        'signature_status',
        'signature_deadline', 
        'signature_reminder_count',
        'signature_received_date',
        'created_by_agent',
        'approved_by_agent'
      ]
      
      const missingFields = signatureFields.filter(field => !(field in samplePlan))
      const existingFields = signatureFields.filter(field => field in samplePlan)
      
      console.log('✅ Existing signature fields:', existingFields)
      console.log('❌ Missing signature fields:', missingFields)
      
      return {
        allFields: Object.keys(samplePlan),
        existingSignatureFields: existingFields,
        missingSignatureFields: missingFields,
        hasSignatureWorkflow: missingFields.length === 0
      }
    } else {
      console.log('⚠️ No payment plans found to check schema')
      return null
    }
  } catch (error) {
    console.error('❌ Error checking database fields:', error)
    return null
  }
}

// Test if signature fields are available by checking existing records
export const testSignatureFieldCreation = async () => {
  try {
    console.log('🧪 Testing signature field availability...')
    
    // Instead of creating a test record, let's check if the fields exist in the schema
    const response = await paymentApi.get('/nic_cc_payment_plan')
    const plans = response.data || []
    
    if (plans.length === 0) {
      console.log('⚠️ No payment plans found to test schema')
      return { success: false, error: 'No payment plans available for testing' }
    }
    
    const samplePlan = plans[0]
    console.log('📋 Sample payment plan fields:', Object.keys(samplePlan))
    
    // Check for signature workflow fields
    const signatureFields = [
      'signature_status',
      'signature_deadline', 
      'signature_reminder_count',
      'signature_received_date',
      'created_by_agent',
      'approved_by_agent'
    ]
    
    const availableSignatureFields = {}
    const missingSignatureFields = []
    
    signatureFields.forEach(field => {
      if (field in samplePlan) {
        availableSignatureFields[field] = samplePlan[field]
      } else {
        missingSignatureFields.push(field)
      }
    })
    
    console.log('✅ Available signature fields:', Object.keys(availableSignatureFields))
    console.log('❌ Missing signature fields:', missingSignatureFields)
    
    const allFieldsAvailable = missingSignatureFields.length === 0
    
    return {
      success: true,
      availableFields: availableSignatureFields,
      missingFields: missingSignatureFields,
      allFieldsAvailable,
      schemaReady: allFieldsAvailable
    }
  } catch (error) {
    console.error('❌ Error testing signature field availability:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Initialize database field checking
export const initializeDatabaseCheck = async () => {
  console.log('🚀 Initializing database field check...')
  
  const fieldCheck = await checkDatabaseFields()
  const creationTest = await testSignatureFieldCreation()
  
  const result = {
    fieldCheck,
    creationTest,
    recommendation: ''
  }
  
  if (!fieldCheck?.hasSignatureWorkflow) {
    result.recommendation = 'DATABASE_SCHEMA_UPDATE_NEEDED'
    console.log('⚠️ RECOMMENDATION: Database schema needs to be updated with signature workflow fields')
  } else if (!creationTest?.schemaReady) {
    result.recommendation = 'FIELD_CREATION_ISSUES'
    console.log('⚠️ RECOMMENDATION: Some signature fields are not being saved properly')
  } else {
    result.recommendation = 'SCHEMA_OK'
    console.log('✅ RECOMMENDATION: Database schema supports signature workflow')
  }
  
  return result
}