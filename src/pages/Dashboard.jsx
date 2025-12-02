import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import { customerService } from '../services/customerService'
import { Users, Phone, DollarSign, Clock, RefreshCw } from 'lucide-react'
import { formatCurrencyShort } from '../utils/currency'
import LOBDashboard from '../components/sales/LOBDashboard'

const Dashboard = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Make customerService available for testing
  if (import.meta.env.DEV) {
    window.customerService = customerService
    window.currentUser = user
  }
  
  // Debug: Log user data to see what we have
  console.log('Dashboard - User data:', user)
  console.log('Dashboard - Agent type:', user?.agent_type)
  console.log('Dashboard - Sales agent ID:', user?.sales_agent_id)
  
  // Check if user should use LOB Dashboard (sales agent or CSR)
  const useLOBDashboard = user?.agent_type === 'sales_agent' || user?.agent_type === 'csr'
  
  console.log('Dashboard - Use LOB Dashboard:', useLOBDashboard, 'Agent type:', user?.agent_type)
  
  // If sales agent or CSR, show LOB dashboard instead
  if (useLOBDashboard) {
    return <LOBDashboard />
  }
  
  const { data: customers = [], isLoading } = useQuery(
    ['customers', user?.id],
    () => customerService.getAssignedCustomers(user?.id),
    { enabled: !!user?.id }
  )

  const { data: dashboardStats = {}, isLoading: statsLoading } = useQuery(
    ['dashboardStats', user?.id],
    () => customerService.getDashboardStats(user?.id),
    { enabled: !!user?.id }
  )

  const fetchNext10Mutation = useMutation(
    () => customerService.fetchNext10Customers(user?.id),
    {
      onSuccess: (result) => {
        if (result.success) {
          queryClient.invalidateQueries(['customers', user?.id])
          alert(`✅ ${result.message}`)
        } else {
          alert(`❌ ${result.message || result.error}`)
        }
      },
      onError: (error) => {
        alert(`❌ Failed to fetch customers: ${error.message}`)
      }
    }
  )

  const stats = {
    totalCustomers: dashboardStats.totalAssigned || customers.length,
    pendingCalls: customers.filter(c => c.status === 'pending').length,
    totalDue: customers.reduce((sum, c) => sum + c.amountDue, 0),
    contactedToday: dashboardStats.contactedToday || 0
  }

  const StatCard = ({ icon: Icon, title, value, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-md bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-gray-600">
            Here's your call center dashboard overview
          </p>
        </div>
        
        {/* Hide "Fetch Next 10" button for internal agents */}
        {user?.agent_type !== 'internal' && (
          <button
            onClick={() => fetchNext10Mutation.mutate()}
            disabled={fetchNext10Mutation.isLoading || customers.length >= 4}
            className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${fetchNext10Mutation.isLoading ? 'animate-spin' : ''}`} />
            {customers.length >= 4 
              ? 'Complete current customers first' 
              : fetchNext10Mutation.isLoading 
                ? 'Fetching...' 
                : 'Fetch Next 10 Customers'
            }
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Assigned Customers"
          value={stats.totalCustomers}
          color="blue"
        />
        <StatCard
          icon={Phone}
          title="Pending Calls"
          value={stats.pendingCalls}
          color="yellow"
        />
        <StatCard
          icon={DollarSign}
          title="Total Due Amount"
          value={formatCurrencyShort(stats.totalDue)}
          color="green"
        />
        <StatCard
          icon={Clock}
          title="Contacted Today"
          value={stats.contactedToday}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Recent Customer Activity
          </h2>
        </div>
        <div className="p-6">
          {customers.slice(0, 5).map((customer) => (
            <div key={customer.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">Policy: {customer.policyNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrencyShort(customer.amountDue)}</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  customer.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : customer.status === 'contacted'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard