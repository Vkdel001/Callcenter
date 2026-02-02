import { useState } from 'react'
import { useQuery } from 'react-query'
import { reportService } from '../../services/reportService'
import { qrTransactionService } from '../../services/qrTransactionService'
import { agentApi } from '../../services/apiClient'
import { formatCurrency } from '../../utils/currency'
import { 
  Download, 
  BarChart3, 
  Users, 
  Phone, 
  TrendingUp,
  Filter,
  FileText,
  QrCode,
  CheckCircle,
  ArrowUpDown
} from 'lucide-react'

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedLOB, setSelectedLOB] = useState('all')
  const [selectedQRType, setSelectedQRType] = useState('all')
  const [activeTab, setActiveTab] = useState('summary')
  const [qrView, setQRView] = useState('agent_summary') // 'agent_summary' or 'all_transactions'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // Fetch agents for filter dropdown
  const { data: agents = [] } = useQuery(
    'agents',
    async () => {
      const response = await agentApi.get('/nic_cc_agent')
      return response.data || []
    }
  )

  // Fetch report data
  const { data: reportData, isLoading } = useQuery(
    ['agentReport', dateRange.startDate, dateRange.endDate, selectedAgent],
    () => reportService.getAgentPerformanceReport(
      dateRange.startDate, 
      dateRange.endDate, 
      selectedAgent || null
    ),
    {
      enabled: !!dateRange.startDate && !!dateRange.endDate
    }
  )

  // Fetch customer status report
  const { data: customerStatusData } = useQuery(
    'customerStatus',
    () => reportService.getCustomerStatusReport()
  )

  // Fetch QR Performance Report (Agent Summary)
  const { data: qrPerformanceData, isLoading: isLoadingQRPerformance } = useQuery(
    ['qrPerformance', dateRange.startDate, dateRange.endDate, selectedLOB, selectedAgent, selectedQRType],
    () => qrTransactionService.getAdminQRPerformanceReport({
      date_from: dateRange.startDate,
      date_to: dateRange.endDate,
      line_of_business: selectedLOB,
      agent_name: selectedAgent ? agents.find(a => a.id === parseInt(selectedAgent))?.name : null,
      qr_type: selectedQRType
    }),
    {
      enabled: !!dateRange.startDate && !!dateRange.endDate && activeTab === 'qr_performance'
    }
  )

  // Fetch All QR Transactions (Detailed View)
  const { data: qrTransactionsData, isLoading: isLoadingQRTransactions } = useQuery(
    ['qrTransactions', dateRange.startDate, dateRange.endDate, selectedLOB, selectedAgent, selectedQRType],
    () => qrTransactionService.getAllQRTransactions({
      date_from: dateRange.startDate,
      date_to: dateRange.endDate,
      line_of_business: selectedLOB,
      agent_name: selectedAgent ? agents.find(a => a.id === parseInt(selectedAgent))?.name : null,
      qr_type: selectedQRType,
      page: 1,
      per_page: 1000 // Fetch all for client-side pagination
    }),
    {
      enabled: !!dateRange.startDate && !!dateRange.endDate && activeTab === 'qr_performance' && qrView === 'all_transactions'
    }
  )

  const handleExportCSV = () => {
    if (activeTab === 'qr_performance') {
      // Export QR Performance data
      if (qrView === 'agent_summary' && qrPerformanceData?.success) {
        const filename = `qr_agent_summary_${dateRange.startDate}_to_${dateRange.endDate}.csv`
        reportService.exportQRAgentSummaryToCSV(
          qrPerformanceData.data.agentPerformance,
          qrPerformanceData.data.summary,
          dateRange,
          filename
        )
      } else if (qrView === 'all_transactions' && qrTransactionsData?.success) {
        const filename = `qr_all_transactions_${dateRange.startDate}_to_${dateRange.endDate}.csv`
        reportService.exportQRAllTransactionsToCSV(
          qrTransactionsData.data.transactions,
          dateRange,
          filename
        )
      }
    } else if (reportData?.success && reportData.data.detailedLogs) {
      // Export regular agent report
      const filename = `agent_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`
      reportService.exportReportToCSV(reportData.data.detailedLogs, filename)
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortData = (data, key, direction) => {
    if (!key) return data
    
    return [...data].sort((a, b) => {
      let aVal = a[key]
      let bVal = b[key]
      
      // Handle numeric values
      if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
        aVal = parseFloat(aVal)
        bVal = parseFloat(bVal)
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1
      if (aVal > bVal) return direction === 'asc' ? 1 : -1
      return 0
    })
  }

  const filterData = (data, query) => {
    if (!query) return data
    
    const lowerQuery = query.toLowerCase()
    return data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(lowerQuery)
      )
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      contacted: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      busy: 'bg-yellow-100 text-yellow-800',
      no_answer: 'bg-red-100 text-red-800',
      payment_promised: 'bg-purple-100 text-purple-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Agent performance and customer status analysis</p>
        </div>
        
        {((reportData?.success && activeTab !== 'qr_performance') || 
          (qrPerformanceData?.success && activeTab === 'qr_performance' && qrView === 'agent_summary') ||
          (qrTransactionsData?.success && activeTab === 'qr_performance' && qrView === 'all_transactions')) && (
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {activeTab === 'qr_performance' ? 'Export QR Performance' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* QR Performance specific filters */}
          {activeTab === 'qr_performance' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Line of Business</label>
                <select
                  value={selectedLOB}
                  onChange={(e) => setSelectedLOB(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All LOBs</option>
                  <option value="life">Life Insurance</option>
                  <option value="health">Health Insurance</option>
                  <option value="motor">Motor Insurance</option>
                  <option value="nonmotor">Non-Motor Insurance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">QR Type</label>
                <select
                  value={selectedQRType}
                  onChange={(e) => setSelectedQRType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="quick_qr">Quick QR</option>
                  <option value="customer_detail">Customer Detail</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'summary', label: 'Agent Summary', icon: BarChart3 },
              { id: 'detailed', label: 'Detailed Logs', icon: FileText },
              { id: 'status', label: 'Customer Status', icon: Users },
              { id: 'qr_performance', label: 'QR Performance', icon: QrCode }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {/* Agent Summary Tab */}
              {activeTab === 'summary' && reportData?.success && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Phone className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Total Calls</p>
                          <p className="text-2xl font-bold text-blue-900">{reportData.data.summary.totalCalls}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600">Active Agents</p>
                          <p className="text-2xl font-bold text-green-900">{reportData.data.summary.totalAgents}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-purple-600">Total Arrears</p>
                          <p className="text-2xl font-bold text-purple-900">{formatCurrency(reportData.data.summary.totalArrears)}</p>
                        </div>
                      </div>
                    </div>
                    

                  </div>

                  {/* Agent Performance Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Calls</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Arrears</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.data.agentSummary.map((agent) => (
                          <tr key={agent.agentId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{agent.agentName}</div>
                              <div className="text-sm text-gray-500">ID: {agent.agentId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.totalCalls}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.uniqueCustomers}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(agent.totalArrears)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Logs Tab */}
              {activeTab === 'detailed' && reportData?.success && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.data.detailedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{new Date(log.date).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">{new Date(log.date).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{log.agentName}</div>
                            <div className="text-xs text-gray-500">ID: {log.agentId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.customerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.policyNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(log.amountDue)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.outcome)}`}>
                              {log.outcome.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{log.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Customer Status Tab */}
              {activeTab === 'status' && customerStatusData?.success && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Customer Status Breakdown</h3>
                    {customerStatusData.data.statusBreakdown.map((status) => (
                      <div key={status.status} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{status.status.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-600">{status.count} customers ({status.percentage}%)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(status.totalArrears)}</p>
                            <p className="text-sm text-gray-600">Total arrears</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-4">Summary</h3>
                    <div className="space-y-2">
                      <p className="text-blue-800">
                        <span className="font-medium">Total Customers:</span> {customerStatusData.data.totalCustomers}
                      </p>
                      <p className="text-blue-800">
                        <span className="font-medium">Total Arrears:</span> {formatCurrency(
                          customerStatusData.data.statusBreakdown.reduce((sum, s) => sum + s.totalArrears, 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Performance Tab */}
              {activeTab === 'qr_performance' && (
                <div className="space-y-6">
                  {isLoadingQRPerformance || isLoadingQRTransactions ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                  ) : qrPerformanceData?.success ? (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <QrCode className="h-8 w-8 text-blue-600" />
                            <div className="ml-3">
                              <p className="text-xs font-medium text-blue-600">Total QRs</p>
                              <p className="text-xl font-bold text-blue-900">{qrPerformanceData.data.summary.total_qrs_generated}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div className="ml-3">
                              <p className="text-xs font-medium text-green-600">Payments</p>
                              <p className="text-xl font-bold text-green-900">{qrPerformanceData.data.summary.total_payments_received}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                            <div className="ml-3">
                              <p className="text-xs font-medium text-purple-600">Conv. Rate</p>
                              <p className="text-xl font-bold text-purple-900">{qrPerformanceData.data.summary.overall_conversion_rate}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                            <div className="ml-3">
                              <p className="text-xs font-medium text-blue-600">Generated</p>
                              <p className="text-lg font-bold text-blue-900">{formatCurrency(qrPerformanceData.data.summary.total_amount_generated)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <BarChart3 className="h-8 w-8 text-green-600" />
                            <div className="ml-3">
                              <p className="text-xs font-medium text-green-600">Collected</p>
                              <p className="text-lg font-bold text-green-900">{formatCurrency(qrPerformanceData.data.summary.total_amount_collected)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-orange-600" />
                            <div className="ml-3">
                              <p className="text-xs font-medium text-orange-600">Coll. Rate</p>
                              <p className="text-xl font-bold text-orange-900">{qrPerformanceData.data.summary.overall_collection_rate}%</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* View Toggle */}
                      <div className="flex space-x-4 border-b border-gray-200">
                        <button
                          onClick={() => setQRView('agent_summary')}
                          className={`px-4 py-2 font-medium text-sm border-b-2 ${
                            qrView === 'agent_summary'
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Agent Summary
                        </button>
                        <button
                          onClick={() => setQRView('all_transactions')}
                          className={`px-4 py-2 font-medium text-sm border-b-2 ${
                            qrView === 'all_transactions'
                              ? 'border-primary-500 text-primary-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          All Transactions
                        </button>
                      </div>

                      {/* Agent Summary View */}
                      {qrView === 'agent_summary' && (
                        <div className="space-y-4">
                          {/* Search */}
                          <input
                            type="text"
                            placeholder="Search agents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          />

                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th onClick={() => handleSort('agent_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Agent Name <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('agent_email')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Email <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('qrs_generated')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      QRs Generated <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('payments_received')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Payments <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('conversion_rate')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Conv. Rate <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('amount_generated')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Amount Generated <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('amount_collected')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Amount Collected <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th onClick={() => handleSort('collection_rate')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div className="flex items-center">
                                      Coll. Rate <ArrowUpDown className="h-3 w-3 ml-1" />
                                    </div>
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Activity
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {sortData(filterData(qrPerformanceData.data.agentPerformance, searchQuery), sortConfig.key, sortConfig.direction)
                                  .map((agent, index) => (
                                  <tr key={index} className={`hover:bg-gray-50 ${
                                    index < 3 ? 'bg-green-50' : index >= qrPerformanceData.data.agentPerformance.length - 3 ? 'bg-yellow-50' : ''
                                  }`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agent_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{agent.agent_email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.qrs_generated}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.payments_received}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">{agent.conversion_rate}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(agent.amount_generated)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(agent.amount_collected)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">{agent.collection_rate}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(agent.last_activity).toLocaleDateString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* All Transactions View */}
                      {qrView === 'all_transactions' && qrTransactionsData?.success && (
                        <div className="space-y-4">
                          {/* Search */}
                          <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          />

                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOB</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Type</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Date</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {filterData(qrTransactionsData.data.transactions, searchQuery).map((txn) => (
                                  <tr key={txn.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      <div>{new Date(txn.created_at).toLocaleDateString()}</div>
                                      <div className="text-xs text-gray-500">{new Date(txn.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{txn.agent_name || 'N/A'}</div>
                                      <div className="text-xs text-gray-500">{txn.agent_email || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.customer_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.policy_number || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{txn.line_of_business || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{txn.qr_type || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(parseFloat(txn.amount || 0))}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(parseFloat(txn.payment_amount || 0))}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        txn.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        txn.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {txn.status || 'pending'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                      {txn.paid_at ? new Date(txn.paid_at).toLocaleDateString() : 'N/A'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No QR performance data available for the selected filters.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports