import { useState } from 'react'
import { QrCode, Mail, MessageSquare, Loader } from 'lucide-react'
import { cslService } from '../../services/csl/cslService'
import { useAuth } from '../../contexts/AuthContext'

export default function CSLQuickActionsPanel({ policy, onQRGenerated, onActionComplete }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleGenerateQR = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      console.log('🔷 Generating QR for policy:', policy.policy_number)
      
      // Generate QR using adapter service
      const result = await cslService.adapter.generateQRForCSLPolicy(policy)
      
      if (result.success) {
        console.log('✅ QR generated:', result)
        setSuccess('QR code generated successfully!')
        
        // Pass QR data to parent
        if (onQRGenerated) {
          onQRGenerated({
            qrCodeUrl: result.qrCodeUrl,
            paymentLink: result.paymentLink,
            amount: result.amount,
            merchantId: result.merchantId
          })
        }
      } else {
        throw new Error(result.error || 'Failed to generate QR code')
      }
    } catch (err) {
      console.error('❌ QR generation error:', err)
      setError(err.message || 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (!policy.owner1_email) {
        throw new Error('No email address on file')
      }

      // Generate QR first
      const qrResult = await cslService.adapter.generateQRForCSLPolicy(policy)
      
      if (!qrResult.success) {
        throw new Error('Failed to generate QR code')
      }

      // Send email with QR
      const emailResult = await cslService.adapter.sendEmailForCSLPolicy(
        policy,
        qrResult.qrCodeUrl,
        qrResult.paymentLink,
        {
          agentEmail: user.email,
          agentName: user.name,
          ccAgent: true
        }
      )

      if (emailResult.success) {
        setSuccess('Email sent successfully!')
        if (onActionComplete) onActionComplete('email')
      } else {
        throw new Error(emailResult.error || 'Failed to send email')
      }
    } catch (err) {
      console.error('❌ Email error:', err)
      setError(err.message || 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const handleSendWhatsApp = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      if (!policy.owner1_mobile_no) {
        throw new Error('No mobile number on file')
      }

      // Generate QR first
      const qrResult = await cslService.adapter.generateQRForCSLPolicy(policy)
      
      if (!qrResult.success) {
        throw new Error('Failed to generate QR code')
      }

      // Send WhatsApp with QR
      const whatsappResult = await cslService.adapter.sendWhatsAppForCSLPolicy(
        policy,
        qrResult.qrCodeUrl,
        qrResult.paymentLink
      )

      if (whatsappResult.success) {
        setSuccess('WhatsApp message sent successfully!')
        if (onActionComplete) onActionComplete('whatsapp')
      } else {
        throw new Error(whatsappResult.error || 'Failed to send WhatsApp')
      }
    } catch (err) {
      console.error('❌ WhatsApp error:', err)
      setError(err.message || 'Failed to send WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-600">Generate and send payment reminders</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateQR}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
              <span>Generate QR</span>
            </button>

            <button
              onClick={handleSendEmail}
              disabled={loading || !policy.owner1_email}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-5 h-5" />
              <span>Send Email</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              disabled={loading || !policy.owner1_mobile_no}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-5 h-5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}
