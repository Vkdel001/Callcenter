import { useState, useEffect } from 'react'
import { contactUpdateService } from '../../services/contactUpdateService'
import { Clock, User, Mail, Phone, DollarSign, FileText } from 'lucide-react'

const ContactUpdateHistory = ({ customerId }) => {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadUpdateHistory()
  }, [customerId])

  const loadUpdateHistory = async () => {
    try {
      setLoading(true)
      const allUpdates = await contactUpdateService.getAllUpdates()
      
      // Filter updates for this customer
      const customerUpdates = allUpdates.filter(update => {
        const updateCustomerId = update.customer?.id || update.customer
        return updateCustomerId === customerId || updateCustomerId === parseInt(customerId)
      })

      // Sort by date (most recent first)
      customerUpdates.sort((a, b) => {
        const dateA = new Date(a.captured_at || a.created_at)
        const dateB = new Date(b.captured_at || b.created_at)
        return dateB - dateA
      })

      setUpdates(customerUpdates)
      setError(null)
    } catch (err) {
      console.error('Failed to load update history:', err)
      setError('Failed to load update history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getChangeIcon = (update) => {
    if (update.new_email) return <Mail className="w-4 h-4" />
    if (update.new_mobile) return <Phone className="w-4 h-4" />
    if (update.new_amount) return <DollarSign className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const getStatusBadge = (status) => {
    const styles = {
      synced: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Update History</h3>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Update History</h3>
        <div className="text-center py-8 text-red-600">{error}</div>
      </div>
    )
  }

  if (updates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Update History</h3>
        <div className="text-center py-8 text-gray-500">
          No contact updates recorded for this customer
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Contact Update History
        </h3>
        <span className="text-sm text-gray-500">
          {updates.length} update{updates.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {updates.map((update, index) => (
          <div
            key={update.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  {getChangeIcon(update)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {update.agent_name || 'Unknown Agent'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatDate(update.captured_at || update.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(update.status)}`}>
                {update.status || 'pending'}
              </span>
            </div>

            {/* Changes */}
            <div className="space-y-2 mb-3">
              {update.new_mobile && (
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Mobile:</span>
                  <span className="ml-2 text-gray-400 line-through">{update.old_mobile}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900">{update.new_mobile}</span>
                </div>
              )}

              {update.new_email && (
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 text-gray-400 line-through">{update.old_email}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900">{update.new_email}</span>
                </div>
              )}

              {update.new_amount !== undefined && update.new_amount !== null && (
                <div className="flex items-center text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 text-gray-400 line-through">
                    MUR {parseFloat(update.old_amount || 0).toLocaleString()}
                  </span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900">
                    MUR {parseFloat(update.new_amount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Reason */}
            {update.update_reason && (
              <div className="bg-gray-50 rounded p-2 text-sm">
                <span className="text-gray-600">Reason:</span>
                <span className="ml-2 text-gray-900">{update.update_reason}</span>
              </div>
            )}

            {/* Notes */}
            {update.notes && (
              <div className="mt-2 text-xs text-gray-500 italic">
                Note: {update.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ContactUpdateHistory
