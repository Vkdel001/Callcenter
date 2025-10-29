import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { Upload, BarChart3, Users, FileText, TrendingUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { customerService } from '../../services/customerService'

const AdminDashboard = () => {
  const { user } = useAuth()
  
  // Get LOB-specific customer data
  const { data: customers = [], isLoading } = useQuery(
    ['adminCustomers', user?.admin_lob],
    () => customerService.getCustomersForAdmin(user),
    { enabled: !!user?.admin_lob }
  )

  // Calculate LOB-specific metrics
  const metrics = {
    totalCustomers: customers.length,
    totalAmountDue: customers.reduce((sum, c) => sum + (c.amountDue || 0), 0),
    pendingCustomers: customers.filter(c => c.status === 'pending').length,
    avgAmountDue: customers.length > 0 ? customers.reduce((sum, c) => sum + (c.amountDue || 0), 0) / customers.length : 0
  }

  // Get admin type display info
  const getAdminInfo = () => {
    switch (user?.admin_lob) {
      case 'super_admin':
        return { title: 'Super Admin Dashboard', subtitle: 'Complete system access', color: 'blue' }
      case 'life':
        return { title: 'Life Insurance Admin', subtitle: 'Life insurance customers only', color: 'green' }
      case 'motor':
        return { title: 'Motor Insurance Admin', subtitle: 'Motor insurance customers only', color: 'orange' }
      case 'health':
        return { title: 'Health Insurance Admin', subtitle: 'Health insurance customers only', color: 'blue' }
      case 'call_center':
        return { title: 'Call Center Admin', subtitle: 'Call center exclusive data', color: 'purple' }
      default:
        return { title: 'Admin Dashboard', subtitle: 'System administration', color: 'gray' }
    }
  }

  const adminInfo = getAdminInfo()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{adminInfo.title}</h1>
        <p className="text-gray-600">{adminInfo.subtitle}</p>
        {user?.admin_lob && (
          <div className="mt-2">
            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full bg-${adminInfo.color}-100 text-${adminInfo.color}-800`}>
              {user.admin_lob.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload Data Card - Available to all admins */}
        <Link
          to="/admin/upload"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Data</h3>
              <p className="text-sm text-gray-600">
                {user?.admin_lob === 'super_admin' 
                  ? 'Import any LOB customer data' 
                  : `Import ${user?.admin_lob || 'customer'} data only`}
              </p>
            </div>
          </div>
        </Link>

        {/* Reports Card - Available to all admins */}
        <Link
          to="/admin/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Reports</h3>
              <p className="text-sm text-gray-600">
                {user?.admin_lob === 'super_admin' 
                  ? 'System-wide analytics and reports' 
                  : `${user?.admin_lob || 'LOB'} specific analytics`}
              </p>
            </div>
          </div>
        </Link>

        {/* Agent Management Card - Only Life Admin and Super Admin */}
        {(user?.admin_lob === 'life' || user?.admin_lob === 'super_admin') && (
          <Link
            to="/admin/agents"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Agents</h3>
                <p className="text-sm text-gray-600">
                  {user?.admin_lob === 'super_admin' 
                    ? 'Manage all system agents' 
                    : 'Manage sales and internal agents'}
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* LOB-Specific Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {user?.admin_lob === 'super_admin' ? 'System Overview' : `${adminInfo.title} Metrics`}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalCustomers}</div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                MUR {metrics.totalAmountDue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Amount Due</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{metrics.pendingCustomers}</div>
              <div className="text-sm text-gray-600">Pending Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                MUR {Math.round(metrics.avgAmountDue).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Avg Amount Due</div>
            </div>
          </div>
        )}
      </div>

      {/* Admin Actions - Conditional based on admin type */}
      {user?.admin_lob && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Available Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Upload Data - Available to all admins */}
            <div className="flex items-center p-4 border border-gray-200 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <div className="font-medium">Data Upload</div>
                <div className="text-sm text-gray-600">
                  {user.admin_lob === 'super_admin' 
                    ? 'Upload any LOB data' 
                    : `Upload ${user.admin_lob} data only`}
                </div>
              </div>
            </div>

            {/* Agent Management - Only Life Admin and Super Admin */}
            {(user.admin_lob === 'life' || user.admin_lob === 'super_admin') && (
              <div className="flex items-center p-4 border border-gray-200 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 mr-3" />
                <div>
                  <div className="font-medium">Agent Management</div>
                  <div className="text-sm text-gray-600">
                    {user.admin_lob === 'super_admin' ? 'Manage all agents' : 'Manage sales & internal agents'}
                  </div>
                </div>
              </div>
            )}

            {/* Reports - Available to all admins */}
            <div className="flex items-center p-4 border border-gray-200 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <div className="font-medium">Reports</div>
                <div className="text-sm text-gray-600">
                  {user.admin_lob === 'super_admin' 
                    ? 'System-wide analytics' 
                    : `${user.admin_lob} specific reports`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard