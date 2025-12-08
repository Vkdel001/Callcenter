import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { cslDropdownService } from '../../../services/csl/cslDropdownService'
import { Plus, Edit, Trash2, Check, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'

const CSLDropdownConfig = () => {
  const { user } = useAuth()
  const [selectedField, setSelectedField] = useState('outcome_1')
  const [options, setOptions] = useState([])
  const [allOptions, setAllOptions] = useState({})
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingOption, setEditingOption] = useState(null)
  const [formData, setFormData] = useState({
    fieldName: '',
    optionValue: '',
    optionLabel: '',
    parentOptionId: null,
    displayOrder: 0,
    isActive: true
  })

  // Available fields for CSL
  const fieldOptions = [
    { value: 'outcome_1', label: 'Outcome 1' },
    { value: 'sub_outcome', label: 'Sub-Outcome' },
    { value: 'recovery_type', label: 'Recovery Type' },
    { value: 'standing_order_status', label: 'Standing Order Status' },
    { value: 'reason_for_non_payment', label: 'Reason for Non-Payment' },
    { value: 'mode_of_payment', label: 'Mode of Payment' },
    { value: 'promise_to_pay_week', label: 'Promise to Pay Week' },
    { value: 'frequency', label: 'Frequency' }
  ]

  useEffect(() => {
    loadAllOptions()
  }, [])

  useEffect(() => {
    if (selectedField && allOptions[selectedField]) {
      setOptions(allOptions[selectedField])
    }
  }, [selectedField, allOptions])

  const loadAllOptions = async () => {
    setLoading(true)
    try {
      const grouped = await cslDropdownService.getOptionsGroupedByField()
      setAllOptions(grouped)
    } catch (error) {
      console.error('Failed to load options:', error)
      alert('Failed to load dropdown options')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    setEditingOption(null)
    setFormData({
      fieldName: selectedField,
      optionValue: '',
      optionLabel: '',
      parentOptionId: null,
      displayOrder: options.length,
      isActive: true
    })
    setShowModal(true)
  }

  const handleEdit = (option) => {
    setEditingOption(option)
    setFormData({
      fieldName: option.field_name,
      optionValue: option.option_value,
      optionLabel: option.option_label,
      parentOptionId: option.parent_option_id,
      displayOrder: option.display_order,
      isActive: option.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (option) => {
    if (!confirm(`Are you sure you want to delete "${option.option_label}"?`)) {
      return
    }

    try {
      await cslDropdownService.deleteOption(option.id)
      alert('Option deleted successfully')
      await loadAllOptions()
    } catch (error) {
      console.error('Failed to delete option:', error)
      alert('Failed to delete option')
    }
  }

  const handleToggleActive = async (option) => {
    try {
      await cslDropdownService.toggleActive(option.id, !option.is_active)
      await loadAllOptions()
    } catch (error) {
      console.error('Failed to toggle option:', error)
      alert('Failed to toggle option status')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingOption) {
        await cslDropdownService.updateOption(editingOption.id, formData)
        alert('Option updated successfully')
      } else {
        await cslDropdownService.createOption(formData)
        alert('Option created successfully')
      }
      
      setShowModal(false)
      await loadAllOptions()
    } catch (error) {
      console.error('Failed to save option:', error)
      alert('Failed to save option')
    }
  }

  const autoGenerateValue = (label) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
  }

  const handleLabelChange = (label) => {
    setFormData(prev => ({
      ...prev,
      optionLabel: label,
      optionValue: prev.optionValue || autoGenerateValue(label)
    }))
  }

  // Check if user has admin access
  if (!user || (user.role !== 'admin' && user.role !== 'life_admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSL Dropdown Configuration</h1>
          <p className="text-gray-600">Manage dropdown options for CSL interaction forms</p>
        </div>
      </div>

      {/* Field Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Field to Manage
        </label>
        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          {fieldOptions.map(field => (
            <option key={field.value} value={field.value}>
              {field.label} ({allOptions[field.value]?.length || 0} options)
            </option>
          ))}
        </select>
      </div>

      {/* Options List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            {fieldOptions.find(f => f.value === selectedField)?.label} Options
          </h2>
          <button
            onClick={handleAddNew}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No options configured for this field</p>
              <button
                onClick={handleAddNew}
                className="mt-4 text-primary-600 hover:text-primary-800"
              >
                Add your first option
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    option.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${option.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                          {option.option_label}
                        </span>
                        {option.parent_option_id && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Sub-option
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Value: {option.option_value}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(option)}
                      className={`p-2 rounded ${
                        option.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={option.is_active ? 'Active' : 'Inactive'}
                    >
                      {option.is_active ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(option)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(option)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingOption ? 'Edit Option' : 'Add New Option'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field
                </label>
                <input
                  type="text"
                  value={fieldOptions.find(f => f.value === formData.fieldName)?.label || formData.fieldName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Option Label *
                </label>
                <input
                  type="text"
                  value={formData.optionLabel}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Successfully Contacted"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Option Value *
                </label>
                <input
                  type="text"
                  value={formData.optionValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, optionValue: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., successfully_contacted"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use lowercase with underscores (auto-generated from label)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
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
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingOption ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CSLDropdownConfig
