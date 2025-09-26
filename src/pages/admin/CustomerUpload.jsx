import { useState } from 'react'
import { customerApi } from '../../services/apiClient'
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'

const CustomerUpload = () => {
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
      
      // Upload customers one by one
      const results = {
        total: customers.length,
        successful: 0,
        failed: 0,
        errors: []
      }
      
      for (const customer of customers) {
        try {
          const payload = {
            policy_number: customer.policy_number,
            name: customer.name,
            mobile: customer.mobile,
            email: customer.email,
            amount_due: parseFloat(customer.amount_due),
            status: customer.status || 'pending',
            last_call_date: customer.last_call_date ? customer.last_call_date : '2025-01-20', // Default date if empty
            total_attempts: parseInt(customer.total_attempts) || 0
            // Don't send id, created_at, updated_at - Xano handles these
          }
          
          console.log('Uploading customer:', payload)
          
          const response = await customerApi.post('/nic_cc_customer', payload)
          console.log('Upload successful:', response.data)
          results.successful++
        } catch (error) {
          console.error('Upload failed for customer:', customer.policy_number, error.response?.data)
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
    const template = `policy_number,name,mobile,email,amount_due,status,last_call_date,total_attempts
MED/2023/220/11/0025/1,John Doe,(123) 456-7890,john@example.com,5000.00,pending,2025-01-20,0
MED/2023/220/11/0040/1,Jane Smith,(456) 789-0123,jane@example.com,3500.50,pending,2025-01-20,0
MED/2023/220/12/0041/1,Bob Johnson,(789) 012-3456,bob@example.com,7500.25,pending,2025-01-20,0`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customer_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Upload Customer Data</h1>
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
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>policy_number</strong> - Unique policy identifier</li>
            <li><strong>name</strong> - Customer full name</li>
            <li><strong>mobile</strong> - Mobile phone number</li>
            <li><strong>email</strong> - Email address</li>
            <li><strong>amount_due</strong> - Outstanding amount (number)</li>
            <li><strong>status</strong> - pending, contacted, resolved (optional, defaults to pending)</li>
            <li><strong>last_call_date</strong> - Date of last call (YYYY-MM-DD format, defaults to today)</li>
            <li><strong>total_attempts</strong> - Number of call attempts (optional, defaults to 0)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CustomerUpload