import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { bulkAgentService } from '../../services/bulkAgentService'
import { Users, Upload, FileText, AlertCircle, CheckCircle, X, Eye } from 'lucide-react'

const BulkAgentCreation = () => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [csvFile, setCsvFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [validationResults, setValidationResults] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [creationProgress, setCreationProgress] = useState(null)
  const [creationResults, setCreationResults] = useState(null)

  // Access control - Admin and Life Admin only
  if (user?.role !== 'admin' && user?.role !== 'life_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-sm text-gray-500 mb-4">
              This feature is only available to Admin users.
            </p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      setCsvFile(file)
    }
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      ['name', 'email', 'role', 'branch_id', 'agent_type', 'sales_agent_id', 'admin_lob'],
      ['John Doe', 'john.doe@nic.mu', 'agent', '1', 'sales_agent', 'SA001', 'life'],
      ['Jane Smith', 'jane.smith@nic.mu', 'csr_agent', '2', 'csr_agent', 'CSR001', ''],
      ['Mike Johnson', 'mike.j@nic.mu', 'admin', '3', 'internal_agent', 'IA001', 'health']
    ]
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bulk_agents_template.csv'
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const validateAndPreview = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first')
      return
    }

    setIsProcessing(true)
    
    try {
      console.log('Parsing CSV file:', csvFile.name)
      
      // Parse CSV file
      const parsed = await bulkAgentService.parseCSV(csvFile)
      setParsedData(parsed)
      
      console.log('Validating records...')
      
      // Validate records
      const validation = await bulkAgentService.validateRecords(parsed.records)
      
      setValidationResults({
        totalRecords: validation.totalRecords,
        validRecords: validation.summary.valid,
        duplicateEmails: validation.summary.duplicates,
        invalidRecords: validation.summary.invalid,
        errors: validation.errors,
        validData: validation.validRecords,
        invalidData: validation.invalidRecords,
        duplicateData: validation.duplicateEmails
      })
      
      setCurrentStep(2)
      setIsProcessing(false)
      
    } catch (error) {
      console.error('Validation error:', error)
      alert(`Failed to process CSV file: ${error.message}`)
      setIsProcessing(false)
    }
  }

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Upload className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-lg font-medium text-gray-900">Step 1: Upload CSV File</h2>
      </div>

      <div className="space-y-6">
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {csvFile ? csvFile.name : 'Choose CSV file or drag and drop'}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  CSV files up to 5MB
                </span>
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => document.getElementById('csv-upload').click()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </button>
            </div>
          </div>
        </div>

        {/* CSV Format Requirements */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Required fields:</strong> name, email</li>
            <li>• <strong>Optional fields:</strong> role, branch_id, agent_type, sales_agent_id, admin_lob</li>
            <li>• <strong>Maximum:</strong> 500 records per upload</li>
            <li>• <strong>File size:</strong> Up to 5MB</li>
            <li>• <strong>Duplicates:</strong> Duplicate emails will be skipped automatically</li>
          </ul>
        </div>

        {/* Sample Template Download */}
        <div className="flex justify-between items-center">
          <button
            onClick={downloadSampleCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Sample Template
          </button>

          <button
            onClick={validateAndPreview}
            disabled={!csvFile || isProcessing}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Validating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Upload & Validate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  const startCreation = async () => {
    if (!validationResults?.validData) {
      alert('No valid data to process')
      return
    }

    setCurrentStep(4)
    setIsProcessing(true)
    setCreationProgress({ processed: 0, total: validationResults.validRecords, status: 'Starting...' })

    try {
      const results = await bulkAgentService.createAgentsInBatches(
        validationResults.validData,
        (progress) => {
          setCreationProgress(progress)
        }
      )

      setCreationResults(results)
      setIsProcessing(false)

      // Create audit log
      await bulkAgentService.createAuditLog({
        totalRecords: validationResults.totalRecords,
        created: results.created.length,
        skipped: validationResults.duplicateEmails,
        failed: results.failed.length,
        fileName: csvFile.name
      }, user)

    } catch (error) {
      console.error('Creation error:', error)
      alert(`Failed to create agents: ${error.message}`)
      setIsProcessing(false)
    }
  }

  const downloadPasswordReport = () => {
    if (!creationResults?.passwords) return

    const csvContent = bulkAgentService.generatePasswordReport(creationResults.passwords)
    const timestamp = new Date().toISOString().split('T')[0]
    bulkAgentService.downloadCSV(csvContent, `agent_passwords_${timestamp}.csv`)
  }

  const resetProcess = () => {
    setCurrentStep(1)
    setCsvFile(null)
    setParsedData(null)
    setValidationResults(null)
    setCreationProgress(null)
    setCreationResults(null)
    setIsProcessing(false)
  }

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Step 2: Validation Results</h2>
        </div>
        <button
          onClick={() => {
            setCurrentStep(1)
            setValidationResults(null)
            setCsvFile(null)
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {validationResults && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{validationResults.totalRecords}</div>
              <div className="text-sm text-blue-700">Total Records</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{validationResults.validRecords}</div>
              <div className="text-sm text-green-700">Valid Records</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{validationResults.duplicateEmails}</div>
              <div className="text-sm text-yellow-700">Duplicate Emails</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{validationResults.invalidRecords}</div>
              <div className="text-sm text-red-700">Invalid Records</div>
            </div>
          </div>

          {/* Error Details */}
          {validationResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h3>
              <div className="space-y-1">
                {validationResults.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    Row {error.row}: {error.field} - {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Upload
            </button>
            
            <div className="space-x-3">
              <button
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Preview Data
              </button>
              <button
                onClick={startCreation}
                disabled={validationResults.validRecords === 0}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users className="h-4 w-4 mr-2" />
                Create {validationResults.validRecords} Agents
              </button>
            </div>
          </div>

          {/* Warning Note */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> {validationResults.duplicateEmails} duplicate emails will be skipped. 
                  {validationResults.invalidRecords > 0 && ` ${validationResults.invalidRecords} invalid records will not be processed.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Eye className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Step 3: Preview Data</h2>
        </div>
        <button
          onClick={() => setCurrentStep(2)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {validationResults && (
        <div className="space-y-6">
          {/* Valid Records Preview */}
          {validationResults.validData.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-green-700 mb-3">
                Valid Records ({validationResults.validRecords}) - First 10 shown
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.validData.slice(0, 10).map((record, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.role || 'agent'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.agent_type || 'call_center'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.branch_id || '1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validationResults.validData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... and {validationResults.validData.length - 10} more records
                </p>
              )}
            </div>
          )}

          {/* Invalid Records Preview */}
          {validationResults.invalidData.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-red-700 mb-3">
                Invalid Records ({validationResults.invalidRecords}) - Will be skipped
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">Row</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResults.invalidData.slice(0, 5).map((record, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record._rowNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.email || '-'}</td>
                        <td className="px-6 py-4 text-sm text-red-600">
                          {record.errors?.map(e => e.message).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Validation
            </button>
            
            <button
              onClick={startCreation}
              disabled={validationResults.validRecords === 0}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="h-4 w-4 mr-2" />
              Create {validationResults.validRecords} Agents
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <Users className="h-6 w-6 text-green-600 mr-2" />
        <h2 className="text-lg font-medium text-gray-900">
          {isProcessing ? 'Creating Agents...' : 'Agent Creation Complete'}
        </h2>
      </div>

      {isProcessing && creationProgress && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                Batch {creationProgress.currentBatch} of {creationProgress.totalBatches}
              </span>
              <span className="text-sm text-blue-600">
                {creationProgress.processed}/{creationProgress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(creationProgress.processed / creationProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-700 mt-2">{creationProgress.status}</p>
          </div>
        </div>
      )}

      {!isProcessing && creationResults && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{creationResults.created.length}</div>
              <div className="text-sm text-green-700">Successfully Created</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{validationResults.duplicateEmails}</div>
              <div className="text-sm text-yellow-700">Skipped (Duplicates)</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{creationResults.failed.length}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {/* Security Report */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Security Report</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {creationResults.passwords.length} passwords generated</li>
              <li>• All accounts set to active status</li>
              <li>• Default batch size applied (0)</li>
              <li>• Passwords are 8 characters long</li>
            </ul>
          </div>

          {/* Failed Records */}
          {creationResults.failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Failed Records</h3>
              <div className="space-y-1">
                {creationResults.failed.map((failure, index) => (
                  <div key={index} className="text-sm text-red-700">
                    {failure.record.name} ({failure.record.email}): {failure.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={resetProcess}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Create More Agents
            </button>
            
            <div className="space-x-3">
              {creationResults.passwords.length > 0 && (
                <button
                  onClick={downloadPasswordReport}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Password Report
                </button>
              )}
              <button
                onClick={() => window.location.href = '/admin/agents'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                View Agent List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Agent Creation</h1>
        <p className="text-gray-600">Create multiple agent accounts via CSV upload (Admin Only)</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep >= 1 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Upload CSV</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${currentStep >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep >= 2 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Validate</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${currentStep >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${currentStep >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep >= 3 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Preview</span>
          </div>
          <div className={`flex-1 h-1 mx-4 ${currentStep >= 4 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${currentStep >= 4 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${currentStep >= 4 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
              4
            </div>
            <span className="ml-2 text-sm font-medium">Create</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  )
}

export default BulkAgentCreation