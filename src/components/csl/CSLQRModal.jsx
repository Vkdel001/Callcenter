import { X, Download, Mail, MessageSquare } from 'lucide-react'

export default function CSLQRModal({ policy, qrData, onClose, onSendEmail, onSendWhatsApp }) {

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = qrData.qrCodeUrl
    link.download = `QR_${policy.policy_number}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <p className="text-lg font-semibold text-gray-900">Policy: {policy.policy_number}</p>
            <p className="text-sm text-gray-600">{policy.owner1_first_name} {policy.owner1_surname}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* QR Code Display - Bigger and cleaner */}
          <div className="bg-gray-50 rounded-lg p-8 mb-6 flex justify-center">
            <img
              src={qrData.qrCodeUrl}
              alt="Payment QR Code"
              className="w-80 h-80"
            />
          </div>

          {/* Policy Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Customer Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-medium">{policy.owner1_first_name} {policy.owner1_surname}</p>
              </div>
              <div>
                <p className="text-gray-600">Mobile</p>
                <p className="font-medium">{policy.owner1_mobile_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{policy.owner1_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Arrears</p>
                <p className="font-medium text-red-600">
                  MUR {parseFloat(policy.arrears_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
              <span>Download QR</span>
            </button>

            <button
              onClick={() => onSendEmail(qrData)}
              disabled={!policy.owner1_email}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-5 h-5" />
              <span>Send Email</span>
            </button>

            <button
              onClick={() => onSendWhatsApp(qrData)}
              disabled={!policy.owner1_mobile_no}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Send WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
