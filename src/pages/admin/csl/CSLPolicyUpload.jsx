import { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { cslPolicyService } from '../../../services/csl/cslPolicyService'
import { emailService } from '../../../services/emailService'
import { Upload, CheckCircle, AlertCircle, Download, Loader } from 'lucide-react'
import Papa from 'papaparse'
import { getMonthEndDate, getMonthName, getYearOptions, getCurrentMonthYear } from '../../../utils/dateHelpers'

// Configuration for batch processing - OPTIMIZED
const BATCH_SIZE = 50  // Increased for better performance
const BATCH_DELAY = 100  // Reduced delay for faster uploads

const CSLPolicyUpload = () => {
  const { user } = useAuth()
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
  
  const [file, setFile] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [dataAsOfDate, setDataAsOfDate] = useState('')
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
    // Use Papa Parse for proper CSV parsing (handles commas in data, quotes, etc.)
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim()
    })
    
    return result.data
  }
  
  // Clean payload to remove null/undefined/empty values (prevents Xano errors)
  const cleanPayload = (payload) => {
    const cleaned = {}
    
    // Date fields that should always be included (even if empty)
    const dateFields = [
      'policy_start_date',
      'policy_maturity_date', 
      'policy_issued_date',
      'next_cash_back_date',
      'data_as_of_date'
    ]
    
    // Email fields that need validation
    const emailFields = ['owner1_email', 'owner2_email']
    
    // Simple email validation
    const isValidEmail = (email) => {
      if (!email) return false
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }
    
    // First, ensure all date fields are present (even if null)
    dateFields.forEach(field => {
      const value = payload[field]
      if (!value || value === 'null' || value === 'undefined' || value === '') {
        cleaned[field] = null
      } else {
        cleaned[field] = value
      }
    })
    
    // Then process all other fields
    Object.keys(payload).forEach(key => {
      // Skip date fields (already processed)
      if (dateFields.includes(key)) {
        return
      }
      
      const value = payload[key]
      
      // For email fields, only include if valid
      if (emailFields.includes(key)) {
        if (isValidEmail(value)) {
          cleaned[key] = value
        }
        // Don't include invalid or empty emails
      }
      // For other fields, only include if they have values
      else if (value !== null && value !== undefined && value !== '' && value !== 'null' && value !== 'undefined') {
        cleaned[key] = value
      }
    })
    
    return cleaned
  }

  const validatePolicy = (policy, index) => {
    const errors = []
    
    // Check policy number (handle both formats)
    const policyNumber = policy.policy_number || policy['Policy No']
    if (!policyNumber) {
      errors.push('Policy number is required')
    }
    
    // Check owner 1 name (handle both formats)
    const owner1FirstName = policy.owner1_first_name || policy['Owner 1 First Name']
    const owner1Surname = policy.owner1_surname || policy['Owner 1 Surname']
    if (!owner1FirstName || !owner1Surname) {
      errors.push('Owner 1 name is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  const mapCSVToPolicy = (csvRow, calculatedDate) => {
    // Helper to parse numbers with commas (e.g., "2,000" -> 2000)
    const parseNumber = (value) => {
      if (!value) return 0
      const cleaned = String(value).replace(/,/g, '')
      return parseFloat(cleaned) || 0
    }
    
    // Helper to convert MM/DD/YYYY to YYYY-MM-DD
    const parseDate = (dateString) => {
      if (!dateString || dateString.trim() === '') return null
      
      // Check if already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
      }
      
      // Parse MM/DD/YYYY format (American format)
      const parts = dateString.split('/')
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0')  // First part is MONTH
        const day = parts[1].padStart(2, '0')    // Second part is DAY
        const year = parts[2]
        return `${year}-${month}-${day}`  // Convert to YYYY-MM-DD
      }
      
      return null
    }
    
    return {
      policy_number: csvRow.policy_number || csvRow['Policy No'],
      policy_status: csvRow.policy_status || csvRow['Policy Status'],
      real_nx_premium: parseDate(csvRow.real_nx_premium || csvRow['RC Real Next Premium Date']),  // Convert DD/MM/YYYY to YYYY-MM-DD
      installments_in_arrears: parseInt(csvRow.installments_in_arrears || csvRow['No of Instalments in Arrears']) || 0,
      frequency: csvRow.frequency || csvRow['Frequency'],
      arrears_amount: parseNumber(csvRow.arrears_amount || csvRow['Arrears Amount']),
      computed_gross_premium: parseNumber(csvRow.computed_gross_premium || csvRow['Computed Gross Premium']),
      policy_start_date: parseDate(csvRow.policy_start_date || csvRow['Policy Start Date']),
      policy_maturity_date: parseDate(csvRow.policy_maturity_date || csvRow['Policy Maturity Date']),
      policy_issued_date: parseDate(csvRow.policy_issued_date || csvRow['Policy Issued Date']),
      next_cash_back_date: parseDate(csvRow.next_cash_back_date || csvRow['Next Cash Back Date']),
      plan_name: csvRow.plan_name || csvRow['Plan Name'],
      
      // Owner 1
      owner1_title: csvRow.owner1_title || csvRow['Owner 1 Title'],
      owner1_surname: csvRow.owner1_surname || csvRow['Owner 1 Surname'],
      owner1_first_name: csvRow.owner1_first_name || csvRow['Owner 1 First Name'],
      owner1_maiden_name: csvRow.owner1_maiden_name || csvRow['Owner 1 Maiden Name'],
      owner1_nic: csvRow.owner1_nic || csvRow['Owner 1 NIC'],
      owner1_sms_no: csvRow.owner1_sms_no || csvRow['Owner 1 SMS No'],
      owner1_mobile_no: csvRow.owner1_mobile_no || csvRow['Owner 1 Mobile No'],
      owner1_home_tel_no: csvRow.owner1_home_tel_no || csvRow['Owner 1 Home Tel No'],
      owner1_email: csvRow.owner1_email || csvRow['Owner 1 Email Address'],
      owner1_address_1: csvRow.owner1_address_1 || csvRow['Owner 1 Policy Address 1'],
      owner1_address_2: csvRow.owner1_address_2 || csvRow['Owner 1 Policy Address 2'],
      owner1_address_3: csvRow.owner1_address_3 || csvRow['Owner 1 Policy Address 3'],
      owner1_address_4: csvRow.owner1_address_4 || csvRow['Owner 1 Policy Address 4'],
      
      // Owner 2
      owner2_title: csvRow.owner2_title || csvRow['Owner 2 Title'],
      owner2_surname: csvRow.owner2_surname || csvRow['Owner 2 Surname'],
      owner2_first_name: csvRow.owner2_first_name || csvRow['Owner 2 First Name'],
      owner2_nic: csvRow.owner2_nic || csvRow['Owner 2 NIC'],
      owner2_sms_no: csvRow.owner2_sms_no || csvRow['Owner 2 SMS No'],
      owner2_mobile_no: csvRow.owner2_mobile_no || csvRow['Owner 2 Mobile No'],
      owner2_home_tel_no: csvRow.owner2_home_tel_no || csvRow['Owner 2 Home Tel No'],
      owner2_email: csvRow.owner2_email || csvRow['Owner 2 Email Address'],
      
      // Agent
      agent_surname: csvRow.agent_surname || csvRow['Agent Surname'],
      agent_first_name: csvRow.agent_first_name || csvRow['Agent First Name'],
      
      // System fields
      branch_id: 13, // Always CSL branch
      assigned_to_agent_id: null,
      data_as_of_date: calculatedDate, // Use the calculated date passed as parameter
      last_upload_id: null
    }
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const processBatch = async (batch, results, calculatedDate, policyMap) => {
    for (const { policy, index } of batch) {
      try {
        const validation = validatePolicy(policy, index)
        
        if (!validation.isValid) {
          results.skipped++
          results.errors.push({
            row: index + 2,
            policy: policy.policy_number || 'Unknown',
            reason: validation.errors.join(', ')
          })
          continue
        }

        const payload = mapCSVToPolicy(policy, calculatedDate)
        
        // Clean payload to remove null/empty values (prevents Xano errors)
        const cleanedPayload = cleanPayload(payload)
        
        // Debug: Log the first payload to see what's being sent
        if (index === 0) {
          console.log('First policy payload:', cleanedPayload)
        }
        
        // Check if policy exists in our pre-loaded map (O(1) lookup!)
        const existing = policyMap.get(cleanedPayload.policy_number)
        
        let result
        if (existing) {
          // UPDATE existing policy
          console.log(`✏️ Updating policy ${cleanedPayload.policy_number}`)
          result = await cslPolicyService.updatePolicy(existing.id, cleanedPayload)
          results.updated++
        } else {
          // INSERT new policy
          console.log(`➕ Creating policy ${cleanedPayload.policy_number}`)
          result = await cslPolicyService.createPolicy(cleanedPayload)
          results.created++
        }
        
        if (result.id) {
          results.successful++
        }
      } catch (error) {
        results.failed++
        
        // Extract detailed error message from Xano
        let errorMessage = error.message
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.data?.payload) {
          errorMessage = JSON.stringify(error.response.data.payload)
        } else if (error.response?.data) {
          errorMessage = JSON.stringify(error.response.data)
        }
        
        // Log detailed error for debugging
        console.error('Upload error for policy:', policy.policy_number || 'Unknown')
        console.error('Error details:', error.response?.data)
        
        results.errors.push({
          row: index + 2,
          policy: policy.policy_number || 'Unknown',
          reason: errorMessage
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setErrors(['Please select a file'])
      return
    }

    if (!selectedMonth || !selectedYear) {
      setErrors(['Please select data month and year'])
      return
    }

    // Calculate month-end date from selected month/year
    const calculatedDate = getMonthEndDate(selectedMonth, selectedYear)
    setDataAsOfDate(calculatedDate)

    setIsUploading(true)
    setErrors([])
    setUploadProgress(null)
    setUploadResults(null)
    
    try {
      const csvText = await file.text()
      const policies = parseCSV(csvText)
      
      if (policies.length === 0) {
        setErrors(['No valid data found in CSV file'])
        setIsUploading(false)
        return
      }

      // OPTIMIZATION: Load existing policies for this month ONCE
      setUploadProgress({
        phase: 'Loading existing policies...',
        current: 0,
        total: policies.length,
        percentage: 0
      })
      
      const existingPolicies = await cslPolicyService.getPoliciesForMonth(calculatedDate)
      
      // Create lookup map for O(1) access
      const policyMap = new Map()
      existingPolicies.forEach(p => {
        policyMap.set(p.policy_number, p)
      })
      
      console.log(`🗺️ Created lookup map with ${policyMap.size} existing policies`)
      
      const results = {
        total: policies.length,
        successful: 0,
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        startTime: Date.now()
      }
      
      // Process in batches
      const batches = []
      for (let i = 0; i < policies.length; i += BATCH_SIZE) {
        const batch = policies.slice(i, i + BATCH_SIZE).map((policy, idx) => ({
          policy,
          index: i + idx
        }))
        batches.push(batch)
      }
      
      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        setUploadProgress({
          phase: 'Uploading policies...',
          current: i * BATCH_SIZE,
          total: policies.length,
          percentage: Math.round((i / batches.length) * 100)
        })
        
        await processBatch(batches[i], results, calculatedDate, policyMap)
        
        if (i < batches.length - 1) {
          await delay(BATCH_DELAY)
        }
      }
      
      results.endTime = Date.now()
      results.duration = ((results.endTime - results.startTime) / 1000).toFixed(1)
      
      setUploadResults(results)
      setUploadProgress(null)
      
      // Send email notification to admin
      try {
        await sendUploadNotificationEmail(results, calculatedDate)
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError)
        // Don't fail the upload if email fails
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      setErrors([`Upload failed: ${error.message}`])
    } finally {
      setIsUploading(false)
    }
  }

  const sendUploadNotificationEmail = async (results, dataAsOfDate) => {
    try {
      const monthYear = `${getMonthName(selectedMonth)} ${selectedYear}`
      const successRate = ((results.successful / results.total) * 100).toFixed(1)
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">CSL Policy Upload Complete</h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Upload Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Data Month:</strong></td>
                <td style="padding: 8px 0;">${monthYear}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Date Stored As:</strong></td>
                <td style="padding: 8px 0;">${dataAsOfDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Uploaded By:</strong></td>
                <td style="padding: 8px 0;">${user.name || user.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Duration:</strong></td>
                <td style="padding: 8px 0;">${results.duration} seconds</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">Results</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Total Policies:</strong></td>
                <td style="padding: 8px 0; font-size: 18px; font-weight: bold;">${results.total}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Created (New):</strong></td>
                <td style="padding: 8px 0; color: #2563eb; font-weight: bold;">${results.created}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Updated (Corrections):</strong></td>
                <td style="padding: 8px 0; color: #059669; font-weight: bold;">${results.updated}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Skipped:</strong></td>
                <td style="padding: 8px 0; color: #d97706; font-weight: bold;">${results.skipped}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Failed:</strong></td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${results.failed}</td>
              </tr>
              <tr style="border-top: 2px solid #059669;">
                <td style="padding: 8px 0;"><strong>Success Rate:</strong></td>
                <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: bold;">${successRate}%</td>
              </tr>
            </table>
          </div>
          
          ${results.errors.length > 0 ? `
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #dc2626;">Errors (${results.errors.length})</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${results.errors.slice(0, 10).map(err => `
                  <li style="margin: 5px 0;">
                    <strong>Row ${err.row}:</strong> ${err.policy} - ${err.reason}
                  </li>
                `).join('')}
                ${results.errors.length > 10 ? `<li style="margin: 5px 0;"><em>... and ${results.errors.length - 10} more errors</em></li>` : ''}
              </ul>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from the CSL Policy Upload system.</p>
            <p>Upload completed at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
      
      await emailService.sendTransactionalEmail({
        to: {
          email: user.email,
          name: user.name || user.email
        },
        subject: `CSL Upload Complete: ${monthYear} - ${results.successful}/${results.total} Successful`,
        htmlContent
      })
      
      console.log('✅ Upload notification email sent to:', user.email)
    } catch (error) {
      console.error('Failed to send upload notification email:', error)
      throw error
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'Policy No', 'Policy Status', 'RC Real Next Premium Date', 'No of Instalments in Arrears',
      'Frequency', 'Arrears Amount', 'Computed Gross Premium',
      'Policy Start Date', 'Policy Maturity Date', 'Policy Issued Date',
      'Next Cash Back Date', 'Plan Name',
      'Owner 1 Title', 'Owner 1 Surname', 'Owner 1 First Name', 'Owner 1 Maiden Name',
      'Owner 1 NIC', 'Owner 1 SMS No', 'Owner 1 Mobile No', 'Owner 1 Home Tel No',
      'Owner 1 Email Address', 'Owner 1 Policy Address 1', 'Owner 1 Policy Address 2',
      'Owner 1 Policy Address 3', 'Owner 1 Policy Address 4',
      'Owner 2 Title', 'Owner 2 Surname', 'Owner 2 First Name', 'Owner 2 NIC',
      'Owner 2 SMS No', 'Owner 2 Mobile No', 'Owner 2 Home Tel No', 'Owner 2 Email Address',
      'Agent Surname', 'Agent First Name'
    ]
    
    const csvContent = headers.join(',')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'csl_policy_template.csv'
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
        <h1 className="text-2xl font-bold text-gray-900">Upload CSL Policies</h1>
        <p className="text-gray-600">Upload monthly CSL policy data (40+ fields)</p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Data Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Month *
            </label>
            <div className="flex gap-4">
              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select Month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              {/* Year Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                required
              >
                {getYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Preview of calculated date */}
            {selectedMonth && selectedYear && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900">
                  <strong>This data represents:</strong> {getMonthName(selectedMonth)} {selectedYear}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Will be stored as:</strong> {getMonthEndDate(selectedMonth, selectedYear)} (month-end)
                </p>
              </div>
            )}
          </div>

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
              disabled={isUploading || !file || !selectedMonth || !selectedYear}
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
                  Upload Policies
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
          <p className="mt-2 text-sm text-gray-600">
            {uploadProgress.current} / {uploadProgress.total} policies
          </p>
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{uploadResults.total}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Created</p>
              <p className="text-2xl font-bold text-blue-900">{uploadResults.created || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Updated</p>
              <p className="text-2xl font-bold text-green-900">{uploadResults.updated || 0}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Skipped</p>
              <p className="text-2xl font-bold text-yellow-900">{uploadResults.skipped}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Failed</p>
              <p className="text-2xl font-bold text-red-900">{uploadResults.failed}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Duration: {uploadResults.duration}s
          </p>

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
                        <td className="px-3 py-2 text-sm text-gray-900">{error.row}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{error.policy}</td>
                        <td className="px-3 py-2 text-sm text-red-600">{error.reason}</td>
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
        <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>CSV must contain 40+ columns for policy data</li>
          <li>Policy Number is required and must be unique</li>
          <li>Owner 1 First Name and Surname are required</li>
          <li>Existing policies will be updated (upsert logic)</li>
          <li>Download the template for correct column headers</li>
        </ul>
      </div>
    </div>
  )
}

export default CSLPolicyUpload
