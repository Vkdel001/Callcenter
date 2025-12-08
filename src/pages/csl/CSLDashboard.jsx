import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { cslService } from '../../services/csl/cslService'
import { formatMonthYear } from '../../utils/dateHelpers'
import ArchiveConfirmationModal from '../../components/csl/ArchiveConfirmationModal'
import { 
  Phone, 
  Calendar, 
  DollarSign, 
  Users, 
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react'

export default function CSLDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [policies, setPolicies] = useState([])
  const [filteredPolicies, setFilteredPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalPolicies: 0,
    contactedToday: 0,
    followUpToday: 0,
    totalArrears: 0,
    toContact: 0,
    unassignedCount: 0
  })
  
  // Month selection state
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveMonthToOpen, setArchiveMonthToOpen] = useState(null)
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState('to-contact')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [arrearsFilter, setArrearsFilter] = useState('all')
  const [sortBy, setSortBy] = useState('arrears_desc')
  
  // Pagination
  const [displayCount, setDisplayCount] = useState(5)

  useEffect(() => {
    loadAvailableMonths()
  }, [user.id])

  useEffect(() => {
    if (selectedMonth) {
      loadDashboardData()
    }
  }, [selectedMonth, user.id])

  useEffect(() => {
    applyFilters()
  }, [policies, searchTerm, statusFilter, arrearsFilter, sortBy, activeTab])

  const loadAvailableMonths = async () => {
    try {
      // Get all policies to extract unique months
      const [assignedPolicies, unassignedPolicies] = await Promise.all([
        cslService.policy.getPoliciesForAgent(user.id),
        cslService.policy.getUnassignedPolicies()
      ])
      
      const allPolicies = [...assignedPolicies, ...unassignedPolicies]
      
      // Extract unique months with policy counts
      const monthMap = {}
      allPolicies.forEach(policy => {
        const date = policy.data_as_of_date
        if (date) {
          if (!monthMap[date]) {
            monthMap[date] = { date, count: 0 }
          }
          monthMap[date].count++
        }
      })
      
      // Convert to array and sort (newest first)
      const uniqueMonths = Object.values(monthMap)
        .sort((a, b) => b.date.localeCompare(a.date))
      
      // Format for tiles
      const formattedMonths = uniqueMonths.map((item, index) => ({
        value: item.date,
        label: formatMonthYear(item.date),
        policyCount: item.count,
        isLatest: index === 0
      }))
      
      setAvailableMonths(formattedMonths)
      
      // Auto-select latest month
      if (formattedMonths.length > 0 && !selectedMonth) {
        setSelectedMonth(formattedMonths[0].value)
      }
    } catch (err) {
      console.error('Error loading available months:', err)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load both assigned and unassigned policies for selected month
      const [assignedPolicies, unassignedPolicies] = await Promise.all([
        cslService.policy.getPoliciesForAgent(user.id),
        cslService.policy.getUnassignedPolicies()
      ])
      
      // Filter by selected month
      const assignedFiltered = assignedPolicies.filter(p => p.data_as_of_date === selectedMonth)
      const unassignedFiltered = unassignedPolicies.filter(p => p.data_as_of_date === selectedMonth)
      
      // Load interactions AND payments for ASSIGNED policies
      const assignedWithInteractions = await Promise.all(
        assignedFiltered.map(async (policy) => {
          try {
            // Load interactions
            const interactions = await cslService.interaction.getInteractionsForPolicy(policy.id)
            
            // Load payments from csl_payments table (only after policy creation)
            const payments = await cslService.payment.getPaymentsForPolicy(policy.policy_number, policy.created_at)
            
            return {
              ...policy,
              latestInteraction: interactions[0] || null,
              interactionCount: interactions.length,
              latestPayment: payments[0] || null,  // Most recent payment
              paymentCount: payments.length,
              isAssignedToMe: true
            }
          } catch (err) {
            console.error(`Error loading data for policy ${policy.id}:`, err)
            return {
              ...policy,
              latestInteraction: null,
              interactionCount: 0,
              latestPayment: null,
              paymentCount: 0,
              isAssignedToMe: true
            }
          }
        })
      )

      // Mark unassigned policies without loading interactions (load on-demand when viewing details)
      const unassignedMarked = unassignedFiltered.map(policy => ({
        ...policy,
        latestInteraction: null,
        interactionCount: 0,
        isAssignedToMe: false
      }))

      // Combine both lists
      const allPolicies = [...assignedWithInteractions, ...unassignedMarked]
      setPolicies(allPolicies)

      // Calculate stats (only for assigned policies)
      const today = new Date().toISOString().split('T')[0]
      
      // Debug: Log interaction dates
      console.log('🔍 Today:', today)
      assignedWithInteractions.forEach(p => {
        if (p.latestInteraction) {
          console.log(`Policy ${p.policy_number}: calling_date=${p.latestInteraction.client_calling_date}, matches today=${p.latestInteraction.client_calling_date === today}`)
        }
      })
      
      const stats = {
        // Total = assigned + unassigned
        totalPolicies: allPolicies.length,
        
        // To Contact = unassigned + assigned with no interactions
        toContact: unassignedFiltered.length + assignedWithInteractions.filter(p => p.interactionCount === 0).length,
        
        // Contacted Today = only assigned policies contacted today
        contactedToday: assignedWithInteractions.filter(p => 
          p.latestInteraction?.client_calling_date === today
        ).length,
        
        // Total Contacted = all assigned policies with at least one interaction
        totalContacted: assignedWithInteractions.filter(p => p.interactionCount > 0).length,
        
        // Follow-Up Today = only assigned policies with follow-up today
        followUpToday: assignedWithInteractions.filter(p => 
          p.latestInteraction?.follow_up_date === today
        ).length,
        
        // Total Arrears = all policies
        totalArrears: allPolicies.reduce((sum, p) => 
          sum + (parseFloat(p.arrears_amount) || 0), 0
        ),
        
        unassignedCount: unassignedFiltered.length
      }
      setStats(stats)

    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMonthSelect = (month) => {
    if (month.isLatest) {
      // Current month - no confirmation needed
      setSelectedMonth(month.value)
    } else {
      // Archived month - show confirmation modal
      setArchiveMonthToOpen(month)
      setShowArchiveModal(true)
    }
  }

  const handleConfirmArchive = () => {
    if (archiveMonthToOpen) {
      setSelectedMonth(archiveMonthToOpen.value)
      setShowArchiveModal(false)
      setArchiveMonthToOpen(null)
    }
  }

  const handleCancelArchive = () => {
    setShowArchiveModal(false)
    setArchiveMonthToOpen(null)
  }

  const applyFilters = () => {
    let filtered = [...policies]

    // Apply tab-specific filtering
    const today = new Date().toISOString().split('T')[0]
    if (activeTab === 'to-contact') {
      // Show: Unassigned policies + Assigned policies with no interactions
      filtered = filtered.filter(p => 
        !p.isAssignedToMe || p.interactionCount === 0
      )
    } else if (activeTab === 'contacted') {
      // Show: Only assigned policies contacted today
      filtered = filtered.filter(p => 
        p.isAssignedToMe && p.latestInteraction?.client_calling_date === today
      )
    } else if (activeTab === 'total-contacted') {
      // Show: All assigned policies that have been contacted at least once
      filtered = filtered.filter(p => 
        p.isAssignedToMe && p.interactionCount > 0
      )
    } else if (activeTab === 'follow-up') {
      // Show: Only assigned policies with follow-up dates
      filtered = filtered.filter(p => 
        p.isAssignedToMe && p.latestInteraction?.follow_up_date
      )
    }
    // 'all' tab shows everything (assigned + unassigned)

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.policy_number?.toLowerCase().includes(term) ||
        p.owner1_first_name?.toLowerCase().includes(term) ||
        p.owner1_surname?.toLowerCase().includes(term) ||
        p.owner1_nic?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.policy_status === statusFilter)
    }

    // Arrears filter
    if (arrearsFilter !== 'all') {
      const arrears = parseFloat(arrearsFilter)
      if (arrearsFilter === 'high') {
        filtered = filtered.filter(p => parseFloat(p.arrears_amount) > 10000)
      } else if (arrearsFilter === 'medium') {
        filtered = filtered.filter(p => {
          const amount = parseFloat(p.arrears_amount)
          return amount >= 5000 && amount <= 10000
        })
      } else if (arrearsFilter === 'low') {
        filtered = filtered.filter(p => parseFloat(p.arrears_amount) < 5000)
      }
    }

    // Sort with smart prioritization
    filtered.sort((a, b) => {
      // PRIORITY 1: In "All Policies" tab, show uncontacted first
      if (activeTab === 'all') {
        const aUncontacted = !a.isAssignedToMe || a.interactionCount === 0
        const bUncontacted = !b.isAssignedToMe || b.interactionCount === 0
        
        if (aUncontacted && !bUncontacted) return -1  // a first
        if (!aUncontacted && bUncontacted) return 1   // b first
        // If both same status, continue to regular sort
      }
      
      // PRIORITY 2: Regular sort based on user selection
      switch (sortBy) {
        case 'arrears_desc':
          return parseFloat(b.arrears_amount) - parseFloat(a.arrears_amount)
        case 'arrears_asc':
          return parseFloat(a.arrears_amount) - parseFloat(b.arrears_amount)
        case 'follow_up':
          return (a.latestInteraction?.follow_up_date || '9999-99-99')
            .localeCompare(b.latestInteraction?.follow_up_date || '9999-99-99')
        case 'last_call':
          return (b.latestInteraction?.client_calling_date || '0000-00-00')
            .localeCompare(a.latestInteraction?.client_calling_date || '0000-00-00')
        default:
          return 0
      }
    })

    setFilteredPolicies(filtered)
  }

  const getPriorityLevel = (policy) => {
    const arrears = parseFloat(policy.arrears_amount) || 0
    const followUpDate = policy.latestInteraction?.follow_up_date
    const today = new Date().toISOString().split('T')[0]
    
    // Urgent: High arrears OR overdue follow-up
    if (arrears > 10000 || (followUpDate && followUpDate < today)) {
      return { level: 'urgent', color: 'red', icon: '🔴' }
    }
    
    // Medium: Moderate arrears
    if (arrears >= 5000) {
      return { level: 'medium', color: 'yellow', icon: '🟡' }
    }
    
    // Low: Small arrears
    return { level: 'low', color: 'green', icon: '🟢' }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MU', {
      style: 'currency',
      currency: 'MUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getRelativeDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    return `In ${diffDays} days`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CSL Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">CSL Call Center Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your assigned policies and track interactions</p>
      </div>

      {/* Month Selector Tiles - Horizontal Scroll */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          📅 Select Data Month:
        </label>
        
        {/* Scrollable container */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {availableMonths.map((month) => (
              <div
                key={month.value}
                onClick={() => handleMonthSelect(month)}
                className={`
                  flex-shrink-0 w-64 p-4 rounded-xl cursor-pointer transition-all snap-start
                  transform hover:scale-105 hover:-translate-y-1
                  ${month.isLatest 
                    ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-200' 
                    : 'bg-gradient-to-br from-gray-100 to-gray-300 shadow-lg shadow-gray-200 hover:shadow-xl'
                  }
                  ${selectedMonth === month.value 
                    ? 'ring-4 ring-blue-400 ring-offset-2 shadow-2xl' 
                    : ''
                  }
                `}
                style={{
                  boxShadow: month.isLatest 
                    ? '0 10px 25px -5px rgba(34, 197, 94, 0.4), 0 8px 10px -6px rgba(34, 197, 94, 0.3)' 
                    : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`
                    text-xs font-bold px-3 py-1 rounded-full shadow-md
                    ${month.isLatest 
                      ? 'bg-white text-green-700 shadow-green-300' 
                      : 'bg-white text-gray-700 shadow-gray-300'
                    }
                  `}>
                    {month.isLatest ? '📊 CURRENT' : '📁 ARCHIVED'}
                  </span>
                  {month.isLatest && (
                    <span className="text-white text-2xl drop-shadow-lg">✓</span>
                  )}
                  {!month.isLatest && (
                    <span className="text-white text-2xl drop-shadow-lg">🔒</span>
                  )}
                </div>
                
                {/* Month Name */}
                <h3 className={`
                  text-xl font-bold mb-1 drop-shadow-sm
                  ${month.isLatest ? 'text-white' : 'text-gray-700'}
                `}>
                  {month.label}
                </h3>
                
                {/* Policy Count */}
                <p className={`
                  text-sm font-semibold mb-2
                  ${month.isLatest ? 'text-green-100' : 'text-gray-600'}
                `}>
                  {month.policyCount} policies
                </p>
                
                {/* Action Button */}
                {!month.isLatest && (
                  <button className="text-xs text-blue-700 hover:text-blue-900 font-bold bg-white px-2 py-1 rounded shadow-sm hover:shadow-md transition-all">
                    View Archive →
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Scroll hint */}
          {availableMonths.length > 3 && (
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none flex items-center justify-end pr-2">
              <span className="text-gray-400 text-2xl">→</span>
            </div>
          )}
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <ArchiveConfirmationModal
          month={archiveMonthToOpen}
          onConfirm={handleConfirmArchive}
          onCancel={handleCancelArchive}
        />
      )}

      {/* Consolidated Summary: Tab Navigation + Stats */}
      <div className="bg-white rounded-lg shadow mb-6">
        {/* Tab Navigation */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('to-contact')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-all rounded-t-lg shadow-md ${
              activeTab === 'to-contact'
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:from-blue-50 hover:to-blue-100 hover:text-blue-700'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">🔵 To Contact</span>
              <span className="text-3xl font-bold drop-shadow-sm">{stats.toContact}</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('contacted')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-all rounded-t-lg shadow-md ${
              activeTab === 'contacted'
                ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:from-green-50 hover:to-green-100 hover:text-green-700'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">🟢 Contacted Today</span>
              <span className="text-3xl font-bold drop-shadow-sm">{stats.contactedToday}</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('total-contacted')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-all rounded-t-lg shadow-md ${
              activeTab === 'total-contacted'
                ? 'bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:from-teal-50 hover:to-teal-100 hover:text-teal-700'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">✅ Total Contacted</span>
              <span className="text-3xl font-bold drop-shadow-sm">{stats.totalContacted}</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('follow-up')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-all rounded-t-lg shadow-md ${
              activeTab === 'follow-up'
                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:from-orange-50 hover:to-orange-100 hover:text-orange-700'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">🟡 Follow-Up</span>
              <span className="text-3xl font-bold drop-shadow-sm">{stats.followUpToday}</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-4 text-center font-medium transition-all rounded-t-lg shadow-md ${
              activeTab === 'all'
                ? 'bg-gradient-to-br from-gray-500 to-gray-700 text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:from-gray-200 hover:to-gray-300 hover:text-gray-800'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold">⚪ All Policies</span>
              <span className="text-3xl font-bold drop-shadow-sm">{stats.totalPolicies}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search policy, name, NIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Lapsed">Lapsed</option>
            <option value="Paid Up">Paid Up</option>
          </select>

          {/* Arrears Filter */}
          <select
            value={arrearsFilter}
            onChange={(e) => setArrearsFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Arrears</option>
            <option value="high">High (&gt; 10,000)</option>
            <option value="medium">Medium (5,000 - 10,000)</option>
            <option value="low">Low (&lt; 5,000)</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="arrears_desc">Arrears (High to Low)</option>
            <option value="arrears_asc">Arrears (Low to High)</option>
            <option value="follow_up">Follow-Up Date</option>
            <option value="last_call">Last Call Date</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {Math.min(displayCount, filteredPolicies.length)} of {filteredPolicies.length} policies
        </div>
      </div>

      {/* Policy List */}
      <div className="space-y-4">
        {filteredPolicies.slice(0, displayCount).map((policy) => {
          const priority = getPriorityLevel(policy)
          const latestInteraction = policy.latestInteraction

          return (
            <div
              key={policy.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
              onClick={() => navigate(`/csl/policy/${policy.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{priority.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {policy.policy_number}
                    </h3>
                    <p className="text-gray-600">
                      {policy.owner1_first_name} {policy.owner1_surname}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  policy.policy_status === 'Active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {policy.policy_status}
                </span>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Arrears Amount</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(policy.arrears_amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {policy.installments_in_arrears} months overdue
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Premium Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(policy.real_nx_premium)}
                  </p>
                  <p className="text-xs text-gray-500">{policy.frequency}</p>
                </div>
              </div>

              {/* Interaction Info */}
              {latestInteraction && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Last Call:</span>
                    <span className="font-medium">
                      {getRelativeDate(latestInteraction.client_calling_date)}
                    </span>
                    {latestInteraction.outcome_1 && (
                      <span className="text-gray-500">
                        ({latestInteraction.outcome_1})
                      </span>
                    )}
                  </div>

                  {latestInteraction.follow_up_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Follow Up:</span>
                      <span className={`font-medium ${
                        new Date(latestInteraction.follow_up_date) < new Date()
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {getRelativeDate(latestInteraction.follow_up_date)}
                      </span>
                    </div>
                  )}

                  {/* Payment Info - Check both interaction payments and CSV uploads */}
                  {(() => {
                    // Check interaction payment
                    const interactionPayment = latestInteraction?.amount_paid_per_nic_system > 0
                      ? {
                          amount: latestInteraction.amount_paid_per_nic_system,
                          date: latestInteraction.client_calling_date,
                          source: 'interaction'
                        }
                      : null
                    
                    // Check CSV uploaded payment
                    const csvPayment = policy.latestPayment
                      ? {
                          amount: policy.latestPayment.payment_amount,
                          date: policy.latestPayment.payment_date,
                          source: 'upload'
                        }
                      : null
                    
                    // Use the most recent payment
                    let displayPayment = null
                    if (interactionPayment && csvPayment) {
                      displayPayment = new Date(interactionPayment.date) > new Date(csvPayment.date)
                        ? interactionPayment
                        : csvPayment
                    } else {
                      displayPayment = interactionPayment || csvPayment
                    }
                    
                    return displayPayment ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">
                          Payment Received: {formatCurrency(displayPayment.amount)}
                        </span>
                        <span className="text-gray-500">
                          ({formatDate(displayPayment.date)})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>No Recent Payment</span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {!latestInteraction && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>No interactions yet</span>
                  </div>
                </div>
              )}

              {/* View Details Button */}
              <div className="mt-4 pt-4 border-t">
                <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  View Details →
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {filteredPolicies.length > displayCount && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setDisplayCount(prev => prev + 5)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
          >
            Load 5 More ({filteredPolicies.length - displayCount} remaining)
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredPolicies.length === 0 && (
        <div className="text-center py-12">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No policies found</h3>
          <p className="text-gray-600">Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  )
}
