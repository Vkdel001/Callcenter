import { useState } from 'react'
import { customerApi } from '../../services/apiClient'
import { useAuth } from '../../contexts/AuthContext'
import { Upload, FileText, CheckCircle, AlertCircle, Download, Shield } from 'lucide-react'

const CustomerUpload = () => {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState(null)
  const [errors, setErrors] = useState([])
  const [testResult, setTestResult] = useState(null)

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setErrors([])
      setUploadResults(null)
    } else {
      setErrors(['Please select a valid CSV file'])
      setFile(null)
    }
  }

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    
    const customers = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length === headers.length) {
        const customer = {}
        headers.forEach((header, index) => {
          customer[header] = values[index]
        })
        customers.push(customer)
      }
    }
    return customers
  }

  const validateCustomer = (customer, index) => {
    const errors = []
    
    if (!customer.policy_number) {
      errors.push(`Row ${index + 2}: Policy number is required`)
    }
    
    if (!customer.name) {
      errors.push(`Row ${index + 2}: Name is required`)
    }
    
    if (!customer.mobile) {
      errors.push(`Row ${index + 2}: Mobile is required`)
    }
    
    if (!customer.email || !customer.email.includes('@')) {
      errors.push(`Row ${index + 2}: Valid email is required`)
    }
    
    if (!customer.amount_due || isNaN(customer.amount_due)) {
      errors.push(`Row ${index + 2}: Valid amount due is required`)
    }

    // NEW: LOB validation - admin can only upload data matching their LOB
    if (user?.admin_lob && user.admin_lob !== 'super_admin') {
      if (!customer.line_of_business) {
        errors.push(`Row ${index + 2}: Line of business is required`)
      } else if (customer.line_of_business !== user.admin_lob) {
        errors.push(`Row ${index + 2}: ${user.admin_lob.toUpperCase()} Admin cannot upload ${customer.line_of_business} data. Policy: ${customer.policy_number}`)
      }
    }

    // Validate line_of_business values
    if (customer.line_of_business && !['life', 'health', 'motor'].includes(customer.line_of_business)) {
      errors.push(`Row ${index + 2}: Line of business must be 'life', 'health', or 'motor'`)
    }

    // Validate branch_id if provided
    if (customer.branch_id && isNaN(customer.branch_id)) {
      errors.push(`Row ${index + 2}: Branch ID must be a number`)
    }
    
    return errors
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setErrors([])
    
    try {
      const csvText = await file.text()
      const customers = parseCSV(csvText)
      
      // Validate all customers
      const validationErrors = []
      customers.forEach((customer, index) => {
        const customerErrors = validateCustomer(customer, index)
        validationErrors.push(...customerErrors)
      })
      
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        setIsUploading(false)
        return
      }
      
      // Smart upsert - check existing customers first
      const results = {
        total: customers.length,
        successful: 0,
        failed: 0,
        updated: 0,
        created: 0,
        errors: []
      }
      
      // Get all existing customers to check for duplicates
      const existingCustomersResponse = await customerApi.get('/nic_cc_customer')
      const existingCustomers = existingCustomersResponse.data || []
      console.log('Found existing customers:', existingCustomers.length)
      
      const existingPolicyMap = new Map(
        existingCustomers.map(customer => [customer.policy_number, customer])
      )
      console.log('Policy map created with', existingPolicyMap.size, 'entries')
      
      for (const customer of customers) {
        try {
          const payload = {
            policy_number: customer.policy_number,
            name: customer.name,
            mobile: customer.mobile,
            email: customer.email,
            amount_due: parseFloat(customer.amount_due),
            status: customer.status || 'pending',
            last_call_date: customer.last_call_date ? customer.last_call_date : '2025-01-20',
            total_attempts: parseInt(customer.total_attempts) || 0,
            // NEW: Add all new fields
            sales_agent_id: customer.sales_agent_id || null,
            line_of_business: customer.line_of_business || (user?.admin_lob !== 'super_admin' ? user?.admin_lob : 'life'),
            assigned_month: customer.assigned_month || null,
            title_owner1: customer.title_owner1 || null,
            title_owner2: customer.title_owner2 || null,
            name_owner2: customer.name_owner2 || null,
            address: customer.address || null,
            national_id: customer.national_id || null,
            branch_id: customer.branch_id ? parseInt(customer.branch_id) : null
          }
          
          // Try to add new fields, but don't fail if they don't exist
          try {
            payload.last_updated = new Date().toISOString()
          } catch (e) {
            console.log('last_updated field not available')
          }
          
          const existingCustomer = existingPolicyMap.get(customer.policy_number)
          console.log('Checking policy:', customer.policy_number, 'Found existing:', !!existingCustomer)
          
          if (existingCustomer) {
            // UPDATE existing customer
            const updatePayload = { ...payload }
            
            // Try to add update_count if field exists
            try {
              updatePayload.update_count = (existingCustomer.update_count || 0) + 1
            } catch (e) {
              console.log('update_count field not available')
            }
            
            // Check if contact info changed - reset assignment if so
            const contactChanged = 
              existingCustomer.email !== payload.email ||
              existingCustomer.mobile !== payload.mobile
            
            if (contactChanged) {
              updatePayload.assignment_status = 'available'
              updatePayload.assigned_agent = null
            }
            
            console.log('Updating existing customer:', payload.policy_number, 'ID:', existingCustomer.id)
            const response = await customerApi.patch(`/nic_cc_customer/${existingCustomer.id}`, updatePayload)
            console.log('Update successful:', response.data)
            results.updated++
          } else {
            // CREATE new customer
            console.log('Creating new customer:', payload.policy_number)
            const response = await customerApi.post('/nic_cc_customer', payload)
            console.log('Create successful:', response.data)
            results.created++
          }
          
          results.successful++
        } catch (error) {
          console.error('Upload failed for customer:', customer.policy_number)
          console.error('Error details:', error.response?.data)
          console.error('Payload sent:', payload)
          results.failed++
          
          let errorMessage = error.message
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message
          } else if (error.response?.data) {
            errorMessage = JSON.stringify(error.response.data)
          }
          
          results.errors.push(`${customer.policy_number}: ${errorMessage}`)
        }
      }
      
      setUploadResults(results)
    } catch (error) {
      setErrors([`Failed to process CSV file: ${error.message}`])
    } finally {
      setIsUploading(false)
    }
  }

  const testConnection = async () => {
    try {
      // First, try to get existing customers to see the structure
      const response = await customerApi.get('/nic_cc_customer')
      console.log('Existing customers structure:', response.data)
      
      // Try to create a simple test customer matching Xano structure
      const testCustomer = {
        policy_number: `TEST_${Date.now()}`,
        name: 'Test Customer',
        mobile: '(123) 456-7890',
        email: 'test@example.com',
        amount_due: 1000.50,
        status: 'pending',
        last_call_date: '2025-01-20', // Use YYYY-MM-DD format
        total_attempts: 0
        // Note: id, created_at, updated_at are auto-generated by Xano
      }
      
      console.log('Testing with payload:', testCustomer)
      
      const createResponse = await customerApi.post('/nic_cc_customer', testCustomer)
      console.log('Test customer created:', createResponse.data)
      
      setTestResult({
        success: true,
        message: 'Connection successful! Check console for field structure.',
        existingCount: response.data?.length || 0
      })
      
    } catch (error) {
      console.error('Test failed:', error.response?.data)
      setTestResult({
        success: false,
        message: `Test failed: ${error.response?.data?.message || error.message}`,
        details: error.response?.data
      })
    }
  }

  const downloadTemplate = () => {
    // Get admin-specific LOB for template
    const adminLOB = user?.admin_lob === 'super_admin' ? 'life' : (user?.admin_lob || 'life')
    
    const template = `policy_number,name,mobile,email,amount_due,status,last_call_date,total_attempts,sales_agent_id,line_of_business,assigned_month,title_owner1,title_owner2,name_owner2,address,national_id,branch_id
${adminLOB.toUpperCase()}-001,John Doe,57111001,john@example.com,5000.00,pending,2025-01-20,0,SA001,${adminLOB},2024-10,Mr,,Jane Doe,123 Main Street Port Louis,ID123456789,1
${adminLOB.toUpperCase()}-002,Jane Smith,57111002,jane@example.com,3500.50,pending,2025-01-20,0,SA002,${adminLOB},2024-11,Mrs,Mr,John Smith,456 Oak Avenue Curepipe,ID789012345,2
${adminLOB.toUpperCase()}-003,Bob Johnson,57111003,bob@example.com,7500.25,pending,2025-01-20,0,,${adminLOB},2024-12,Dr,,,789 Pine Road Flacq,ID345678901,3`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${adminLOB}_customer_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Customer Data</h1>
          {user?.admin_lob && user.admin_lob !== 'super_admin' && (
            <div className="mt-2 flex items-center">
              <Shield className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-600 font-medium">
                {user.admin_lob.toUpperCase()} Admin - Can only upload {user.admin_lob} data
              </span>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={testConnection}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Test Connection
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-1" />
                {file.name}
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Validation Errors
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {testResult && (
            <div className={`border rounded-md p-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    Connection Test
                  </h3>
                  <div className={`mt-2 text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    <p>{testResult.message}</p>
                    {testResult.success && (
                      <p>Existing customers in database: {testResult.existingCount}</p>
                    )}
                    {testResult.details && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadResults && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Upload Complete
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Total: {uploadResults.total}</p>
                    <p>Successful: {uploadResults.successful}</p>
                    <p>Failed: {uploadResults.failed}</p>
                    
                    {uploadResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {uploadResults.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Customers'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements:</h3>
        <div className="text-sm text-blue-700">
          <p>Your CSV file should have these columns:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <h4 className="font-medium mb-1">Required Fields:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>policy_number</strong> - Unique policy identifier</li>
                <li><strong>name</strong> - Customer full name</li>
                <li><strong>mobile</strong> - Mobile phone number</li>
                <li><strong>email</strong> - Email address</li>
                <li><strong>amount_due</strong> - Outstanding amount (number)</li>
                <li><strong>line_of_business</strong> - life, health, or motor {user?.admin_lob !== 'super_admin' && `(must be ${user?.admin_lob})`}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Optional Fields:</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>status</strong> - pending, contacted, resolved (defaults to pending)</li>
                <li><strong>sales_agent_id</strong> - Sales agent identifier (e.g., SA001)</li>
                <li><strong>assigned_month</strong> - Format: Oct-25, Nov-25</li>
                <li><strong>title_owner1</strong> - Mr, Mrs, Ms, Dr</li>
                <li><strong>title_owner2</strong> - Second owner title</li>
                <li><strong>name_owner2</strong> - Second owner name</li>
                <li><strong>address</strong> - Full address</li>
                <li><strong>national_id</strong> - National ID number</li>
                <li><strong>branch_id</strong> - Branch number (1-6)</li>
              </ul>
            </div>
          </div>
          {user?.admin_lob && user.admin_lob !== 'super_admin' && (
            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <p className="font-medium text-yellow-800">
                ⚠️ LOB Restriction: As a {user.admin_lob.toUpperCase()} Admin, you can only upload customers with line_of_business = "{user.admin_lob}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerUpload