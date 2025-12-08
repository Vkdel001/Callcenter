import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { cslService } from '../../../services/csl/cslService'
import { agentApi } from '../../../services/apiClient'
import { 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Phone,
  Loader,
  Users
} from 'lucide-react'

export default function CSLAgentReports() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState('daily')
  
  // Agent selection
  const [cslAgents, setCSLAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  
  // Data states
  const [dailyData, setDailyData] = useState(null)
  const [followUpData, setFollowUpData] = useState(null)
  const [recoveryData, setRecoveryData] = useState(null)

  // Check admin access
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'life_admin') {
      navigate('/')
    }
  }, [user, navigate])

  // Load CSL agents on mount
  useEffect(() => {
    loadCSLAgents()
  }, [])

  // Load report data when agent is selected
  useEffect(() => {
    if (selectedAgentId) {
      loadReportData()
    }
  }, [selectedAgentId])

  const loadCSLAgents = async () => {
    try {
      const response = await agentApi.get('/nic_cc_agent')
      const allAgents = response.data || []
      
      // Filter for CSL agents (branch_id = 13) and active
      const cslAgentsList = allAgents.filter(a => 
        a.branch_id === 13 && a.active === true
      ).sort((a, b) => a.name.localeCompare(b.name))
      
      setCSLAgents(cslAgentsList)
      
      // Auto-select first agent
      if (cslAgentsList.length > 0) {
        setSelectedAgentId(cslAgentsList[0].id)
        setSelectedAgent(cslAgentsList[0])
      }
    } catch (error) {
      console.error('Error loading CSL agents:', error)
    }
  }

  const handleAgentChange = (e) => {
    const agentId = parseInt(e.target.value)
    setSelectedAgentId(agentId)
    const agent = cslAgents.find(a => a.id === agentId)
    setSelectedAgent(agent)
  }

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      // Load all data in parallel for selected agent
      const [policies, interactions] = await Promise.all([
        cslService.policy.getPoliciesForAgent(selectedAgentId),
        cslService.interaction.getInteractionsByAgent(selectedAgentId)
      ])

      // Load interactions for each policy
      const policiesWithInteractions = await Promise.all(
        policies.map(async (policy) => {
          const policyInteractions = await cslService.interaction.getInteractionsForPolicy(policy.id)
          return {
            ...policy,
            interactions: policyInteractions
          }
        })
      )

      // Calculate daily activity
      const today = new Date().toISOString().split('T')[0]
      const todayInteractions = interactions.filter(i => i.client_calling_date === today)
      
      const outcomeBreakdown = {}
      todayInteractions.forEach(i => {
        const outcome = i.outcome_1 || 'Not Specified'
        outcomeBreakdown[outcome] = (outcomeBreakdown[outcome] || 0) + 1
      })

      setDailyData({
        totalCalls: todayInteractions.length,
        policiesContacted: new Set(todayInteractions.map(i => i.policyId)).size,
        totalArrears: todayInteractions.reduce((sum, i) => {
          const policy = policiesWithInteractions.find(p => p.id === i.policyId)
          return sum + (parseFloat(policy?.arrears_amount) || 0)
        }, 0),
        outcomeBreakdown,
        ptpCases: todayInteractions.filter(i => i.ptpCase).length,
        interactions: todayInteractions
      })

      // Calculate follow-up data
      const policiesWithFollowUp = policiesWithInteractions.filter(p => 
        p.interactions.some(i => i.follow_up_date)
      )

      const followUpList = policiesWithFollowUp.map(policy => {
        const latestWithFollowUp = policy.interactions.find(i => i.follow_up_date)
        return {
          policy,
          followUpDate: latestWithFollowUp.follow_up_date,
          isOverdue: latestWithFollowUp.follow_up_date < today,
          isToday: latestWithFollowUp.follow_up_date === today
        }
      }).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))

      setFollowUpData({
        total: followUpList.length,
        overdue: followUpList.filter(f => f.isOverdue).length,
        today: followUpList.filter(f => f.isToday).length,
        upcoming: followUpList.filter(f => f.followUpDate > today).length,
        list: followUpList
      })

      // Calculate recovery summary
      const totalArrears = policiesWithInteractions.reduce((sum, p) => 
        sum + (parseFloat(p.arrears_amount) || 0), 0
      )

      const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const thisMonthInteractions = interactions.filter(i => 
        i.client_calling_date?.startsWith(thisMonth)
      )

      const amountRecovered = thisMonthInteractions.reduce((sum, i) => 
        sum + (parseFloat(i.amountPaidPerNicSystem) || 0), 0
      )

      const topPolicies = [...policiesWithInteractions]
        .sort((a, b) => parseFloat(b.arrears_amount) - parseFloat(a.arrears_amount))
        .slice(0, 10)

      setRecoveryData({
        totalArrears,
        amountRecovered,
        recoveryRate: totalArrears > 0 ? (amountRecovered / totalArrears * 100).toFixed(1) : 0,
        policiesAssigned: policiesWithInteractions.length,
        callsThisMonth: thisMonthInteractions.length,
        topPolicies
      })

    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MU', {
      style: 'currency',
      currency: 'MUR',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading && !selectedAgentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading CSL agents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">CSL Agent Performance Reports</h1>
        <p className="text-gray-600 mt-1">View and monitor CSL agent activity and performance</p>
      </div>

      {/* Agent Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4">
          <Users className="w-6 h-6 text-blue-600" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSL Agent
            </label>
            <select
              value={selectedAgentId || ''}
              onChange={handleAgentChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {cslAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {selectedAgent && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Viewing reports for:</span> {selectedAgent.name}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Report Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveReport('daily')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeReport === 'daily'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📊 Daily Activity
              </button>
              <button
                onClick={() => setActiveReport('followup')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeReport === 'followup'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                📅 Follow-Up List
              </button>
              <button
                onClick={() => setActiveReport('recovery')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeReport === 'recovery'
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                💰 Recovery Summary
              </button>
            </div>
          </div>

          {/* Daily Activity Report */}
          {activeReport === 'daily' && dailyData && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Calls Today</p>
                      <p className="text-3xl font-bold text-gray-900">{dailyData.totalCalls}</p>
                    </div>
                    <Phone className="w-10 h-10 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Policies Contacted</p>
                      <p className="text-3xl font-bold text-gray-900">{dailyData.policiesContacted}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">PTP Cases</p>
                      <p className="text-3xl font-bold text-gray-900">{dailyData.ptpCases}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-purple-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Arrears</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dailyData.totalArrears)}
                      </p>
                    </div>
                    <DollarSign className="w-10 h-10 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Outcome Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Outcomes</h3>
                <div className="space-y-3">
                  {Object.entries(dailyData.outcomeBreakdown).map(([outcome, count]) => (
                    <div key={outcome} className="flex items-center justify-between">
                      <span className="text-gray-700">{outcome}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(count / dailyData.totalCalls) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Follow-Up List Report */}
          {activeReport === 'followup' && followUpData && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Follow-Ups</p>
                      <p className="text-3xl font-bold text-gray-900">{followUpData.total}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-3xl font-bold text-red-600">{followUpData.overdue}</p>
                    </div>
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Today</p>
                      <p className="text-3xl font-bold text-orange-600">{followUpData.today}</p>
                    </div>
                    <Clock className="w-10 h-10 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Upcoming</p>
                      <p className="text-3xl font-bold text-green-600">{followUpData.upcoming}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Follow-Up List */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Follow-Up Schedule</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {followUpData.list.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No follow-ups scheduled
                    </div>
                  ) : (
                    followUpData.list.map((item) => (
                      <div key={item.policy.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                item.isOverdue
                                  ? 'bg-red-100 text-red-800'
                                  : item.isToday
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {item.isOverdue ? 'OVERDUE' : item.isToday ? 'TODAY' : 'UPCOMING'}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {item.policy.policy_number}
                              </span>
                              <span className="text-gray-600">
                                {item.policy.owner1_first_name} {item.policy.owner1_surname}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              Arrears: {formatCurrency(item.policy.arrears_amount)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(item.followUpDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recovery Summary Report */}
          {activeReport === 'recovery' && recoveryData && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Policies Assigned</p>
                      <p className="text-3xl font-bold text-gray-900">{recoveryData.policiesAssigned}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Arrears</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(recoveryData.totalArrears)}
                      </p>
                    </div>
                    <DollarSign className="w-10 h-10 text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Recovered (Month)</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(recoveryData.amountRecovered)}
                      </p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Recovery Rate</p>
                      <p className="text-3xl font-bold text-purple-600">{recoveryData.recoveryRate}%</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Top 10 Policies */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Top 10 Policies by Arrears</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {recoveryData.topPolicies.map((policy, index) => (
                    <div key={policy.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                          <div>
                            <p className="font-semibold text-gray-900">{policy.policy_number}</p>
                            <p className="text-sm text-gray-600">
                              {policy.owner1_first_name} {policy.owner1_surname}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(policy.arrears_amount)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {policy.installments_in_arrears} months
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
