import { useState } from 'react'
import { useMutation } from 'react-query'
import { useForm } from 'react-hook-form'
import { customerService } from '../services/customerService'
import { QrCode, User, CreditCard, Phone, Hash, DollarSign, MessageSquare, Mail, X } from 'lucide-react'
import { formatCurrency } from '../utils/currency'

const QuickQRGenerator = () => {
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const generateQRMutation = useMutation(
    (customerData) => customerService.generateQRCode(customerData),
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

  const onSubmit = (data) => {
    const customerData = {
      name: data.name,
      policyNumber: data.policyNumber,
      mobile: data.mobile,
      email: data.email || '',
      nid: data.nid || '',
      amountDue: parseFloat(data.amountDue)
    }

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
        paymentLink: qrData.paymentLink
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
        <h1 className="text-2xl font-bold text-gray-900">Quick QR Generator</h1>
        <p className="text-gray-600">Generate payment QR codes for any customer instantly</p>
      </div>

      {/* QR Generation Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <QrCode className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Policy Number */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <CreditCard className="h-4 w-4 mr-1" />
                Policy Number *
              </label>
              <input
                {...register('policyNumber', { required: 'Policy number is required' })}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., MED/2023/260/11/0028/1"
              />
              {errors.policyNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.policyNumber.message}</p>
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

            {/* Email (Optional) */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 mr-1" />
                Email Address
              </label>
              <input
                {...register('email', {
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="customer@email.com (optional)"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* NID (Optional) */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Hash className="h-4 w-4 mr-1" />
                National ID
              </label>
              <input
                {...register('nid')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="National ID (optional)"
              />
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
              disabled={generateQRMutation.isLoading}
              className="flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <QrCode className="h-5 w-5 mr-2" />
              {generateQRMutation.isLoading ? 'Generating...' : 'Generate Payment QR'}
            </button>
          </div>
        </form>
      </div>

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

              {qrData.customerData?.email && (
                <button
                  onClick={handleSendEmail}
                  disabled={sendEmailMutation.isLoading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendEmailMutation.isLoading ? 'Sending...' : 'Send via Email'}
                </button>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleNewQR}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Generate New QR
              </button>
              <button
                onClick={() => setShowQRModal(false)}
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