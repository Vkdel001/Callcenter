import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { agentApi, branchApi } from '../../services/apiClient'
import { Users, Mail, Shield, CheckCircle, XCircle, Edit, Building2, X } from 'lucide-react'

const AgentManagement = () => {
  const queryClient = useQueryClient()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: agents = [], isLoading } = useQuery(
    'agents',
    async () => {
      const response = await agentApi.get('/nic_cc_agent')
      return response.data || []
    }
  )

  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery(
    'branches',
    async () => {
      try {
        const response = await branchApi.get('/nic_cc_branch')
        return response.data || []
      } catch (error) {
        return []
      }
    }
  )

  // Update agent mutation
  const updateAgentMutation = useMutation(
    async (agentData) => {
      return await agentApi.patch(`/nic_cc_agent/${editingAgent.id}`, agentData)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents')
        setShowEditModal(false)
        setEditingAgent(null)
        reset()
        alert('Agent updated successfully!')
      },
      onError: (error) => {
        alert(`Failed to update agent: ${error.message}`)
      }
    }
  )

  const handleEdit = (agent) => {
    setEditingAgent(agent)
    reset({
      agent_type: agent.agent_type || 'call_center',
      branch_id: agent.branch_id || ''
    })
    setShowEditModal(true)
  }

  const onSubmit = (data) => {
    updateAgentMutation.mutate({
      agent_type: data.agent_type,
      branch_id: data.branch_id || null
    })
  }

  const getBranchName = (branchId) => {
    if (!branchId) return 'All Branches'
    
    console.log('Looking for branch ID:', branchId, 'Type:', typeof branchId)
    console.log('Available branches:', branches.map(b => ({ id: b.id, name: b.name, idType: typeof b.id })))
    
    const branch = branches.find(b => b.id == branchId) // Use == instead of === for type flexibility
    return branch ? branch.name : `Unknown Branch (ID: ${branchId})`
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
        <p className="text-gray-600">View and manage call center agents</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">All Agents ({agents.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-500">ID: {agent.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{agent.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      agent.agent_type === 'internal' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {agent.agent_type === 'internal' ? 'Internal' : 'Call Center'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {getBranchName(agent.branch_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {agent.active ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-sm text-red-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.current_batch_size || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Agent Modal */}
      {showEditModal && editingAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Edit Agent: {editingAgent.name}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Type
                </label>
                <select
                  {...register('agent_type', { required: 'Agent type is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="call_center">Call Center Agent</option>
                  <option value="internal">Internal Agent</option>
                </select>
                {errors.agent_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.agent_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Assignment
                </label>
                <select
                  {...register('branch_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Branches (Call Center)</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Internal agents must be assigned to a specific branch
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateAgentMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateAgentMutation.isLoading ? 'Updating...' : 'Update Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentManagement