import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { qrTransactionService } from '../services/qrTransactionService'
import { QrCode, TrendingUp, Clock, CheckCircle, XCircle, BarChart3, Eye, RefreshCw, Download, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { formatCurrency } from '../utils/currency'
import { exportQRTransactionsToExcel } from '../utils/excelExport'

const AgentQRSummary = () => {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState('30') // days
  const [selectedLOB, setSelectedLOB] = useState('all')
  const [showDetails, setShowDetails] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
    
    // Sort all transactions
    const sortedTransactions = transactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    // Calculate pagination
    const totalTransactions = sortedTransactions.length
    const totalPages = Math.ceil(totalTransactions / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    
    // Get paginated transactions
    const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex)
    
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
      
      // Pagination data
      recent_transactions: paginatedTransactions,
      pagination: {
        currentPage,
        pageSize,
        totalTransactions,
        totalPages,
        startIndex: startIndex + 1,
        endIndex: Math.min(endIndex, totalTransactions)
      }
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedPeriod, selectedLOB])

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu-container')) {
        setShowExportMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  // Export handler
  const handleExport = (exportType) => {
    let transactionsToExport = []
    
    switch (exportType) {
      case 'current':
        // Export only current page
        transactionsToExport = stats.recent_transactions
        break
      case 'all':
        // Export all transactions
        transactionsToExport = (qrHistory.transactions || [])
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case 'summary':
        // Export all with summary
        transactionsToExport = (qrHistory.transactions || [])
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
    }
    
    const filters = {
      period: `Last ${selectedPeriod} days`,
      lob: selectedLOB
    }
    
    try {
      const filename = exportQRTransactionsToExcel(
        transactionsToExport,
        stats,
        exportType,
        filters
      )
      
      // Show success message
      alert(`Successfully exported ${transactionsToExport.length} transactions to ${filename}`)
      
      // Close menu
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  // Page number rendering helper
  const renderPageNumbers = () => {
    const totalPages = stats.pagination.totalPages
    const current = currentPage
    const pages = []
    
    if (totalPages <= 1) return null
    
    // Always show first page
    pages.push(1)
    
    // Show pages around current page
    if (current > 3) {
      pages.push('...')
    }
    
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      pages.push(i)
    }
    
    // Show last page
    if (current < totalPages - 2) {
      pages.push('...')
    }
    
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
            ...
          </span>
        )
      }
      
      return (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            currentPage === page
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      )
    })
  }

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
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Export to Excel
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                <button
                  onClick={() => handleExport('current')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Current Page ({stats.pagination.endIndex - stats.pagination.startIndex + 1} rows)
                </button>
                <button
                  onClick={() => handleExport('all')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export All Transactions ({stats.total_generated} rows)
                </button>
                <button
                  onClick={() => handleExport('summary')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-t rounded-b-lg"
                >
                  <BarChart3 className="h-4 w-4" />
                  Export with Summary
                </button>
              </div>
            )}
          </div>
        </div>
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
        
        {/* Pagination Controls */}
        {stats.pagination.totalTransactions > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Left: Page Info */}
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{stats.pagination.startIndex}</span> to{' '}
                <span className="font-medium">{stats.pagination.endIndex}</span> of{' '}
                <span className="font-medium">{stats.pagination.totalTransactions}</span> transactions
              </div>
              
              {/* Center: Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Show:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              
              {/* Right: Page Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {renderPageNumbers()}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(stats.pagination.totalPages, prev + 1))}
                  disabled={currentPage === stats.pagination.totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === stats.pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              
            </div>
          </div>
        )}
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