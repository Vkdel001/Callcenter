import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { agentApi, branchApi } from '../../services/apiClient'
import { Users, Mail, Shield, CheckCircle, XCircle, Edit, Building2, X, Plus, Trash2, Key, Copy } from 'lucide-react'
import { generatePassword, copyToClipboard } from '../../utils/passwordUtils'

const AgentManagement = () => {
  const queryClient = useQueryClient()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [deletingAgent, setDeletingAgent] = useState(null)
  const [resettingAgent, setResettingAgent] = useState(null)
  const [generatedPassword, setGeneratedPassword] = useState(null)
  const [newPassword, setNewPassword] = useState(null)

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()

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

  // Create agent mutation
  const createAgentMutation = useMutation(
    async (agentData) => {
      return await agentApi.post('/nic_cc_agent', agentData)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents')
        setShowCreateModal(false)
        alert(`Agent created successfully!\n\nPassword: ${generatedPassword}\n\nPlease save this password - it won't be shown again.`)
        setGeneratedPassword(null)
        reset()
      },
      onError: (error) => {
        alert(`Failed to create agent: ${error.message}`)
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

  // Delete agent mutation
  const deleteAgentMutation = useMutation(
    async (agentId) => {
      return await agentApi.delete(`/nic_cc_agent/${agentId}`)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents')
        setShowDeleteModal(false)
        setDeletingAgent(null)
        alert('Agent deleted successfully!')
      },
      onError: (error) => {
        alert(`Failed to delete agent: ${error.message}`)
      }
    }
  )

  // Reset password mutation
  const resetPasswordMutation = useMutation(
    async ({ agentId, newPassword }) => {
      return await agentApi.patch(`/nic_cc_agent/${agentId}`, {
        password_hash: newPassword
      })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('agents')
        alert('Password reset successfully! Make sure to save the new password.')
      },
      onError: (error) => {
        alert(`Failed to reset password: ${error.message}`)
      }
    }
  )

  const handleCreate = () => {
    reset({
      name: '',
      email: '',
      role: 'agent',
      agent_type: 'call_center',
      branch_id: '',
      sales_agent_id: '',
      admin_lob: '',
      active: true
    })
    setShowCreateModal(true)
  }

  const handleEdit = (agent) => {
    setEditingAgent(agent)
    reset({
      name: agent.name,
      email: agent.email,
      role: agent.role || 'agent',
      agent_type: agent.agent_type || 'call_center',
      branch_id: agent.branch_id || '',
      sales_agent_id: agent.sales_agent_id || '',
      admin_lob: agent.admin_lob || '',
      active: agent.active !== false
    })
    setShowEditModal(true)
  }

  const handleDelete = (agent) => {
    setDeletingAgent(agent)
    setShowDeleteModal(true)
  }

  const handlePasswordReset = (agent) => {
    setResettingAgent(agent)
    const password = generatePassword()
    setNewPassword(password)
    setShowPasswordResetModal(true)
  }

  const onCreateSubmit = (data) => {
    // Check for duplicate email
    const emailExists = agents.some(agent => 
      agent.email.toLowerCase() === data.email.toLowerCase()
    )
    
    if (emailExists) {
      alert('Email already exists. Please use a different email.')
      return
    }

    const password = generatePassword()
    setGeneratedPassword(password)

    const agentData = {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password_hash: password,
      role: data.role,
      active: data.active,
      current_batch_size: 0,
      branch_id: data.branch_id ? parseInt(data.branch_id) : null,
      agent_type: data.agent_type,
      sales_agent_id: data.sales_agent_id?.trim() || null,
      admin_lob: data.admin_lob || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_logout_time: null
    }

    createAgentMutation.mutate(agentData)
  }

  const onEditSubmit = (data) => {
    // Check for duplicate email (excluding current agent)
    const emailExists = agents.some(agent => 
      agent.id !== editingAgent.id && 
      agent.email.toLowerCase() === data.email.toLowerCase()
    )
    
    if (emailExists) {
      alert('Email already exists. Please use a different email.')
      return
    }

    const agentData = {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      role: data.role,
      agent_type: data.agent_type,
      branch_id: data.branch_id ? parseInt(data.branch_id) : null,
      sales_agent_id: data.sales_agent_id?.trim() || null,
      admin_lob: data.admin_lob || null,
      active: data.active,
      updated_at: new Date().toISOString()
    }

    updateAgentMutation.mutate(agentData)
  }

  const confirmDelete = () => {
    if (deletingAgent) {
      deleteAgentMutation.mutate(deletingAgent.id)
    }
  }

  const confirmPasswordReset = () => {
    if (resettingAgent && newPassword) {
      resetPasswordMutation.mutate({
        agentId: resettingAgent.id,
        newPassword: newPassword
      })
    }
  }

  const handleCopyPassword = async () => {
    if (newPassword) {
      const success = await copyToClipboard(newPassword)
      if (success) {
        alert('Password copied to clipboard!')
      } else {
        alert('Failed to copy password. Please copy it manually.')
      }
    }
  }

  const getBranchName = (branchId) => {
    if (!branchId) return 'All Branches'
    const branch = branches.find(b => b.id == branchId)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Management</h1>
          <p className="text-gray-600">View and manage call center agents</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                    <span className="text-sm text-gray-900 capitalize">
                      {agent.role?.replace('_', ' ') || 'Agent'}
                    </span>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(agent)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit Agent"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePasswordReset(agent)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Agent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Create New Agent
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    {...register('name', { 
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                      maxLength: { value: 100, message: 'Name must be less than 100 characters' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email format'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="csr_agent">CSR Agent</option>
                    <option value="internal_agent">Internal Agent</option>
                    <option value="life_admin">Life Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Type *
                  </label>
                  <select
                    {...register('agent_type', { required: 'Agent type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="call_center">Call Center Agent</option>
                    <option value="sales_agent">Sales Agent</option>
                    <option value="csr_agent">CSR Agent</option>
                    <option value="internal">Internal Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    {...register('branch_id')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Branches</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Agent ID
                  </label>
                  <input
                    type="text"
                    {...register('sales_agent_id')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin LOB
                  </label>
                  <select
                    {...register('admin_lob')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">None</option>
                    <option value="life">Life Insurance</option>
                    <option value="health">Health Insurance</option>
                    <option value="motor">Motor Insurance</option>
                    <option value="nonmotor">Non-Motor Insurance</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('active')}
                    defaultChecked={true}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  ℹ️ Password will be auto-generated and displayed after creation
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAgentMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createAgentMutation.isLoading ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {showEditModal && editingAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
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

            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    {...register('name', { 
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                      maxLength: { value: 100, message: 'Name must be less than 100 characters' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email format'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="csr_agent">CSR Agent</option>
                    <option value="internal_agent">Internal Agent</option>
                    <option value="life_admin">Life Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Type *
                  </label>
                  <select
                    {...register('agent_type', { required: 'Agent type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="call_center">Call Center Agent</option>
                    <option value="sales_agent">Sales Agent</option>
                    <option value="csr_agent">CSR Agent</option>
                    <option value="internal">Internal Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    {...register('branch_id')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Branches</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Agent ID
                  </label>
                  <input
                    type="text"
                    {...register('sales_agent_id')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin LOB
                  </label>
                  <select
                    {...register('admin_lob')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">None</option>
                    <option value="life">Life Insurance</option>
                    <option value="health">Health Insurance</option>
                    <option value="motor">Motor Insurance</option>
                    <option value="nonmotor">Non-Motor Insurance</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('active')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Delete Agent
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-900 font-medium mb-2">
                  Are you sure you want to delete this agent?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-700">
                    <strong>Name:</strong> {deletingAgent.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {deletingAgent.email}
                  </p>
                </div>
                <p className="text-sm text-red-600">
                  This action cannot be undone. All agent data will be permanently removed from the system.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteAgentMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteAgentMutation.isLoading ? 'Deleting...' : 'Delete Agent'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && resettingAgent && newPassword && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Reset Password
              </h3>
              <button
                onClick={() => {
                  setShowPasswordResetModal(false)
                  setResettingAgent(null)
                  setNewPassword(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>Agent:</strong> {resettingAgent.name}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Email:</strong> {resettingAgent.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password:
                </label>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-2xl font-mono font-bold text-blue-900 text-center tracking-wider">
                    {newPassword}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCopyPassword}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </button>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Important:</strong> Save this password securely. It will not be shown again.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordResetModal(false)
                    setResettingAgent(null)
                    setNewPassword(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmPasswordReset()
                    setShowPasswordResetModal(false)
                    setResettingAgent(null)
                    setNewPassword(null)
                  }}
                  disabled={resetPasswordMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {resetPasswordMutation.isLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentManagement
