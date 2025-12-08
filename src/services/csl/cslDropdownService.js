import axios from 'axios'

// Xano configuration
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io'
const CSL_DROPDOWN_API_KEY = 'Vt4NeKr2'

// Create API client for CSL dropdowns
const createCSLDropdownClient = () => {
  const client = axios.create({
    baseURL: `${XANO_BASE_URL}/api:${CSL_DROPDOWN_API_KEY}`,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return client
}

const cslDropdownApi = createCSLDropdownClient()

/**
 * CSL Dropdown Service
 * Manages configurable dropdown options for CSL interaction forms
 */
class CSLDropdownService {
  
  /**
   * Get all dropdown options for a specific field
   * @param {string} fieldName - Field name (e.g., 'outcome_1', 'recovery_type')
   * @param {boolean} activeOnly - Return only active options
   * @returns {Promise<Array>} Array of dropdown options
   */
  async getOptionsForField(fieldName, activeOnly = true) {
    try {
      const response = await cslDropdownApi.get('/csl_dropdown_options')
      const allOptions = response.data || []
      
      // Filter by field name
      let options = allOptions.filter(opt => opt.field_name === fieldName)
      
      // Filter by active status if requested
      if (activeOnly) {
        options = options.filter(opt => opt.is_active)
      }
      
      // Sort by display_order
      options.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      
      return options
    } catch (error) {
      console.error(`Failed to get options for field ${fieldName}:`, error)
      return []
    }
  }
  
  /**
   * Get child options for a parent option (for dependent dropdowns)
   * @param {number} parentOptionId - Parent option ID
   * @param {boolean} activeOnly - Return only active options
   * @returns {Promise<Array>} Array of child options
   */
  async getChildOptions(parentOptionId, activeOnly = true) {
    try {
      const response = await cslDropdownApi.get('/csl_dropdown_options')
      const allOptions = response.data || []
      
      // Filter by parent_option_id
      let options = allOptions.filter(opt => opt.parent_option_id === parentOptionId)
      
      // Filter by active status if requested
      if (activeOnly) {
        options = options.filter(opt => opt.is_active)
      }
      
      // Sort by display_order
      options.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      
      return options
    } catch (error) {
      console.error(`Failed to get child options for parent ${parentOptionId}:`, error)
      return []
    }
  }
  
  /**
   * Get all dropdown options (for admin management)
   * @returns {Promise<Array>} Array of all dropdown options
   */
  async getAllOptions() {
    try {
      const response = await cslDropdownApi.get('/csl_dropdown_options')
      return response.data || []
    } catch (error) {
      console.error('Failed to get all dropdown options:', error)
      return []
    }
  }
  
  /**
   * Create a new dropdown option
   * @param {Object} optionData - Option data
   * @returns {Promise<Object>} Created option
   */
  async createOption(optionData) {
    try {
      const response = await cslDropdownApi.post('/csl_dropdown_options', {
        field_name: optionData.fieldName,
        option_value: optionData.optionValue,
        option_label: optionData.optionLabel,
        parent_option_id: optionData.parentOptionId || null,
        display_order: optionData.displayOrder || 0,
        is_active: optionData.isActive !== undefined ? optionData.isActive : true
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to create dropdown option:', error)
      throw error
    }
  }
  
  /**
   * Update an existing dropdown option
   * @param {number} id - Option ID
   * @param {Object} optionData - Updated option data
   * @returns {Promise<Object>} Updated option
   */
  async updateOption(id, optionData) {
    try {
      const updatePayload = {}
      
      if (optionData.fieldName !== undefined) updatePayload.field_name = optionData.fieldName
      if (optionData.optionValue !== undefined) updatePayload.option_value = optionData.optionValue
      if (optionData.optionLabel !== undefined) updatePayload.option_label = optionData.optionLabel
      if (optionData.parentOptionId !== undefined) updatePayload.parent_option_id = optionData.parentOptionId
      if (optionData.displayOrder !== undefined) updatePayload.display_order = optionData.displayOrder
      if (optionData.isActive !== undefined) updatePayload.is_active = optionData.isActive
      
      const response = await cslDropdownApi.patch(`/csl_dropdown_options/${id}`, updatePayload)
      return response.data
    } catch (error) {
      console.error('Failed to update dropdown option:', error)
      throw error
    }
  }
  
  /**
   * Delete a dropdown option
   * @param {number} id - Option ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteOption(id) {
    try {
      await cslDropdownApi.delete(`/csl_dropdown_options/${id}`)
      return true
    } catch (error) {
      console.error('Failed to delete dropdown option:', error)
      throw error
    }
  }
  
  /**
   * Toggle active status of an option
   * @param {number} id - Option ID
   * @param {boolean} isActive - New active status
   * @returns {Promise<Object>} Updated option
   */
  async toggleActive(id, isActive) {
    try {
      return await this.updateOption(id, { isActive })
    } catch (error) {
      console.error('Failed to toggle option active status:', error)
      throw error
    }
  }
  
  /**
   * Reorder options for a field
   * @param {string} fieldName - Field name
   * @param {Array} orderArray - Array of {id, display_order} objects
   * @returns {Promise<boolean>} Success status
   */
  async reorderOptions(fieldName, orderArray) {
    try {
      // Update each option's display_order
      const updatePromises = orderArray.map(item =>
        this.updateOption(item.id, { displayOrder: item.display_order })
      )
      
      await Promise.all(updatePromises)
      return true
    } catch (error) {
      console.error('Failed to reorder options:', error)
      throw error
    }
  }
  
  /**
   * Get list of all unique field names
   * @returns {Promise<Array>} Array of field names
   */
  async getFieldNames() {
    try {
      const allOptions = await this.getAllOptions()
      const fieldNames = [...new Set(allOptions.map(opt => opt.field_name))]
      return fieldNames.sort()
    } catch (error) {
      console.error('Failed to get field names:', error)
      return []
    }
  }
  
  /**
   * Get options grouped by field name
   * @returns {Promise<Object>} Object with field names as keys
   */
  async getOptionsGroupedByField() {
    try {
      const allOptions = await this.getAllOptions()
      const grouped = {}
      
      allOptions.forEach(option => {
        if (!grouped[option.field_name]) {
          grouped[option.field_name] = []
        }
        grouped[option.field_name].push(option)
      })
      
      // Sort each group by display_order
      Object.keys(grouped).forEach(fieldName => {
        grouped[fieldName].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      })
      
      return grouped
    } catch (error) {
      console.error('Failed to get grouped options:', error)
      return {}
    }
  }
}

export const cslDropdownService = new CSLDropdownService()
export default cslDropdownService
