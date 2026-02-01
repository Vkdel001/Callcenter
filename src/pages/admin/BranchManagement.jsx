import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useForm } from 'react-hook-form'
import { agentApi, branchApi } from '../../services/apiClient'
import { Building2, Plus, Edit, Trash2, MapPin, Users, X, Mail } from 'lucide-react'

const BranchManagement = () => {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // Fetch branches
  const { data: branches = [], isLoading } = useQuery(
    'branches',
    async () => {
      try {
        const response = await branchApi.get('/nic_cc_branch')
        return response.data || []
      } catch (error) {
        console.error('Failed to fetch branches:', error)
        return []
      }
    }
  )

  // Fetch agents to show branch assignments
  const { data: agents = [] } = useQuery(
    'agents',
    async () => {
      const response = await agentApi.get('/nic_cc_agent')
      return response.data || []
    }
  )

  // Create/Update branch mutation
  const saveBranchMutation = useMutation(
    async (branchData) => {
      if (editingBranch) {
        return await branchApi.patch(`/nic_cc_branch/${editingBranch.id}`, branchData)
      } else {
        return await branchApi.post('/nic_cc_branch', branchData)
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('branches')
        setShowModal(false)
        setEditingBranch(null)
        reset()
        alert(editingBranch ? 'Branch updated successfully!' : 'Branch created successfully!')
      },
      onError: (error) => {
        alert(`Failed to save branch: ${error.message}`)
      }
    }
  )

  // Delete branch mutation
  const deleteBranchMutation = useMutation(
    async (branchId) => {
      return await branchApi.delete(`/nic_cc_branch/${branchId}`)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('branches')
        alert('Branch deleted successfully!')
      },
      onError: (error) => {
        alert(`Failed to delete branch: ${error.message}`)
      }
    }
  )

  const onSubmit = (data) => {
    saveBranchMutation.mutate({
      name: data.name,
      code: data.code.toUpperCase(),
      address: data.address || '',
      notification_email: data.notification_email || null,
      active: true
    })
  }

  const handleEdit = (branch) => {
    setEditingBranch(branch)
    reset({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      notification_email: branch.notification_email || ''
    })
    setShowModal(true)
  }

  const handleDelete = (branch) => {
    const agentsInBranch = agents.filter(agent => agent.branch_id === branch.id)

    if (agentsInBranch.length > 0) {
      alert(`Cannot delete branch "${branch.name}". ${agentsInBranch.length} agents are assigned to this branch. Please reassign them first.`)
      return
    }

    if (confirm(`Are you sure you want to delete "${branch.name}"?`)) {
      deleteBranchMutation.mutate(branch.id)
    }
  }

  const handleNewBranch = () => {
    setEditingBranch(null)
    reset()
    setShowModal(true)
  }

  const getAgentCount = (branchId) => {
    return agents.filter(agent => agent.branch_id === branchId).length
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-gray-600">Manage branches and their assignments</p>
        </div>

        <button
          onClick={handleNewBranch}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{branch.name}</h3>
                  <p className="text-sm text-gray-500">Code: {branch.code}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(branch)}
                  className="text-gray-400 hover:text-primary-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(branch)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {branch.address && (
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <MapPin className="h-4 w-4 mr-2" />
                {branch.address}
              </div>
            )}

            {branch.notification_email && (
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <Mail className="h-4 w-4 mr-2" />
                {branch.notification_email}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {getAgentCount(branch.id)} agents assigned
              </div>

              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${branch.active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                {branch.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}

        {branches.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No branches created yet</p>
            <button
              onClick={handleNewBranch}
              className="mt-2 text-primary-600 hover:text-primary-800"
            >
              Create your first branch
            </button>
          </div>
        )}
      </div>

      {/* Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  {...register('name', { required: 'Branch name is required' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Port Louis Branch"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <input
                  {...register('code', {
                    required: 'Branch code is required',
                    pattern: {
                      value: /^[A-Z0-9]{2,5}$/i,
                      message: 'Code must be 2-5 characters (letters/numbers only)'
                    }
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., PL"
                  maxLength="5"
                />
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Branch address (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Email
                </label>
                <input
                  {...register('notification_email', {
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email format'
                    }
                  })}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="branch@nicl.mu (optional)"
                />
                {errors.notification_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.notification_email.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Group email for payment notifications (e.g., portlouis@nicl.mu)
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveBranchMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveBranchMutation.isLoading
                    ? 'Saving...'
                    : editingBranch
                      ? 'Update Branch'
                      : 'Create Branch'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchManagement