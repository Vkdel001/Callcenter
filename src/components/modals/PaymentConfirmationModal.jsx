import { CheckCircle, X, Printer, Mail } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'

const PaymentConfirmationModal = ({ 
  transaction, 
  onClose, 
  onResendEmail,
  isResending 
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 no-print">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Payment Confirmation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Print Header (only visible when printing) */}
        <div className="print-only text-center mb-6">
          <h1 className="text-2xl font-bold">NIC Life Insurance Mauritius</h1>
          <h2 className="text-xl">Payment Confirmation</h2>
        </div>

        {/* Success Badge */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-semibold">
              Payment Successfully Received
            </span>
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Customer Name</p>
              <p className="font-semibold text-gray-900">{transaction.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Policy Number</p>
              <p className="font-semibold text-gray-900">{transaction.policy_number}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Line of Business</p>
              <p className="font-semibold text-gray-900 capitalize">
                {transaction.line_of_business} Insurance
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">QR Type</p>
              <p className="font-semibold text-gray-900">
                {transaction.qr_type === 'quick_qr' ? 'Quick QR' : 'Customer Detail'}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(transaction.payment_amount || transaction.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Date</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(transaction.paid_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Transaction Reference</p>
              <p className="font-mono text-sm text-gray-900">
                {transaction.payment_reference || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Paid
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>📅 Payment Allocation:</strong> Payment allocation to your NIC account 
            will be done in 3 to 4 working days.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </button>
          
          <button
            onClick={() => onResendEmail(transaction)}
            disabled={isResending || !transaction.customer_email}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="h-4 w-4" />
            {isResending ? 'Sending...' : 'Resend Email'}
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Close
          </button>
        </div>

        {/* Footer (print only) */}
        <div className="print-only text-center text-sm text-gray-600 mt-6 pt-4 border-t">
          <p>NIC Centre, 217 Royal Road, Curepipe, Mauritius</p>
          <p>This is an automated payment confirmation</p>
        </div>
      </div>
    </div>
  )
}

export default PaymentConfirmationModal
