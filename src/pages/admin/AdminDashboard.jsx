import { Link } from 'react-router-dom'
import { Upload, BarChart3, Users, FileText } from 'lucide-react'

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage system data and view analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upload Data Card */}
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
              <p className="text-sm text-gray-600">Import customer data from CSV files</p>
            </div>
          </div>
        </Link>

        {/* Reports Card */}
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
              <p className="text-sm text-gray-600">View agent performance and analytics</p>
            </div>
          </div>
        </Link>

        {/* Agent Management Card */}
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
              <p className="text-sm text-gray-600">View and manage agent accounts</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Admin</div>
            <div className="text-sm text-gray-600">System Role</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Active</div>
            <div className="text-sm text-gray-600">System Status</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">Full Access</div>
            <div className="text-sm text-gray-600">Permissions</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard