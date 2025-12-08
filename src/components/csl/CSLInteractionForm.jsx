import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { cslService } from '../../services/csl/cslService'
import { 
  Send,
  AlertCircle,
  Loader
} from 'lucide-react'

export default function CSLInteractionForm({ policy, onSuccess, onCancel }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dropdownOptions, setDropdownOptions] = useState({})
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    client_calling_date: new Date().toISOString().split('T')[0],
    calling_remarks: '',
    outcome_1: '',
    sub_outcome: '',
    
    // Step 2: Recovery Details
    recovery_type: '',
    amount_paid: '',
    amount_paid_per_nic_system: '',
    mode_of_payment: '',
    reason_for_non_payment: '',
    
    // Step 3: Promise to Pay & Standing Order
    ptp_case: false,
    promise_to_pay_amount: '',
    promise_to_pay_week: '',
    standing_order_status: '',
    request_for_aod: false,
    
    // Step 4: Follow Up & Contact Updates
    follow_up_date: '',
    updated_contact: '',
    updated_email: '',
    updated_frequency: '',
    
  })

  useEffect(() => {
    loadDropdownOptions()
  }, [])

  const loadDropdownOptions = async () => {
    try {
      const fields = [
        'outcome_1',
        'sub_outcome',
        'recovery_type',
        'standing_order_status',
        'reason_for_non_payment',
        'mode_of_payment',
        'promise_to_pay_week',
        'frequency'
      ]

      const options = {}
      for (const field of fields) {
        const fieldOptions = await cslService.dropdown.getOptionsForField(field, true)
        options[field] = fieldOptions
      }

      setDropdownOptions(options)
    } catch (err) {
      console.error('Error loading dropdown options:', err)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear sub_outcome if outcome_1 changes
    if (field === 'outcome_1') {
      setFormData(prev => ({
        ...prev,
        sub_outcome: ''
      }))
    }
  }

  const getSubOutcomeOptions = () => {
    if (!formData.outcome_1 || !dropdownOptions.outcome_1) return []
    
    const selectedOutcome = dropdownOptions.outcome_1.find(
      opt => opt.option_value === formData.outcome_1
    )
    
    if (!selectedOutcome) return []
    
    return dropdownOptions.sub_outcome?.filter(
      opt => opt.parent_option_id === selectedOutcome.id
    ) || []
  }

  const validateForm = () => {
    if (!formData.client_calling_date) {
      setError('Calling date is required')
      return false
    }
    if (!formData.outcome_1) {
      setError('Outcome is required')
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async () => {
    console.log('🔵 Save Interaction clicked')
    console.log('📋 Form data:', formData)
    console.log('👤 User:', user)
    console.log('📄 Policy:', policy)
    
    if (!validateForm()) {
      console.log('❌ Validation failed')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create interaction - transform to camelCase for service
      const interactionData = {
        policyId: policy.id,
        agentId: user.id,
        callingDate: formData.client_calling_date,
        remarks: formData.calling_remarks,
        outcome1: formData.outcome_1,
        subOutcome: formData.sub_outcome,
        recoveryType: formData.recovery_type,
        amountPaid: formData.amount_paid ? parseFloat(formData.amount_paid) : 0,
        amountPaidPerNicSystem: formData.amount_paid_per_nic_system ? parseFloat(formData.amount_paid_per_nic_system) : 0,
        modeOfPayment: formData.mode_of_payment,
        reasonForNonPayment: formData.reason_for_non_payment,
        ptpCase: formData.ptp_case === true || formData.ptp_case === 'true',
        promiseToPayAmount: formData.promise_to_pay_amount ? parseFloat(formData.promise_to_pay_amount) : 0,
        promiseToPayWeek: formData.promise_to_pay_week,
        standingOrderStatus: formData.standing_order_status,
        requestForAod: formData.request_for_aod === true || formData.request_for_aod === 'true',
        followUpDate: formData.follow_up_date || null,
        updatedContact: formData.updated_contact,
        updatedEmail: formData.updated_email,
        updatedFrequency: formData.updated_frequency
      }

      console.log('📤 Sending interaction data:', interactionData)

      // Create interaction
      const result = await cslService.interaction.createInteraction(interactionData)
      console.log('✅ Interaction created successfully:', result)

      // Auto-assign policy to agent if it's unassigned
      if (!policy.assigned_to_agent_id) {
        console.log(`🔄 Auto-assigning policy ${policy.id} to agent ${user.id}`)
        await cslService.policy.assignPolicyToAgent(policy.id, user.id)
        console.log(`✅ Policy ${policy.policy_number} assigned to agent`)
      }

      // Success
      console.log('✅ Calling onSuccess callback')
      if (onSuccess) onSuccess()

    } catch (err) {
      console.error('❌ Error submitting interaction:', err)
      console.error('❌ Error details:', err.response?.data)
      
      // Extract detailed error message
      let errorMessage = 'Failed to save interaction. Please try again.'
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900">Log Call Interaction</h2>
        <p className="text-gray-600 mt-1">Record call details and outcomes</p>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Single Page Form - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Call Details */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Call Details</h3>
            
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calling Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.client_calling_date}
                onChange={(e) => handleChange('client_calling_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Outcome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outcome <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.outcome_1}
                onChange={(e) => handleChange('outcome_1', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select outcome...</option>
                {dropdownOptions.outcome_1?.map(opt => (
                  <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                ))}
              </select>
            </div>

            {/* Sub-Outcome */}
            {formData.outcome_1 && getSubOutcomeOptions().length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Outcome</label>
                <select
                  value={formData.sub_outcome}
                  onChange={(e) => handleChange('sub_outcome', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select sub-outcome...</option>
                  {getSubOutcomeOptions().map(opt => (
                    <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={formData.calling_remarks}
                onChange={(e) => handleChange('calling_remarks', e.target.value)}
                rows={2}
                placeholder="Call details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Follow-Up Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Follow-Up Date</label>
              <input
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => handleChange('follow_up_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right Column: Recovery & Payment */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Recovery & Payment</h3>
            
            {/* Recovery Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recovery Type</label>
              <select
                value={formData.recovery_type}
                onChange={(e) => handleChange('recovery_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {dropdownOptions.recovery_type?.map(opt => (
                  <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                ))}
              </select>
            </div>

            {/* Amount Paid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid</label>
              <input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => handleChange('amount_paid', e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                step="0.01"
              />
            </div>

            {/* Mode of Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode of Payment</label>
              <select
                value={formData.mode_of_payment}
                onChange={(e) => handleChange('mode_of_payment', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {dropdownOptions.mode_of_payment?.map(opt => (
                  <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                ))}
              </select>
            </div>

            {/* PTP Case */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ptp_case}
                  onChange={(e) => handleChange('ptp_case', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium text-sm text-gray-900">Promise to Pay (PTP)</span>
              </label>
              
              {formData.ptp_case && (
                <div className="mt-2 space-y-2">
                  <input
                    type="number"
                    value={formData.promise_to_pay_amount}
                    onChange={(e) => handleChange('promise_to_pay_amount', e.target.value)}
                    placeholder="PTP Amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    step="0.01"
                  />
                  <select
                    value={formData.promise_to_pay_week}
                    onChange={(e) => handleChange('promise_to_pay_week', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select week...</option>
                    {dropdownOptions.promise_to_pay_week?.map(opt => (
                      <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* AOD Request */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.request_for_aod}
                  onChange={(e) => handleChange('request_for_aod', e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="font-medium text-sm text-gray-900">Request AOD</span>
              </label>
            </div>
          </div>
        </div>

        {/* Contact Update Section - Full Width */}
        <div className="mt-4 border-t pt-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Update Contact Info (Optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Updated Mobile Number
              </label>
              <input
                type="tel"
                value={formData.updated_contact}
                onChange={(e) => handleChange('updated_contact', e.target.value)}
                placeholder="57372333"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Updated Email
              </label>
              <input
                type="email"
                value={formData.updated_email}
                onChange={(e) => handleChange('updated_email', e.target.value)}
                placeholder="customer@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Updated Frequency
              </label>
              <select
                value={formData.updated_frequency}
                onChange={(e) => handleChange('updated_frequency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No change...</option>
                {dropdownOptions.frequency?.map(opt => (
                  <option key={opt.id} value={opt.option_value}>{opt.option_label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-white">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Save Interaction</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
