import { useState, useEffect } from 'react'
import { useMutation } from 'react-query'
import { useForm } from 'react-hook-form'
import { customerService } from '../services/customerService'
import { deviceService } from '../services/deviceService'
import { QrCode, User, CreditCard, Phone, Hash, DollarSign, MessageSquare, Mail, X } from 'lucide-react'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../contexts/AuthContext'

const QuickQRGenerator = () => {
  const { user } = useAuth()
  const isSalesAgent = user?.agent_type === 'sales_agent'
  
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState(null)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [policyType, setPolicyType] = useState('new') // Default to "New Policy" for sales agents

  const { register, handleSubmit, reset, watch, clearErrors, formState: { errors } } = useForm()
  
  // Watch form fields for validation
  const watchedLOB = watch('lineOfBusiness')
  const watchedPolicyNumber = watch('policyNumber')
  
  // Dynamic behavior based on policy type selection
  const isNewPolicyMode = isSalesAgent && policyType === 'new'
  const shouldValidatePolicy = !isNewPolicyMode
  const isNIDRequired = isNewPolicyMode

  // Clear NID validation errors when switching policy types
  useEffect(() => {
    if (!isNIDRequired) {
      clearErrors('nid')
    }
  }, [isNIDRequired, clearErrors])

  const generateQRMutation = useMutation(
    (customerData) => customerService.generateQRCode(customerData, user, 'quick_qr'),
    {
      onSuccess: async (data) => {
        if (data.success === false) {
          alert(`❌ QR Generation Failed: ${data.error}`)
        } else {
          // Show QR on screen (existing functionality)
          setQrData(data)
          setShowQRModal(true)
          
          // NEW: Also try to send to ESP32 device (parallel, non-blocking)
          try {
            console.log('📱 Attempting to send QR to device...')
            console.log('QR URL:', data.qrCodeUrl)
            
            // Convert image URL to data URI (base64)
            const response = await fetch(data.qrCodeUrl)
            const blob = await response.blob()
            const reader = new FileReader()
            
            reader.onloadend = async () => {
              const dataUri = reader.result
              console.log('📱 Converted to data URI, sending to device...')
              
              const deviceResult = await deviceService.displayQR(dataUri, data.customerData)
              
              if (deviceResult.success) {
                console.log('✅ QR queued for device successfully')
                console.log('Command ID:', deviceResult.command_id)
                // Optional: Show a subtle notification
                // You could add a toast notification here if you have one
              } else {
                console.log('⚠️ Device display failed:', deviceResult.error)
              }
            }
            
            reader.readAsDataURL(blob)
          } catch (deviceError) {
            // Device error should not break the main flow
            console.error('Device service error:', deviceError)
          }
        }
      },
      onError: (error) => {
        alert(`❌ QR Generation Error: ${error.message}`)
      }
    }
  )

  const sendWhatsAppMutation = useMutation(
    ({ customer, qrCodeUrl, paymentLink }) =>
      customerService.sendWhatsApp(customer, qrCodeUrl, paymentLink),
    {
      onSuccess: (result) => {
        if (result.success) {
          alert('WhatsApp opened with customer contact and message. QR code will be shared automatically or downloaded for manual sending.')
        } else {
          alert(`Failed to share via WhatsApp: ${result.error}`)
        }
      },
      onError: (error) => {
        alert(`Error opening WhatsApp: ${error.message}`)
      }
    }
  )

  const sendEmailMutation = useMutation(
    ({ customer, qrCodeUrl, paymentLink, options }) =>
      customerService.sendEmail(customer, qrCodeUrl, paymentLink, options),
    {
      onSuccess: (result) => {
        if (result.success) {
          alert('Email sent successfully!')
        } else {
          alert(`Failed to send email: ${result.error}`)
        }
      },
      onError: (error) => {
        alert(`Error sending email: ${error.message}`)
      }
    }
  )

  // Validate policy number based on LOB
  const validatePolicyNumber = (policyNumber, lob) => {
    if (!policyNumber || !lob) return { valid: false, error: 'Policy number and LOB are required' }
    
    const slashCount = (policyNumber.match(/\//g) || []).length
    const hasHyphen = policyNumber.includes('-')
    
    if (lob === 'health') {
      // Health: Must start with MED, 4-5 slashes
      if (!policyNumber.toUpperCase().startsWith('MED')) {
        return { valid: false, error: 'Health policy must start with "MED"' }
      }
      if (slashCount < 4 || slashCount > 5) {
        return { valid: false, error: 'Health policy must have 4-5 slashes (/)' }
      }
      return { valid: true }
    }
    
    if (lob === 'motor') {
      // Motor: Must start with P, 3-5 slashes, must have hyphen
      if (!policyNumber.toUpperCase().startsWith('P')) {
        return { valid: false, error: 'Motor policy must start with "P"' }
      }
      if (slashCount < 3 || slashCount > 5) {
        return { valid: false, error: 'Motor policy must have 3-5 slashes (/)' }
      }
      if (!hasHyphen) {
        return { valid: false, error: 'Motor policy must contain a hyphen (-)' }
      }
      return { valid: true }
    }
    
    // Life: No specific validation
    return { valid: true }
  }

  // Check if form is valid for submission
  const isPolicyValid = () => {
    if (!watchedLOB || !watchedPolicyNumber) return false
    // Skip validation for new policy mode
    if (isNewPolicyMode) return true
    const validation = validatePolicyNumber(watchedPolicyNumber, watchedLOB)
    return validation.valid
  }

  const onSubmit = (data) => {
    // Validate policy number (skip for new policy mode)
    if (shouldValidatePolicy) {
      const validation = validatePolicyNumber(data.policyNumber, data.lineOfBusiness)
      if (!validation.valid) {
        alert(`❌ Invalid Policy Number: ${validation.error}`)
        return
      }
    }

    // Store form data and show confirmation dialog
    setPendingFormData(data)
    setConfirmationInput('')
    setShowConfirmDialog(true)
  }

  const handleConfirmGeneration = () => {
    if (!pendingFormData) return
    
    // Check if confirmation matches LOB
    const expectedConfirmation = pendingFormData.lineOfBusiness.toLowerCase()
    const userInput = confirmationInput.toLowerCase().trim()
    
    if (userInput !== expectedConfirmation) {
      alert(`❌ Please type "${expectedConfirmation}" to confirm`)
      return
    }

    // Proceed with QR generation
    const customerData = {
      name: pendingFormData.name,
      policyNumber: pendingFormData.policyNumber,
      mobile: pendingFormData.mobile,
      email: pendingFormData.email, // Now required, no need for fallback
      nid: pendingFormData.nid || '',
      amountDue: parseFloat(pendingFormData.amountDue),
      lineOfBusiness: pendingFormData.lineOfBusiness
    }

    setShowConfirmDialog(false)
    generateQRMutation.mutate(customerData)
  }

  const handleSendWhatsApp = () => {
    if (qrData && qrData.customerData) {
      sendWhatsAppMutation.mutate({
        customer: qrData.customerData,
        qrCodeUrl: qrData.qrCodeUrl,
        paymentLink: qrData.paymentLink
      })
    }
  }

  const handleSendEmail = () => {
    if (qrData && qrData.customerData) {
      sendEmailMutation.mutate({
        customer: qrData.customerData,
        qrCodeUrl: qrData.qrCodeUrl,
        paymentLink: qrData.paymentLink,
        // Pass context for email template selection
        options: {
          isNewPolicy: isNewPolicyMode,  // Based on policy type selection
          lineOfBusiness: qrData.customerData.lineOfBusiness,
          referenceNumber: qrData.customerData.policyNumber,
          agentEmail: user?.email || null,  // Agent's email for contact
          agentName: user?.name || null  // Agent's name
        }
      })
    }
  }

  const copyQRToClipboard = async (qrCodeUrl) => {
    try {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Clipboard API requires HTTPS')
      }

      const response = await fetch(qrCodeUrl)
      if (!response.ok) throw new Error('Failed to fetch image')

      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])

      return true
    } catch (error) {
      console.error('Copy failed:', error)
      return false
    }
  }

  const handleNewQR = () => {
    setShowQRModal(false)
    setQrData(null)
    reset()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isSalesAgent 
            ? (policyType === 'new' ? 'New Customer Payment QR' : 'Existing Customer Payment QR')
            : 'Quick QR Generator'}
        </h1>
        <p className="text-gray-600">
          {isSalesAgent 
            ? (policyType === 'new' 
                ? 'Generate payment QR codes for new customers (application form stage)' 
                : 'Generate payment QR codes for existing customers (payment reminders)')
            : 'Generate payment QR codes for any customer instantly'}
        </p>
      </div>

      {/* QR Generation Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <QrCode className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Policy Type Selector (Sales Agents Only) */}
          {isSalesAgent && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <label className="flex items-center text-sm font-medium text-red-700 mb-2">
                <CreditCard className="h-4 w-4 mr-1 text-red-600" />
                Select Policy Type *
              </label>
              <select
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500 bg-white"
              >
                <option value="new">New Policy (Application Form)</option>
                <option value="existing">Existing Policy (Payment Reminder)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Line of Business */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="h-4 w-4 mr-1" />
                Line of Business *
              </label>
              <select
                {...register('lineOfBusiness', { required: 'Line of Business is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select LOB</option>
                <option value="life">Life Insurance</option>
                <option value="health">Health Insurance</option>
                <option value="motor">Motor Insurance</option>
                <option value="nonmotor">Non Motor Insurance</option>
              </select>
              {errors.lineOfBusiness && (
                <p className="mt-1 text-sm text-red-600">{errors.lineOfBusiness.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Merchant IDs: Life=151, Health=153, Motor=155, Non Motor=171
              </p>
            </div>

            {/* Customer Name */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 mr-1" />
                Customer Name *
              </label>
              <input
                {...register('name', { required: 'Customer name is required' })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter customer full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Policy Number / Application Form Number */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="h-4 w-4 mr-1" />
                {isNewPolicyMode ? 'Application Form Number *' : 'Policy Number *'}
              </label>
              <input
                {...register('policyNumber', { 
                  required: isNewPolicyMode ? 'Application form number is required' : 'Policy number is required' 
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder={isNewPolicyMode ? 'e.g., APP-2024-001' : 'e.g., MED/2023/260/11/0028/1'}
              />
              {errors.policyNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.policyNumber.message}</p>
              )}
              {/* Real-time validation feedback (only when validation is enabled) */}
              {shouldValidatePolicy && watchedLOB && watchedPolicyNumber && (() => {
                const validation = validatePolicyNumber(watchedPolicyNumber, watchedLOB)
                if (!validation.valid) {
                  return <p className="mt-1 text-sm text-red-600">⚠️ {validation.error}</p>
                }
                return <p className="mt-1 text-sm text-green-600">✅ Policy number format is valid</p>
              })()}
              {/* Format hints based on LOB (only when validation is enabled) */}
              {shouldValidatePolicy && watchedLOB === 'health' && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: MED/YYYY/XXX/XX/XXXX (4-5 slashes)
                </p>
              )}
              {shouldValidatePolicy && watchedLOB === 'motor' && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: P/YYYY/XXX-X/XXX (3-5 slashes + hyphen required)
                </p>
              )}
              {shouldValidatePolicy && watchedLOB === 'life' && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: Flexible (any format accepted)
                </p>
              )}
              {/* New policy mode hint */}
              {isNewPolicyMode && (
                <p className="mt-1 text-xs text-gray-500">
                  Enter the application form number (any format accepted)
                </p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Phone className="h-4 w-4 mr-1" />
                Mobile Number *
              </label>
              <input
                {...register('mobile', { 
                  required: 'Mobile number is required',
                  pattern: {
                    value: /^[0-9+\-\s()]+$/,
                    message: 'Invalid mobile number format'
                  }
                })}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 5123 4567 or +230 5123 4567"
              />
              {errors.mobile && (
                <p className="mt-1 text-sm text-red-600">{errors.mobile.message}</p>
              )}
            </div>

            {/* Email (Mandatory) */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 mr-1" />
                Email Address *
              </label>
              <input
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="customer@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Required for sending payment confirmations and reminders
              </p>
            </div>

            {/* NID (Mandatory for New Policy Mode) */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Hash className="h-4 w-4 mr-1" />
                National ID {isNIDRequired && '*'}
              </label>
              <input
                {...register('nid', {
                  validate: (value) => {
                    if (isNIDRequired) {
                      if (!value || value.trim() === '') {
                        return 'National ID is required for new customers'
                      }
                      if (value.length < 10) {
                        return 'National ID must be at least 10 characters'
                      }
                    }
                    return true
                  }
                })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder={isNIDRequired ? 'e.g., A0101851234567 (required)' : 'National ID (optional)'}
              />
              {errors.nid && (
                <p className="mt-1 text-sm text-red-600">{errors.nid.message}</p>
              )}
              {isNIDRequired && (
                <p className="mt-1 text-xs text-gray-500">
                  Format: Letter + 13 digits (e.g., A0101851234567)
                </p>
              )}
            </div>

            {/* Amount Due */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="h-4 w-4 mr-1" />
                Amount Due (MUR) *
              </label>
              <input
                {...register('amountDue', { 
                  required: 'Amount is required',
                  min: {
                    value: 0.01,
                    message: 'Amount must be greater than 0'
                  }
                })}
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
              {errors.amountDue && (
                <p className="mt-1 text-sm text-red-600">{errors.amountDue.message}</p>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={generateQRMutation.isLoading || !isPolicyValid()}
              className="flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <QrCode className="h-5 w-5 mr-2" />
              {generateQRMutation.isLoading ? 'Generating...' : 'Generate Payment QR'}
            </button>
            {!isPolicyValid() && watchedLOB && watchedPolicyNumber && shouldValidatePolicy && (
              <p className="ml-4 text-sm text-red-600 self-center">
                ⚠️ Please fix policy number format
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingFormData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm QR Generation</h3>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Double Confirmation Required</strong>
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      You are about to generate a QR code for <strong>{pendingFormData.lineOfBusiness.toUpperCase()}</strong> insurance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><strong>Customer:</strong> {pendingFormData.name}</p>
                <p><strong>Policy:</strong> {pendingFormData.policyNumber}</p>
                <p><strong>Amount:</strong> MUR {parseFloat(pendingFormData.amountDue).toLocaleString()}</p>
                <p><strong>LOB:</strong> {pendingFormData.lineOfBusiness.toUpperCase()} Insurance</p>
                <p><strong>Merchant ID:</strong> {pendingFormData.lineOfBusiness === 'life' ? '151' : pendingFormData.lineOfBusiness === 'health' ? '153' : pendingFormData.lineOfBusiness === 'motor' ? '155' : pendingFormData.lineOfBusiness === 'nonmotor' ? '171' : '151'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "<strong>{pendingFormData.lineOfBusiness}</strong>" to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`Type "${pendingFormData.lineOfBusiness}" here`}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGeneration}
                disabled={confirmationInput.toLowerCase().trim() !== pendingFormData.lineOfBusiness.toLowerCase()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment QR Code</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center mb-4">
              <img
                src={qrData.qrCodeUrl}
                alt="Payment QR Code"
                className="mx-auto border rounded shadow-sm"
              />
              
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>{qrData.customerData?.name}</strong></p>
                <p>Policy: {qrData.customerData?.policyNumber}</p>
                <p>Amount: {formatCurrency(qrData.transactionAmount)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSendWhatsApp}
                disabled={sendWhatsAppMutation.isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {sendWhatsAppMutation.isLoading ? 'Sharing...' : 'Share via WhatsApp'}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={async () => {
                    const success = await copyQRToClipboard(qrData.qrCodeUrl)
                    if (success) {
                      alert('✅ QR code copied! Paste in WhatsApp (Ctrl+V or Cmd+V)')
                    } else {
                      alert('❌ Copy failed. Try the "Open" button to right-click and copy the image.')
                    }
                  }}
                  className="flex items-center justify-center px-2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                >
                  📋 Copy
                </button>

                <button
                  onClick={() => {
                    window.open(qrData.qrCodeUrl, '_blank', 'width=400,height=400,scrollbars=yes')
                  }}
                  className="flex items-center justify-center px-2 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs"
                >
                  🖼️ Open
                </button>

                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = qrData.qrCodeUrl
                    link.download = `payment-qr-${qrData.customerData?.policyNumber}.png`
                    link.click()
                  }}
                  className="flex items-center justify-center px-2 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-xs"
                >
                  💾 Save
                </button>
              </div>

              <button
                onClick={handleSendEmail}
                disabled={sendEmailMutation.isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4 mr-2" />
                {sendEmailMutation.isLoading ? 'Sending...' : 'Send via Email'}
              </button>
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleNewQR}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Generate New QR
              </button>
              <button
                onClick={async () => {
                  setShowQRModal(false)
                  // Restart device rotation after payment
                  try {
                    const deviceResult = await deviceService.paymentComplete()
                    if (deviceResult.success) {
                      console.log('✅ Device rotation restarted')
                    }
                  } catch (error) {
                    console.error('Payment complete error:', error)
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuickQRGenerator