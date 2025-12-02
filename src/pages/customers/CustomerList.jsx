import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { customerService } from '../../services/customerService'
import { Search, Eye } from 'lucide-react'
import { formatCurrencyShort } from '../../utils/currency'

const CustomerList = () => {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // For internal agents, fetch ALL branch customers; for others, fetch assigned customers
  const { data: customers = [], isLoading } = useQuery(
    ['customers', user?.id, user?.agent_type],
    async () => {
      if (user?.agent_type === 'internal') {
        // Internal agents: Get ALL customers from their branch
        return customerService.getAllBranchCustomers(user?.id)
      } else {
        // Call center agents: Get assigned customers only
        return customerService.getAssignedCustomers(user?.id)
      }
    },
    { enabled: !!user?.id }
  )

  // Sort and filter customers
  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.mobile.includes(searchTerm)

      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      // Sort by amount due (descending - highest first)
      return (b.amountDue || 0) - (a.amountDue || 0)
    })

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      contacted: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      unreachable: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {status}
      </span>
    )
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Customer List</h1>
        <div className="text-sm text-gray-600">
          {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>

      {/* Filters - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-4">
          <div className="mobile-full-width">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-base"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mobile-full-width px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-base"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="resolved">Resolved</option>
            <option value="unreachable">Unreachable</option>
          </select>
        </div>
      </div>

      {/* Desktop Table - Hidden on Mobile */}
      <div className="bg-white rounded-lg shadow overflow-hidden desktop-table hidden md:block">
        <div className="overflow-x-auto" style={{ maxHeight: user?.agent_type === 'internal' ? '600px' : 'none', overflowY: user?.agent_type === 'internal' ? 'auto' : 'visible' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Policy Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Last call: {customer.lastCallDate || 'Never'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.policyNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.mobile}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrencyShort(customer.amountDue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(customer.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.attempts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="text-primary-600 hover:text-primary-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards - Shown on Mobile Only */}
      <div className="mobile-cards block md:hidden space-y-4" style={{ maxHeight: user?.agent_type === 'internal' ? '600px' : 'none', overflowY: user?.agent_type === 'internal' ? 'auto' : 'visible' }}>
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 customer-item">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {customer.name}
                </h3>
                <p className="text-sm text-gray-600">{customer.policyNumber}</p>
              </div>
              <div className="ml-3">
                {getStatusBadge(customer.status)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium w-20">Mobile:</span>
                <a href={`tel:${customer.mobile}`} className="text-blue-600 hover:text-blue-800">
                  {customer.mobile}
                </a>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium w-20">Email:</span>
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-800 truncate">
                  {customer.email}
                </a>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium w-20">Amount:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrencyShort(customer.amountDue)}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium w-20">Attempts:</span>
                <span>{customer.attempts}</span>
              </div>
              {customer.lastCallDate && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium w-20">Last call:</span>
                  <span>{customer.lastCallDate}</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <Link
                to={`/customers/${customer.id}`}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium text-center hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* No customers message for mobile cards */}
      {filteredCustomers.length === 0 && (
        <div className="mobile-cards block md:hidden">
          <div className="text-center py-12">
            <p className="text-gray-500">No customers found matching your criteria.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerList