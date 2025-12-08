import { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { cslService } from '../../../services/csl/cslService'
import { Upload, FileText, CheckCircle, AlertCircle, Download, Loader } from 'lucide-react'

const CSLPaymentUpload = () => {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState(null)
  const [errors, setErrors] = useState([])
  const [uploadProgress, setUploadProgress] = useState(null)

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
    
    const payments = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length === headers.length) {
        const payment = {}
        headers.forEach((header, index) => {
          payment[header] = values[index]
        })
        payments.push(payment)
      }
    }
    return payments
  }

  const validatePayment = (payment) => {
    const errors = []
    
    if (!payment.policy_number && !payment['Policy Number']) {
      errors.push('Policy number is required')
    }
    
    if (!payment.payment_date && !payment['Payment Date']) {
      errors.push('Payment date is required')
    }
    
    if (!payment.payment_amount && !payment['Payment Amount']) {
      errors.push('Payment amount is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  // Parse date in DD/MM/YYYY format (Mauritius standard)
  const parseDateDDMMYYYY = (dateString) => {
    if (!dateString) return null
    
    // Handle different date formats
    const str = dateString.trim()
    
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str
    }
    
    // Parse DD/MM/YYYY or D/M/YYYY format
    const parts = str.split('/')
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = parts[1].padStart(2, '0')
      const year = parts[2]
      
      // Return in YYYY-MM-DD format
      return `${year}-${month}-${day}`
    }
    
    // If can't parse, return as-is and let backend handle it
    return dateString
  }

  const mapCSVToPayment = (csvRow) => {
    const rawDate = csvRow.payment_date || csvRow['Payment Date']
    const parsedDate = parseDateDDMMYYYY(rawDate)
    
    return {
      policy_number: csvRow.policy_number || csvRow['Policy Number'],
      payment_date: parsedDate,
      payment_amount: parseFloat(csvRow.payment_amount || csvRow['Payment Amount']) || 0,
      payment_reference: csvRow.payment_reference || csvRow['Payment Reference'] || null,
      payment_method: csvRow.payment_method || csvRow['Payment Method'] || null,
      payment_status: csvRow.payment_status || csvRow['Payment Status'] || 'verified',
      additional_field_1: csvRow.additional_field_1 || csvRow['Additional Field 1'] || null,
      additional_field_2: csvRow.additional_field_2 || csvRow['Additional Field 2'] || null
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setErrors(['Please select a file'])
      return
    }

    setIsUploading(true)
    setErrors([])
    setUploadProgress(null)
    setUploadResults(null)
    
    try {
      const csvText = await file.text()
      const payments = parseCSV(csvText)
      
      if (payments.length === 0) {
        setErrors(['No valid data found in CSV file'])
        setIsUploading(false)
        return
      }
      
      // Validate all payments first
      const validPayments = []
      const validationErrors = []
      
      payments.forEach((payment, index) => {
        const validation = validatePayment(payment)
        if (validation.isValid) {
          validPayments.push(mapCSVToPayment(payment))
        } else {
          validationErrors.push({
            row: index + 2,
            policy: payment.policy_number || payment['Policy Number'] || 'Unknown',
            reason: validation.errors.join(', ')
          })
        }
      })
      
      if (validPayments.length === 0) {
        setErrors(['No valid payments found in CSV'])
        setUploadResults({
          total: payments.length,
          uploaded: 0,
          interactionsUpdated: 0,
          policiesNotFound: [],
          errors: validationErrors
        })
        setIsUploading(false)
        return
      }
      
      // Process payment upload with interaction updates
      const results = await cslService.processPaymentUpload(
        validPayments,
        user.id,
        (progress) => {
          setUploadProgress({
            phase: 'Processing payments...',
            current: progress.processed,
            total: progress.total,
            percentage: Math.round((progress.processed / progress.total) * 100),
            interactionsUpdated: progress.interactionsUpdated
          })
        }
      )
      
      // Add validation errors to results
      results.errors = [...results.errors, ...validationErrors]
      
      setUploadResults(results)
      setUploadProgress(null)
      
    } catch (error) {
      console.error('Upload failed:', error)
      setErrors([`Upload failed: ${error.message}`])
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'Policy Number',
      'Payment Date',
      'Payment Amount',
      'Payment Reference',
      'Payment Method',
      'Payment Status',
      'Additional Field 1',
      'Additional Field 2'
    ]
    
    const sampleRow = [
      'LIF/2024/12345',
      '2025-12-05',
      '5000',
      'PAY-2025-12345',
      'Bank Transfer',
      'verified',
      '',
      ''
    ]
    
    const csvContent = headers.join(',') + '\n' + sampleRow.join(',')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'csl_payment_template.csv'
    a.click()
  }

  // Check if user has admin access
  if (!user || (user.role !== 'admin' && user.role !== 'life_admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload CSL Payments</h1>
        <p className="text-gray-600">Upload payment verification data and auto-update interactions</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File *
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
            />
            {file && (
              <p className="mt-2 text-sm text-green-600 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                {file.name} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={isUploading || !file}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Payments
                </>
              )}
            </button>

            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </button>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Loader className="h-5 w-5 text-primary-600 animate-spin" />
            <span className="text-gray-900 font-medium">{uploadProgress.phase}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>{uploadProgress.current} / {uploadProgress.total} payments</span>
            <span>{uploadProgress.interactionsUpdated} interactions updated</span>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResults && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-medium text-gray-900">Upload Complete</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{uploadResults.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Uploaded</p>
              <p className="text-2xl font-bold text-green-900">{uploadResults.uploaded}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Interactions Updated</p>
              <p className="text-2xl font-bold text-blue-900">{uploadResults.interactionsUpdated}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Policies Not Found</p>
              <p className="text-2xl font-bold text-yellow-900">{uploadResults.policiesNotFound.length}</p>
            </div>
          </div>

          {uploadResults.policiesNotFound.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
              <h3 className="text-sm font-medium text-yellow-900 mb-2">Policies Not Found:</h3>
              <p className="text-sm text-yellow-800">
                {uploadResults.policiesNotFound.join(', ')}
              </p>
            </div>
          )}

          {uploadResults.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Error Details:</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Policy</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadResults.errors.map((error, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{error.row || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{error.policy_number}</td>
                        <td className="px-3 py-2 text-sm text-red-600">{error.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Payment Upload Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>CSV must contain: Policy Number, Payment Date, Payment Amount</li>
          <li>System will automatically update latest interactions with payment info</li>
          <li>Payments for policies not in system will be uploaded but not linked</li>
          <li>Payment status defaults to "verified"</li>
          <li>Download the template for correct format</li>
        </ul>
      </div>
    </div>
  )
}

export default CSLPaymentUpload
