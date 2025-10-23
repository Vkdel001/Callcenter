import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { installmentService } from '../services/installmentService'
import { paymentPlanService } from '../services/paymentPlanService'
import { customerService } from '../services/customerService'
import { Calendar, DollarSign, CreditCard, Phone, Mail, CheckCircle, AlertCircle } from 'lucide-react'

const InstallmentReminder = () => {
  const { installmentId } = useParams()
  const [qrCodeLoaded, setQrCodeLoaded] = useState(false)

  // Fetch installment details
  const { data: installment, isLoading: installmentLoading, error: installmentError } = useQuery(
    ['installment', installmentId],
    () => installmentService.getInstallment(installmentId),
    { enabled: !!installmentId }
  )

  // Get payment plan ID from installment (use correct field name)
  const paymentPlanId = installment?.payment_plan
  
  console.log('Found payment plan ID:', paymentPlanId, 'Type:', typeof paymentPlanId)

  // Fetch payment plan details
  const { data: paymentPlan, isLoading: planLoading, error: planError } = useQuery(
    ['paymentPlan', paymentPlanId],
    async () => {
      console.log('Fetching payment plan with ID:', paymentPlanId)
      const result = await paymentPlanService.getPaymentPlan(paymentPlanId)
      console.log('Payment plan result:', result)
      return result
    },
    { 
      enabled: !!paymentPlanId,
      retry: 1
    }
  )

  // Fetch customer details
  const { data: customer, isLoading: customerLoading, error: customerError } = useQuery(
    ['customer', paymentPlan?.customer],
    async () => {
      console.log('Fetching customer with ID:', paymentPlan.customer)
      const result = await customerService.getCustomerById(paymentPlan.customer)
      console.log('Customer result:', result)
      return result
    },
    { 
      enabled: !!paymentPlan?.customer,
      retry: 1
    }
  )

  const isLoading = installmentLoading || planLoading || customerLoading

  // Debug logging
  console.log('=== REMINDER DEBUG ===')
  console.log('Installment ID from URL:', installmentId)
  console.log('Installment data:', installment)
  console.log('Installment keys:', installment ? Object.keys(installment) : 'no installment')
  console.log('Full installment object:', JSON.stringify(installment, null, 2))
  console.log('Payment plan ID from installment:', installment?.payment_plan_id)
  console.log('Trying other field names:')
  console.log('  - paymentPlanId:', installment?.paymentPlanId)
  console.log('  - payment_plan:', installment?.payment_plan)
  console.log('  - planId:', installment?.planId)
  console.log('Payment plan data:', paymentPlan)
  console.log('Customer ID from plan:', paymentPlan?.customer)
  console.log('Customer data:', customer)
  console.log('Loading states:', { installmentLoading, planLoading, customerLoading })
  console.log('Errors:', { installmentError, planError, customerError })
  console.log('=== END DEBUG ===')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (installmentError || !installment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Link Not Found</h1>
          <p className="text-gray-600 mb-4">
            This payment link may have expired or is invalid. Please contact NIC Life Insurance for assistance.
          </p>
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Need Help?</strong><br />
              Call: +230 123 4567<br />
              Email: support@nicl.mu
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isOverdue = new Date(installment.due_date) < new Date()
  const isPaid = installment.status === 'paid'
  const daysUntilDue = Math.ceil((new Date(installment.due_date) - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white p-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold">NIC Life Insurance</h1>
          <p className="text-blue-200 text-sm">Payment Reminder</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4 min-w-0">
        {/* Status Banner */}
        {isPaid ? (
          <div className="bg-green-100 border border-green-300 rounded-lg p-4 flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-800">Payment Completed</p>
              <p className="text-sm text-green-600">This installment has been paid</p>
            </div>
          </div>
        ) : isOverdue ? (
          <div className="bg-red-100 border border-red-300 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <p className="font-medium text-red-800">Payment Overdue</p>
              <p className="text-sm text-red-600">This payment is {Math.abs(daysUntilDue)} days overdue</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 flex items-center">
            <Calendar className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-800">Payment Due Soon</p>
              <p className="text-sm text-yellow-600">
                {daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : 'Due today'}
              </p>
            </div>
          </div>
        )}

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Payment Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium text-right ml-2">
                {customer?.name || 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Policy Number:</span>
              <span className="font-medium text-right ml-2 break-all">
                {paymentPlan?.policy_number || 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Installment:</span>
              <span className="font-medium text-right ml-2 whitespace-nowrap">
                {installment.installment_number} of {paymentPlan?.total_installments || '...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium text-right ml-2">
                {new Date(installment.due_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-3 border-t">
              <span className="text-gray-600 mb-1 sm:mb-0">Amount Due:</span>
              <span className="text-2xl font-bold text-blue-600">
                MUR {installment.amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        {!isPaid && installment.qr_code_url && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-900 mb-3 text-center">
              <CreditCard className="h-5 w-5 inline mr-2" />
              Pay with QR Code
            </h2>
            
            <div className="text-center">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <img
                  src={installment.qr_code_url}
                  alt="Payment QR Code"
                  className="mx-auto max-w-full h-auto"
                  style={{ maxWidth: '250px' }}
                  onLoad={() => setQrCodeLoaded(true)}
                  onError={() => setQrCodeLoaded(false)}
                />
                {!qrCodeLoaded && (
                  <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                    <p className="text-gray-500">Loading QR Code...</p>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
                <p className="font-medium mb-1">How to Pay:</p>
                <ol className="text-left space-y-1">
                  <li>1. Open your mobile banking app</li>
                  <li>2. Select "Scan QR Code" or "QR Payment"</li>
                  <li>3. Point your camera at the QR code above</li>
                  <li>4. Confirm the payment amount</li>
                  <li>5. Complete the transaction</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Alternative Payment Methods */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Need Help?</h2>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-md">
              <Phone className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Call Us</p>
                <p className="text-sm text-gray-600">+230 123 4567</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-md">
              <Mail className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-600">support@nicl.mu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Important Information</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• This is installment {installment.installment_number} of your payment plan</p>
            <p>• Payment must be made by the due date to avoid late fees</p>
            <p>• You will receive confirmation once payment is processed</p>
            <p>• Keep this page for your records</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 py-4">
          <p>NIC Life Insurance Mauritius</p>
          <p>NIC Centre, 217 Royal Road, Curepipe</p>
          <p className="mt-2">This is a secure payment reminder</p>
        </div>
      </div>
    </div>
  )
}

export default InstallmentReminder