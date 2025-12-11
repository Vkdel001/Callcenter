import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import followUpService from '../services/followUpService'
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Phone, 
  User, 
  CreditCard,
  RefreshCw,
  ArrowRight
} from 'lucide-react'

const FollowUpDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('urgent') // urgent, today, upcoming, all

  // Get follow-up data
  const { data: followUpData, isLoading, refetch } = useQuery(
    ['followUps', user?.id, user?.agent_type, user?.branch_id],
    () => {
      console.log('🔍 FollowUpDashboard - User info:', {
        id: user?.id,
        agent_type: user?.agent_type,
        branch_id: user?.branch_id,
        name: user?.name
      })
      return followUpService.getAgentFollowUps(user?.id, user?.agent_type, user?.branch_id)
    },
    {
      enabled: !!user?.id && !!user?.agent_type,
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 10000 // Consider data stale after 10 seconds
    }
  )

  // Handle customer navigation
  const handleCustomerClick = (followUp) => {
    // Navigate to customer detail with follow-up context
    navigate(`/customers/${followUp.customerId}?fromFollowUp=true&followUpId=${followUp.id}`)
  }

  // Handle quick call action
  const handleQuickCall = (followUp) => {
    // Navigate directly to customer detail for call logging
    navigate(`/customers/${followUp.customerId}?autoCall=true&followUpId=${followUp.id}`)
  }

  // Get priority color classes
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get status color classes
  const getStatusColor = (status) => {
    switch (status) {
      case 'payment_promised': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      case 'not_answered': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`
    if (diffDays > 1) return `In ${diffDays} days`
    
    return date.toLocaleDateString()
  }

  // Get display data based on selected category
  const getDisplayData = () => {
    if (!followUpData?.success) return []
    
    switch (selectedCategory) {
      case 'urgent':
        return [...followUpData.overdue, ...followUpData.today]
      case 'today':
        return followUpData.today
      case 'upcoming':
        return followUpData.upcoming
      case 'all':
        return followUpData.all
      default:
        return []
    }
  }

  const displayData = getDisplayData()
  const summary = followUpData?.summary || {}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading follow-ups...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-Up Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your customer follow-up queue and never miss a commitment
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Urgent (Overdue + Today) */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent Follow-Ups</p>
              <p className="text-3xl font-bold text-red-600">{summary.urgent || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.overdue || 0} overdue, {summary.today || 0} today
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        {/* Today */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Due Today</p>
              <p className="text-3xl font-bold text-orange-600">{summary.today || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled for today</p>
            </div>
            <Clock className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-3xl font-bold text-green-600">{summary.upcoming || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Next 2 working days</p>
            </div>
            <Calendar className="w-10 h-10 text-green-500" />
          </div>
        </div>

        {/* Total */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Follow-Ups</p>
              <p className="text-3xl font-bold text-blue-600">{summary.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">All pending follow-ups</p>
            </div>
            <CheckCircle className="w-10 h-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'urgent', label: 'Urgent', count: summary.urgent, color: 'text-red-600' },
              { key: 'today', label: 'Today', count: summary.today, color: 'text-orange-600' },
              { key: 'upcoming', label: 'Upcoming', count: summary.upcoming, color: 'text-green-600' },
              { key: 'all', label: 'All', count: summary.total, color: 'text-blue-600' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedCategory === tab.key
                    ? `border-current ${tab.color}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    selectedCategory === tab.key ? 'bg-current text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Follow-Up List */}
        <div className="p-6">
          {displayData.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No follow-ups</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedCategory === 'urgent' 
                  ? 'Great! No urgent follow-ups at the moment.'
                  : `No follow-ups in the ${selectedCategory} category.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayData.map((followUp) => (
                <div
                  key={followUp.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getPriorityColor(followUp.priority)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Customer Info */}
                      <div className="flex items-center space-x-3 mb-2">
                        <User className="h-5 w-5 text-gray-400" />
                        <h3 
                          className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                          onClick={() => handleCustomerClick(followUp)}
                        >
                          {followUp.customerName}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(followUp.lastCallStatus)}`}>
                          {followUp.lastCallStatus?.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          followUp.priority === 'high' ? 'bg-red-100 text-red-800' :
                          followUp.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {followUp.priority} priority
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          <span>{followUp.policyNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{followUp.mobile}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className={followUp.isOverdue ? 'text-red-600 font-medium' : ''}>
                            Due: {formatDate(followUp.followUpDate)}
                          </span>
                        </div>
                      </div>

                      {/* Last Call Remarks */}
                      {followUp.lastCallRemarks && (
                        <div className="bg-gray-50 rounded p-3 mb-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Last call:</span> {followUp.lastCallRemarks}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-6">
                      <button
                        onClick={() => handleQuickCall(followUp)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </button>
                      <button
                        onClick={() => handleCustomerClick(followUp)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      {summary.total > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-Up Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">{summary.overdue || 0}</div>
              <div className="text-sm text-gray-500">Overdue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{summary.today || 0}</div>
              <div className="text-sm text-gray-500">Due Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{summary.upcoming || 0}</div>
              <div className="text-sm text-gray-500">Upcoming</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{summary.future || 0}</div>
              <div className="text-sm text-gray-500">Future</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FollowUpDashboard