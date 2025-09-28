import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { customerService } from '../../services/customerService'
import { ArrowLeft, Phone, Mail, MessageSquare, QrCode, Send, Download } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../contexts/AuthContext'

const CustomerDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

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

  const { data: callLogs = [], isLoading: callLogsLoading } = useQuery(
    ['callLogs', id],
    () => customerService.getCallLogs(id),
    { enabled: !!id }
  )

  const updateCallLogMutation = useMutation(
    (logData) => customerService.updateCallLog(id, logData),
    {
      onSuccess: (result) => {
        console.log('Call log mutation successful:', result)
        queryClient.invalidateQueries(['customer', id])
        queryClient.invalidateQueries(['customers'])
        queryClient.invalidateQueries(['callLogs', id]) // Refresh call logs
        reset()

        // Force refetch call logs after a short delay
        setTimeout(() => {
          queryClient.refetchQueries(['callLogs', id])
        }, 500)
      },
      onError: (error) => {
        console.error('Call log mutation failed:', error)
        alert(`Failed to save call log: ${error.message}`)
      }
    }
  )

  const generateQRMutation = useMutation(
    () => customerService.generateQRCode(customer),
    {
      onSuccess: (data) => {
        if (data.success === false) {
          alert(`❌ QR Generation Failed: ${data.error}`)
        } else {
          setQrData(data)
          setShowQRModal(true)
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
      customerService.sendEmail(customer, qrCodeUrl, paymentLink),
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

  const handleSendEmail = () => {
    if (qrData && customer) {
      sendEmailMutation.mutate({
        customer,
        qrCodeUrl: qrData.qrCodeUrl,
        paymentLink: qrData.paymentLink
      })
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
          <Link
            to="/customers"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Customers
          </Link>
        </div>

        <div className="flex space-x-3">
          <a
            href={`tel:${customer.mobile}`}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Now
          </a>

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
                <p className="mt-1 text-lg font-semibold text-red-600">{formatCurrency(customer.amountDue)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`mt-1 inline-flex px-2 py-1 text-xs font-medium rounded-full ${customer.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : customer.status === 'contacted'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                  }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          </div>

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
                  <div key={log.id} className="border-l-4 border-primary-200 pl-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${log.status === 'contacted' ? 'bg-green-100 text-green-800' :
                        log.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                          (log.status === 'no_answer' || log.status === 'not_answered') ? 'bg-red-100 text-red-800' :
                            log.status === 'payment_promised' ? 'bg-blue-100 text-blue-800' :
                              log.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {log.status.replace('_', ' ')}
                      </span>
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
                  onClick={() => setShowQRModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDetail