import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { qrTransactionService } from '../services/qrTransactionService'
import { QrCode, TrendingUp, Clock, CheckCircle, XCircle, Calendar, BarChart3, Eye, RefreshCw } from 'lucide-react'
import { formatCurrency } from '../utils/currency'

const AgentQRSummary = () => {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('30') // days
  const [selectedLOB, setSelectedLOB] = useState('all')
  const [showDetails, setShowDetails] = useState(false)

  // Calculate date range
  const getDateRange = (days) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
  }

  const dateRange = getDateRange(selectedPeriod)

  // Fetch agent's QR history
  const { data: qrHistory = [], isLoading, refetch } = useQuery(
    ['agentQRHistory', user?.id, selectedPeriod, selectedLOB],
    () => {
      if (!user?.id) return []
      
      const filters = {
        date_from: dateRange.start,
        date_to: dateRange.end
      }
      
      if (selectedLOB !== 'all') {
        filters.line_of_business = selectedLOB
      }
      
      return qrTransactionService.getAgentHistory(user.id, filters)
    },
    {
      enabled: !!user?.id,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  )

  // Calculate summary statistics
  const calculateStats = () => {
    const transactions = qrHistory.transactions || []
    
    const stats = {
      total_generated: transactions.length,
      total_paid: transactions.filter(t => t.status === 'paid').length,
      total_pending: transactions.filter(t => t.status === 'pending').length,
      total_amount_generated: transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
      total_amount_paid: transactions
        .filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + parseFloat(t.payment_amount || t.amount || 0), 0),
      conversion_rate: 0,
      by_lob: {},
      by_qr_type: {},
      recent_transactions: transactions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    }

    // Calculate conversion rate
    if (stats.total_generated > 0) {
      stats.conversion_rate = (stats.total_paid / stats.total_generated) * 100
    }

    // Group by LOB
    transactions.forEach(t => {
      const lob = t.line_of_business || 'unknown'
      if (!stats.by_lob[lob]) {
        stats.by_lob[lob] = { generated: 0, paid: 0, amount: 0 }
      }
      stats.by_lob[lob].generated++
      if (t.status === 'paid') {
        stats.by_lob[lob].paid++
        stats.by_lob[lob].amount += parseFloat(t.payment_amount || t.amount || 0)
      }
    })

    // Group by QR type
    transactions.forEach(t => {
      const qrType = t.qr_type || 'unknown'
      if (!stats.by_qr_type[qrType]) {
        stats.by_qr_type[qrType] = { generated: 0, paid: 0, amount: 0 }
      }
      stats.by_qr_type[qrType].generated++
      if (t.status === 'paid') {
        stats.by_qr_type[qrType].paid++
        stats.by_qr_type[qrType].amount += parseFloat(t.payment_amount || t.amount || 0)
      }
    })

    return stats
  }

  const stats = calculateStats()

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'expired': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getQRTypeLabel = (qrType) => {
    switch (qrType) {
      case 'quick_qr': return 'Quick QR'
      case 'customer_detail': return 'Customer Detail'
      default: return qrType
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your QR performance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My QR Performance</h1>
          <p className="text-gray-600">Track your QR code generation and payment success rates</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Line of Business</label>
            <select
              value={selectedLOB}
              onChange={(e) => setSelectedLOB(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All LOBs</option>
              <option value="life">Life Insurance</option>
              <option value="health">Health Insurance</option>
              <option value="motor">Motor Insurance</option>
              <option value="nonmotor">Non Motor Insurance</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">QRs Generated</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_generated}</p>
            </div>
            <QrCode className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payments Received</p>
              <p className="text-2xl font-bold text-green-600">{stats.total_paid}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-600">{stats.conversion_rate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Amount Generated</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_amount_generated)}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Amount Collected</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_amount_paid)}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collection Rate</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.total_amount_generated > 0 
                  ? ((stats.total_amount_paid / stats.total_amount_generated) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Breakdown by LOB and QR Type */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Line of Business */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Line of Business</h3>
            <div className="space-y-3">
              {Object.entries(stats.by_lob).map(([lob, data]) => (
                <div key={lob} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{lob}</p>
                    <p className="text-sm text-gray-600">
                      {data.paid}/{data.generated} paid ({data.generated > 0 ? ((data.paid / data.generated) * 100).toFixed(1) : 0}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(data.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By QR Type */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by QR Type</h3>
            <div className="space-y-3">
              {Object.entries(stats.by_qr_type).map(([qrType, data]) => (
                <div key={qrType} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{getQRTypeLabel(qrType)}</p>
                    <p className="text-sm text-gray-600">
                      {data.paid}/{data.generated} paid ({data.generated > 0 ? ((data.paid / data.generated) * 100).toFixed(1) : 0}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(data.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent QR Transactions</h3>
          <p className="text-sm text-gray-600">Your latest QR code generations and their status</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Policy/Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Received
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recent_transactions.length > 0 ? (
                stats.recent_transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.policy_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getQRTypeLabel(transaction.qr_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.status === 'paid' ? (
                        <span className="font-medium text-green-600">
                          {formatCurrency(transaction.payment_amount || transaction.amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {transaction.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {transaction.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.paid_at ? formatDate(transaction.paid_at) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No QR transactions found for the selected period</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Generate some QR codes to see your performance metrics here
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Tips */}
      {stats.total_generated > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Performance Insights</h3>
          <div className="space-y-2 text-sm text-blue-800">
            {stats.conversion_rate < 50 && (
              <p>💡 Your conversion rate is {stats.conversion_rate.toFixed(1)}%. Consider following up with customers who haven't paid yet.</p>
            )}
            {stats.conversion_rate >= 80 && (
              <p>🎉 Excellent conversion rate of {stats.conversion_rate.toFixed(1)}%! Keep up the great work!</p>
            )}
            {stats.total_pending > 0 && (
              <p>⏰ You have {stats.total_pending} pending payments worth {formatCurrency(stats.total_amount_generated - stats.total_amount_paid)}.</p>
            )}
            {stats.total_amount_paid !== stats.total_amount_generated && stats.total_paid > 0 && (
              <p>💰 Payment amounts: {formatCurrency(stats.total_amount_paid)} received out of {formatCurrency(stats.total_amount_generated)} generated ({((stats.total_amount_paid / stats.total_amount_generated) * 100).toFixed(1)}% collection rate).</p>
            )}
            {stats.total_generated >= 10 && (
              <p>📈 You've generated {stats.total_generated} QR codes in the last {selectedPeriod} days. Great activity!</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentQRSummary