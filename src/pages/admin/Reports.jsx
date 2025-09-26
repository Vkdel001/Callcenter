import { useState } from 'react'
import { useQuery } from 'react-query'
import { reportService } from '../../services/reportService'
import { agentApi } from '../../services/apiClient'
import { formatCurrency } from '../../utils/currency'
import { 
  Calendar, 
  Download, 
  BarChart3, 
  Users, 
  Phone, 
  TrendingUp,
  Filter,
  FileText
} from 'lucide-react'

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [selectedAgent, setSelectedAgent] = useState('')
  const [activeTab, setActiveTab] = useState('summary')

  // Fetch agents for filter dropdown
  const { data: agents = [] } = useQuery(
    'agents',
    async () => {
      const response = await agentApi.get('/nic_cc_agent')
      return response.data || []
    }
  )

  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery(
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

  const handleExportCSV = () => {
    if (reportData?.success && reportData.data.detailedLogs) {
      const filename = `agent_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`
      reportService.exportReportToCSV(reportData.data.detailedLogs, filename)
    }
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
        
        {reportData?.success && (
          <button
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'summary', label: 'Agent Summary', icon: BarChart3 },
              { id: 'detailed', label: 'Detailed Logs', icon: FileText },
              { id: 'status', label: 'Customer Status', icon: Users }
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports