import { useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { customerService } from '../../services/customerService'
import { deviceService } from '../../services/deviceService'
import { ArrowLeft, Phone, Mail, MessageSquare, QrCode, Send, Download, CreditCard, FileText, Bell, RefreshCw, Edit } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../contexts/AuthContext'
import AODModal from '../../components/modals/PaymentPlanModal'
import { paymentPlanService } from '../../services/paymentPlanService'
import { installmentService } from '../../services/installmentService'
import { aodPdfService } from '../../services/aodPdfService'
import { reminderService } from '../../services/reminderService'
import { signatureReminderService } from '../../services/signatureReminderService'
import UpdateContactModal from '../../components/modals/UpdateContactModal'
import contactUpdateService from '../../services/contactUpdateService'
import MarkAODReceivedModal from '../../components/modals/MarkAODReceivedModal'
import ContactUpdateHistory from '../../components/customer/ContactUpdateHistory'

const CustomerDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [showAODModal, setShowAODModal] = useState(false)
  const [downloadingAOD, setDownloadingAOD] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [markingSignature, setMarkingSignature] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showUpdateContactModal, setShowUpdateContactModal] = useState(false)
  const [latestContactUpdate, setLatestContactUpdate] = useState(null)
  const [showMarkReceivedModal, setShowMarkReceivedModal] = useState(false)
  const [selectedAODForUpload, setSelectedAODForUpload] = useState(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [downloadingDocId, setDownloadingDocId] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // Get customer payments
  const { data: payments = [], refetch: refetchPayments } = useQuery(
    ['customerPayments', id],
    () => customerService.getCustomerPayments(id),
    { 
      enabled: !!id,
      refetchInterval: 30000 // Auto-refresh every 30 seconds
    }
  )

  // Helper function to copy QR image
  const copyQRToClipboard = async (qrCodeUrl) => {
    try {
      // Check if we're on HTTPS (required for clipboard API)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Clipboard API requires HTTPS')
      }

      // Fetch the image
      const response = await fetch(qrCodeUrl)
      if (!response.ok) throw new Error('Failed to fetch image')

      const blob = await response.blob()

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])

      return true
    } catch (error) {
      console.error('Copy failed:', error)
      return false
    }
  }

  const { data: customer, isLoading } = useQuery(
    ['customer', id],
    () => customerService.getCustomerById(id),
    { enabled: !!id }
  )

  // Check for existing AOD
  const { data: existingAOD } = useQuery(
    ['customerAOD', id],
    () => paymentPlanService.getCustomerActiveAOD(id),
    { enabled: !!id }
  )

  // Get customer's pending installments
  const { data: pendingInstallments } = useQuery(
    ['customerInstallments', existingAOD?.id],
    () => installmentService.getPaymentPlanInstallments(existingAOD.id),
    { enabled: !!existingAOD?.id }
  )

  const { data: callLogs = [], isLoading: callLogsLoading } = useQuery(
    ['callLogs', id],
    () => customerService.getCallLogs(id),
    { 
      enabled: !!id,
      staleTime: 0, // Always consider data stale to ensure fresh fetches
      cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
      refetchOnWindowFocus: true // Refetch when window regains focus
    }
  )

  // Get AOD History
  const { data: aodHistory = [], isLoading: aodHistoryLoading } = useQuery(
    ['aodHistory', id],
    () => paymentPlanService.getCustomerAODHistory(id),
    { enabled: !!id }
  )

  const updateCallLogMutation = useMutation(
    (logData) => customerService.updateCallLog(id, logData),
    {
      // Optimistic update - immediately add the call log to the UI
      onMutate: async (newCallLog) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(['callLogs', id])
        
        // Snapshot the previous value
        const previousCallLogs = queryClient.getQueryData(['callLogs', id])
        
        // Optimistically update to the new value
        const optimisticCallLog = {
          id: Date.now(), // Temporary ID
          status: newCallLog.status,
          remarks: newCallLog.remarks,
          nextFollowUp: newCallLog.nextFollowUp,
          createdAt: new Date().toISOString(),
          agentId: user?.id,
          agentName: user?.name || 'Current Agent',
          // Add a flag to identify this as optimistic
          _optimistic: true
        }
        
        queryClient.setQueryData(['callLogs', id], (old = []) => [optimisticCallLog, ...old])
        
        // Return a context object with the snapshotted value
        return { previousCallLogs }
      },
      
      onSuccess: async (result) => {
        console.log('Call log mutation successful:', result)
        
        // Reset form immediately
        reset()
        
        // Show success feedback
        const successMessage = document.createElement('div')
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50'
        successMessage.textContent = '✓ Call log saved successfully'
        document.body.appendChild(successMessage)
        
        // Remove success message after 3 seconds
        setTimeout(() => {
          if (document.body.contains(successMessage)) {
            document.body.removeChild(successMessage)
          }
        }, 3000)
        
        // Invalidate and refetch to get the real data from server
        await Promise.all([
          queryClient.invalidateQueries(['customer', id]),
          queryClient.invalidateQueries(['customers']),
          queryClient.invalidateQueries(['callLogs', id])
        ])
        
        // Force immediate refetch of call logs to replace optimistic data with real data
        await queryClient.refetchQueries(['callLogs', id])
      },
      
      onError: (error, newCallLog, context) => {
        console.error('Call log mutation failed:', error)
        
        // Rollback to the previous value
        if (context?.previousCallLogs) {
          queryClient.setQueryData(['callLogs', id], context.previousCallLogs)
        }
        
        // Show error feedback
        const errorMessage = document.createElement('div')
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50'
        errorMessage.textContent = `✗ Failed to save call log: ${error.message}`
        document.body.appendChild(errorMessage)
        
        // Remove error message after 5 seconds
        setTimeout(() => {
          if (document.body.contains(errorMessage)) {
            document.body.removeChild(errorMessage)
          }
        }, 5000)
      },
      
      // Always refetch after error or success to ensure consistency
      onSettled: () => {
        queryClient.invalidateQueries(['callLogs', id])
      }
    }
  )

  const generateQRMutation = useMutation(
    async () => {
      // Check for updated contact info
      const latestUpdate = await contactUpdateService.getLatestContact(customer.id);
      
      // Determine which values to use
      const updatedAmount = latestUpdate?.new_amount || customer.amount_due;
      const updatedEmail = latestUpdate?.new_email || customer.email;
      const updatedMobile = latestUpdate?.new_mobile || customer.mobile;
      
      // Create customer data with both snake_case and camelCase for compatibility
      const customerData = {
        ...customer,
        email: updatedEmail,
        mobile: updatedMobile,
        amount_due: updatedAmount,
        amountDue: updatedAmount,  // Add camelCase version for qrService
      };
      
      return customerService.generateQRCode(customerData);
    },
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
              
              const deviceResult = await deviceService.displayQR(dataUri, customer)
              
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
    ({ customer, qrCodeUrl, paymentLink }) =>
      customerService.sendEmail(customer, qrCodeUrl, paymentLink, {
        agentEmail: user?.email,
        agentName: user?.name
      }),
    {
      onSuccess: (result) => {
        if (result.success) {
          alert('Email sent successfully! (You have been CC\'d)')
        } else {
          alert(`Failed to send email: ${result.error}`)
        }
      },
      onError: (error) => {
        alert(`Error sending email: ${error.message}`)
      }
    }
  )

  const onSubmitCallLog = (data) => {
    console.log('Submitting call log with agent ID:', user?.id)
    updateCallLogMutation.mutate({
      ...data,
      timestamp: new Date().toISOString(),
      agentId: user?.id // Use actual logged-in agent ID
    })
  }

  const handleGenerateQR = () => {
    generateQRMutation.mutate()
  }

  const handleSendWhatsApp = () => {
    if (qrData && customer) {
      sendWhatsAppMutation.mutate({
        customer,
        qrCodeUrl: qrData.qrCodeUrl,
        paymentLink: qrData.paymentLink
      })
    }
  }

  const handleSendEmail = async () => {
    if (qrData && customer) {
      // Check for updated contact info
      const latestUpdate = await contactUpdateService.getLatestContact(customer.id);
      
      // Use updated values if available
      const updatedEmail = latestUpdate?.new_email || customer.email;
      const updatedAmount = latestUpdate?.new_amount || customer.amount_due;
      
      // Create updated customer object for email
      const customerForEmail = {
        ...customer,
        email: updatedEmail,
        amount_due: updatedAmount,
        amountDue: updatedAmount,  // Add camelCase version for email template
        policyNumber: customer.policy_number || customer.policyNumber || 'N/A',  // Handle both snake_case and camelCase
        policy_number: customer.policy_number || customer.policyNumber || 'N/A'  // Ensure both formats available
      };
      
      sendEmailMutation.mutate({
        customer: customerForEmail,
        qrCodeUrl: qrData.qrCodeUrl,
        paymentLink: qrData.paymentLink
      })
    }
  }

  const handleRefreshBalance = async () => {
    setRefreshing(true)
    try {
      // Refetch customer data
      await queryClient.invalidateQueries(['customer', id])
      // Refetch payments
      await refetchPayments()
      // Show success message
      alert('Balance refreshed successfully!')
    } catch (error) {
      console.error('Failed to refresh balance:', error)
      alert('Failed to refresh balance')
    } finally {
      setRefreshing(false)
    }
  }

  const handleDownloadExistingAOD = async () => {
    if (!existingAOD || !customer) return

    setDownloadingAOD(true)
    try {
      // Get installments if it's an installment payment
      let installments = []
      if (existingAOD.payment_method === 'installments') {
        installments = await installmentService.getPaymentPlanInstallments(existingAOD.id)
      }

      // Generate and download PDF
      await aodPdfService.downloadPdf(existingAOD, customer, installments)
      alert('AOD PDF downloaded successfully!')
    } catch (error) {
      console.error('Failed to download AOD PDF:', error)
      alert(`Failed to download AOD PDF: ${error.message}`)
    } finally {
      setDownloadingAOD(false)
    }
  }

  const handleMarkSignatureReceived = () => {
    if (!existingAOD) return
    
    // Open the upload modal instead of directly marking as received
    setSelectedAODForUpload(existingAOD)
    setShowMarkReceivedModal(true)
  }

  const handleSendReminder = async () => {
    if (!pendingInstallments || pendingInstallments.length === 0) {
      alert('No pending installments found for this customer')
      return
    }

    // Find the next due installment (prioritize by installment number, then by due date)
    const nextInstallment = pendingInstallments
      .filter(i => i.status === 'pending')
      .sort((a, b) => {
        // First sort by installment number (ascending)
        const installmentDiff = (a.installment_number || 0) - (b.installment_number || 0)
        if (installmentDiff !== 0) return installmentDiff
        
        // If installment numbers are the same, sort by due date
        return new Date(a.due_date) - new Date(b.due_date)
      })[0]

    if (!nextInstallment) {
      alert('No pending installments found')
      return
    }

    setSendingReminder(true)
    try {
      const result = await reminderService.sendInstallmentReminder(nextInstallment.id)
      
      if (result.success) {
        const emailSuccess = result.reminderResult.results.email.success
        const smsSuccess = result.reminderResult.results.sms.success
        
        let message = 'Reminder sent successfully!\n'
        if (emailSuccess) message += '✓ Email sent\n'
        if (smsSuccess) message += '✓ SMS sent\n'
        if (!emailSuccess && !smsSuccess) message = 'Failed to send reminder'
        
        alert(message)
      } else {
        alert('Failed to send reminder')
      }
    } catch (error) {
      console.error('Failed to send reminder:', error)
      alert(`Failed to send reminder: ${error.message}`)
    } finally {
      setSendingReminder(false)
    }
  }

  // AOD History handlers
  const handleDownloadAODFromHistory = async (aod) => {
    try {
      // Get installments if it's an installment payment
      let installments = []
      if (aod.payment_method === 'installments') {
        installments = await installmentService.getPaymentPlanInstallments(aod.id)
      }

      // Generate and download PDF
      await aodPdfService.downloadPdf(aod, customer, installments)
      alert('AOD PDF downloaded successfully!')
    } catch (error) {
      console.error('Failed to download AOD PDF:', error)
      alert(`Failed to download AOD PDF: ${error.message}`)
    }
  }

  const handleCancelAOD = async (aod) => {
    const confirmed = confirm(
      `Are you sure you want to cancel AOD #${aod.id}?\n\n` +
      `Amount: MUR ${aod.outstanding_amount?.toLocaleString()}\n` +
      `This will cancel all pending installments.\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      await paymentPlanService.cancelPaymentPlan(aod.id)
      alert('AOD cancelled successfully!')
      // Refresh data
      queryClient.invalidateQueries(['aodHistory', id])
      queryClient.invalidateQueries(['customerAOD', id])
    } catch (error) {
      console.error('Failed to cancel AOD:', error)
      alert(`Failed to cancel AOD: ${error.message}`)
    }
  }

  const handleMarkAsReceived = (aod) => {
    setSelectedAODForUpload(aod)
    setShowMarkReceivedModal(true)
  }

  const handleUploadSignedDocument = async ({ file, notes }) => {
    if (!selectedAODForUpload) return

    setUploadingDocument(true)
    try {
      // Step 1: Upload the signed document
      await paymentPlanService.markAODAsReceived(
        selectedAODForUpload.id,
        file,
        parseInt(user?.id) || 0,
        notes
      )

      // Step 2: Activate the signature workflow (recalculate dates, activate reminders)
      const result = await signatureReminderService.markSignatureReceived(
        selectedAODForUpload.id,
        user.id
      )

      if (result.success) {
        alert('✅ Signed document uploaded successfully!\n\n' +
              'Signature status updated to "received".\n' +
              'Payment plan activated.\n' +
              'Payment reminders will now be sent.')
      } else {
        alert('⚠️ Document uploaded but reminder activation failed.\n\n' +
              'Please contact support.')
      }
      
      // Refresh all data
      queryClient.invalidateQueries(['customer', id])
      queryClient.invalidateQueries(['customerAOD', id])
      queryClient.invalidateQueries(['aodHistory', id])
      queryClient.invalidateQueries(['customerInstallments'])
      
      // Close modal
      setShowMarkReceivedModal(false)
      setSelectedAODForUpload(null)
    } catch (error) {
      console.error('Failed to upload signed document:', error)
      alert(`❌ Failed to upload document: ${error.message}`)
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleViewInstallments = async (aod) => {
    if (aod.payment_method !== 'installments') {
      alert('This AOD does not have installments.')
      return
    }

    try {
      const installments = await installmentService.getPaymentPlanInstallments(aod.id)
      
      if (installments.length === 0) {
        alert('No installments found for this AOD.')
        return
      }

      // Create a summary message
      const summary = installments.map((inst, idx) => 
        `${idx + 1}. Due: ${new Date(inst.due_date).toLocaleDateString()} - MUR ${inst.amount.toLocaleString()} - ${inst.status}`
      ).join('\n')

      alert(`Installments for AOD #${aod.id}:\n\n${summary}`)
    } catch (error) {
      console.error('Failed to fetch installments:', error)
      alert(`Failed to fetch installments: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found.</p>
        <Link to="/customers" className="text-primary-600 hover:text-primary-800">
          Back to Customer List
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              // Check for LOB-specific navigation parameters first
              const returnLob = searchParams.get('returnLob')
              const returnMonth = searchParams.get('returnMonth')
              const returnRoute = searchParams.get('returnRoute')
              const returnPage = searchParams.get('returnPage')
              const returnPosition = searchParams.get('returnPosition')
              const returnSearch = searchParams.get('returnSearch')
              const returnSort = searchParams.get('returnSort')
              
              if (returnLob && returnMonth && returnRoute) {
                // LOB-aware navigation - return to LOB dashboard with position highlighting
                const lobParams = new URLSearchParams()
                if (returnPage && returnPage !== '1') lobParams.set('page', returnPage)
                if (returnSearch) lobParams.set('search', returnSearch)
                if (returnSort && returnSort !== 'amount_desc') lobParams.set('sort', returnSort)
                if (returnPosition) lobParams.set('highlightPosition', returnPosition)
                
                const lobUrl = lobParams.toString() ? `${returnRoute}?${lobParams.toString()}` : returnRoute
                navigate(lobUrl)
              } else {
                // Fallback to generic customer list navigation (existing behavior)
                const returnPage = searchParams.get('returnPage')
                const returnSearch = searchParams.get('returnSearch')
                const returnStatus = searchParams.get('returnStatus')
                const customerId = searchParams.get('customerId')
                
                const params = new URLSearchParams()
                if (returnPage && returnPage !== '1') params.set('page', returnPage)
                if (returnSearch) params.set('search', returnSearch)
                if (returnStatus && returnStatus !== 'all') params.set('status', returnStatus)
                if (customerId) params.set('customerId', customerId)
                
                const returnUrl = params.toString() ? `/customers?${params.toString()}` : '/customers'
                navigate(returnUrl)
              }
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            {(() => {
              const returnLob = searchParams.get('returnLob')
              const returnMonth = searchParams.get('returnMonth')
              if (returnLob && returnMonth) {
                return `Back to ${returnLob.charAt(0).toUpperCase() + returnLob.slice(1)} Insurance`
              }
              return 'Back to Customers'
            })()}
          </button>
        </div>

        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-3">
          {existingAOD ? (
            <>
              <button
                onClick={handleDownloadExistingAOD}
                disabled={downloadingAOD}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                {downloadingAOD ? 'Downloading...' : 'Download AOD PDF'}
              </button>
              
              {existingAOD.payment_method === 'installments' && 
               existingAOD.signature_status === 'received' && 
               pendingInstallments?.some(i => i.status === 'pending') && (
                <button
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {sendingReminder ? 'Sending...' : 'Send Reminder'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowAODModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Create AOD
            </button>
          )}
          
          <button
            onClick={() => setShowUpdateContactModal(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Update Contact
          </button>
          
          <button
            onClick={handleGenerateQR}
            disabled={generateQRMutation.isLoading}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            <QrCode className="h-4 w-4 mr-2" />
            {generateQRMutation.isLoading ? 'Generating...' : 'Generate QR'}
          </button>
        </div>
      </div>
      
      {/* Update Contact Modal */}
      <UpdateContactModal
        isOpen={showUpdateContactModal}
        onClose={() => setShowUpdateContactModal(false)}
        customer={customer}
        onSuccess={(updateData) => {
          // Store latest update for use in QR generation
          setLatestContactUpdate(updateData);
          // Refresh customer data
          queryClient.invalidateQueries(['customer', id]);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{customer.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Policy Number</label>
                <p className="mt-1 text-sm text-gray-900">{customer.policyNumber}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile</label>
                <p className="mt-1 text-sm text-gray-900">{customer.mobile}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount Due</label>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(customer.amountDue)}</p>
                  <button
                    onClick={handleRefreshBalance}
                    disabled={refreshing}
                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    title="Refresh balance"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Premium</label>
                <p className="mt-1 text-sm font-semibold text-blue-600">
                  {customer.monthly_premium ? formatCurrency(customer.monthly_premium) : 'Not specified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${customer.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : customer.status === 'contacted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                    }`}>
                    {customer.status}
                  </span>
                  {existingAOD && (
                    <>
                      {existingAOD.signature_status === 'pending_signature' ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          AOD Pending Signature
                        </span>
                      ) : existingAOD.signature_status === 'expired' ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          AOD Expired
                        </span>
                      ) : existingAOD.signature_status === 'received' ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          AOD Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          AOD Legacy
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {customer.national_id_owner2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Second Owner NID</label>
                  <p className="mt-1 text-sm text-gray-900">{customer.national_id_owner2}</p>
                </div>
              )}
            </div>
          </div>

          {/* AOD Details */}
          {existingAOD && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">AOD Agreement Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">AOD ID</label>
                  <p className="mt-1 text-sm text-gray-900">{existingAOD.id}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{existingAOD.payment_method?.replace('_', ' ')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">AOD Amount</label>
                  <p className="mt-1 text-sm font-semibold text-gray-900">MUR {existingAOD.outstanding_amount?.toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Agreement Date</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(existingAOD.agreement_date).toLocaleDateString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Signature Status</label>
                  <div className="mt-1">
                    {(() => {
                      // Proper signature status based on database fields
                      if (existingAOD.signature_status === 'pending_signature') {
                        const deadline = new Date(existingAOD.signature_deadline)
                        const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
                        
                        return (
                          <div className="space-y-2">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              Waiting for Customer Signature
                            </span>
                            <div className="text-xs text-gray-500">
                              {daysLeft > 0 ? `${daysLeft} days remaining` : 'Overdue'}
                            </div>
                          </div>
                        )
                      } else if (existingAOD.signature_status === 'expired') {
                        return (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Expired - No Signature Received
                          </span>
                        )
                      } else if (existingAOD.signature_status === 'received') {
                        return (
                          <div className="space-y-1">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Signed & Active
                            </span>
                            {existingAOD.signature_received_date && (
                              <div className="text-xs text-gray-500">
                                Received: {new Date(existingAOD.signature_received_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )
                      } else {
                        // Handle legacy AODs (no signature_status field)
                        return (
                          <div className="space-y-1">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Legacy AOD (Pre-Signature Workflow)
                            </span>
                            <div className="text-xs text-gray-500">
                              Created before signature requirement
                            </div>
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>

                {existingAOD.payment_method === 'installments' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Schedule</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {existingAOD.total_installments} installments of MUR {existingAOD.installment_amount?.toLocaleString()}
                      {existingAOD.start_date && (
                        <div className="text-xs text-gray-500">
                          Starting: {new Date(existingAOD.start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Signature Action Buttons */}
              {existingAOD.signature_status === 'pending_signature' && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Customer Signature Required</h4>
                      <p className="text-sm text-gray-600">
                        Click the button below when you receive the signed AOD document from the customer.
                      </p>
                    </div>
                    <button
                      onClick={handleMarkSignatureReceived}
                      disabled={markingSignature}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {markingSignature ? 'Processing...' : 'AOD Signed Copy Received'}
                    </button>
                  </div>
                </div>
              )}

              {/* Legacy AOD Conversion */}
              {!existingAOD.signature_status && !existingAOD.signature_deadline && user?.role === 'admin' && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Legacy AOD Detected</h4>
                      <p className="text-sm text-gray-600">
                        This AOD was created before the signature workflow. You can mark it as already signed to enable reminders.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Mark this legacy AOD as already signed and activate reminders?')) {
                          handleMarkSignatureReceived()
                        }
                      }}
                      disabled={markingSignature}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {markingSignature ? 'Processing...' : 'Mark as Signed (Legacy)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Call Log Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add Call Log</h2>

            <form onSubmit={handleSubmit(onSubmitCallLog)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Call Status</label>
                <select
                  {...register('status', { required: 'Status is required' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select status</option>
                  <option value="contacted">Contacted</option>
                  <option value="busy">Customer Busy</option>
                  <option value="not_answered">No Answer</option>
                  <option value="wrong_number">Wrong Number</option>
                  <option value="payment_promised">Payment Promised</option>
                  <option value="resolved">Resolved</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  {...register('remarks', { required: 'Remarks are required' })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter call details and customer response..."
                />
                {errors.remarks && (
                  <p className="mt-1 text-sm text-red-600">{errors.remarks.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Next Follow-up Date</label>
                <input
                  {...register('nextFollowUp')}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={updateCallLogMutation.isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {updateCallLogMutation.isLoading ? 'Saving...' : 'Save Call Log'}
              </button>


            </form>
          </div>
        </div>

        {/* Call History Sidebar */}
        <div className="space-y-6">
          {/* Payment History Widget */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Payments</h3>
              {payments.length > 0 && (
                <span className="text-sm text-gray-500">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {payments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {payments.map((payment) => (
                  <div key={payment.id} className="border-l-4 border-green-200 pl-3 py-2 bg-green-50 rounded-r">
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        ✓ {payment.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(payment.paymentDate).toLocaleDateString()} {new Date(payment.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">
                        Amount: {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Old Balance: {formatCurrency(payment.oldBalance)}
                      </p>
                      <p className="text-xs text-gray-600">
                        New Balance: {formatCurrency(payment.newBalance)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ref: {payment.transactionReference}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No payments recorded yet
              </div>
            )}
          </div>

          {/* Call History */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Call History</h3>
              {callLogs.length > 0 && (
                <span className="text-sm text-gray-500">
                  {callLogs.length} call{callLogs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {callLogsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading call history...</p>
              </div>
            ) : callLogs.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {callLogs.map((log) => (
                  <div key={log.id} className={`border-l-4 pl-3 py-2 ${log._optimistic ? 'border-blue-300 bg-blue-50 opacity-75' : 'border-primary-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${log.status === 'contacted' ? 'bg-green-100 text-green-800' :
                          log.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                            (log.status === 'no_answer' || log.status === 'not_answered') ? 'bg-red-100 text-red-800' :
                              log.status === 'payment_promised' ? 'bg-blue-100 text-blue-800' :
                                log.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                          }`}>
                          {log.status.replace('_', ' ')}
                        </span>
                        {log._optimistic && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600">
                            Saving...
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-2">
                      {log.remarks}
                    </p>

                    {log.nextFollowUp && (
                      <p className="text-xs text-blue-600">
                        📅 Follow-up: {new Date(log.nextFollowUp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No call history available
              </div>
            )}
          </div>

          {/* Contact Update History */}
          <ContactUpdateHistory customerId={id} />

          {/* AOD History */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">AOD History</h3>
              {aodHistory.length > 0 && (
                <span className="text-sm text-gray-500">
                  {aodHistory.length} agreement{aodHistory.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {aodHistoryLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading AOD history...</p>
              </div>
            ) : aodHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {aodHistory.map((aod) => (
                  <div key={aod.id} className="border-l-4 border-red-200 pl-3 py-2 bg-red-50 rounded-r">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        AOD #{aod.id} - MUR {aod.outstanding_amount?.toLocaleString()}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        aod.status === 'active' ? 'bg-green-100 text-green-800' :
                        aod.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        aod.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {aod.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 mb-2">
                      <p>📅 Created: {new Date(aod.agreement_date || aod.created_at).toLocaleDateString()} {new Date(aod.agreement_date || aod.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p>👤 By: {aod.agentName}</p>
                      <p>💳 Method: {aod.payment_method?.replace('_', ' ')}</p>
                      {aod.signature_status && (
                        <p>✍️ Signature: {aod.signature_status.replace('_', ' ')}</p>
                      )}
                      {aod.signed_document && (
                        <p className="text-green-700 font-medium">
                          📎 Signed copy: 
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const url = typeof aod.signed_document === 'string' 
                                ? aod.signed_document 
                                : aod.signed_document.url;
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-blue-600 hover:text-blue-700 ml-1 underline cursor-pointer bg-transparent border-none text-xs"
                          >
                            View
                          </button>
                          <span className="text-gray-400 mx-1">|</span>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              const url = typeof aod.signed_document === 'string' 
                                ? aod.signed_document 
                                : aod.signed_document.url;
                              
                              setDownloadingDocId(aod.id);
                              try {
                                // Fetch the file as blob
                                const response = await fetch(url);
                                if (!response.ok) throw new Error('Download failed');
                                
                                const blob = await response.blob();
                                
                                // Create download link
                                const downloadUrl = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `AOD_${aod.id}_signed.pdf`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                // Clean up
                                setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
                              } catch (error) {
                                console.error('Download failed:', error);
                                alert('Download failed. Opening in new tab instead.');
                                // Fallback: open in new tab
                                window.open(url, '_blank');
                              } finally {
                                setDownloadingDocId(null);
                              }
                            }}
                            disabled={downloadingDocId === aod.id}
                            className="text-blue-600 hover:text-blue-700 underline cursor-pointer bg-transparent border-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {downloadingDocId === aod.id ? 'Downloading...' : 'Download'}
                          </button>
                          {(aod.signed_document_uploaded_at || aod.signature_received_date) && (
                            <span className="text-gray-500 ml-1 text-xs">
                              (Uploaded {new Date(aod.signed_document_uploaded_at || aod.signature_received_date).toLocaleDateString()})
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => handleDownloadAODFromHistory(aod)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        📄 PDF
                      </button>
                      {aod.payment_method === 'installments' && (
                        <button
                          onClick={() => handleViewInstallments(aod)}
                          className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          📊 Installments
                        </button>
                      )}
                      {aod.signature_status === 'pending_signature' && aod.status === 'active' && (
                        <button
                          onClick={() => handleMarkAsReceived(aod)}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          ✅ Mark Received
                        </button>
                      )}
                      {aod.status === 'active' && (
                        <button
                          onClick={() => handleCancelAOD(aod)}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          ❌ Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No AOD history available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment QR Code</h3>

              <div className="mb-4">
                <img
                  src={qrData.qrCodeUrl}
                  alt="Payment QR Code"
                  className="mx-auto border rounded shadow-sm"
                />

                {qrData.testMode && (
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    🧪 Test Mode QR Code (CORS fallback)
                  </p>
                )}

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

                <div className="grid grid-cols-3 gap-2 mt-3">
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
                      link.download = `payment-qr-${customer.policyNumber}.png`
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

              <div className="mt-4">
                <button
                  onClick={async () => {
                    setShowQRModal(false);
                    // Restart rotation on ESP32 device
                    try {
                      await deviceService.paymentComplete();
                      console.log('✓ Rotation restart requested');
                    } catch (error) {
                      console.error('Rotation restart error:', error);
                    }
                    // Restart device rotation after payment
                    if (await deviceService.isAvailable()) {
                      await deviceService.paymentComplete();
                      console.log('✅ Device rotation restarted');
                    }
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AOD Modal */}
      <AODModal
        isOpen={showAODModal}
        onClose={() => setShowAODModal(false)}
        customer={customer}
      />

      {/* Mark AOD as Received Modal */}
      <MarkAODReceivedModal
        isOpen={showMarkReceivedModal}
        onClose={() => {
          setShowMarkReceivedModal(false)
          setSelectedAODForUpload(null)
        }}
        aod={selectedAODForUpload}
        onSubmit={handleUploadSignedDocument}
        isLoading={uploadingDocument}
      />
    </div>
  )
}

export default CustomerDetail