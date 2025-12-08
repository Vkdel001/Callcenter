import axios from 'axios'

// Xano configuration for CSL tables
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io'

// CSL API endpoints
const CSL_API_KEYS = {
  policies: 'WCN7osGn',
  interactions: 'jwfdvZTP',
  payments: 'mHkBSlF2',
  dropdowns: 'Vt4NeKr2',
  history: 'IoDyIxsz',
  uploads: 'YRN-L6tC'
}

// Create API client for CSL policies
const createCSLClient = (apiKey) => {
  const client = axios.create({
    baseURL: `${XANO_BASE_URL}/api:${apiKey}`,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
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

// Create CSL API clients
const cslPolicyApi = createCSLClient(CSL_API_KEYS.policies)

/**
 * CSL Policy Service
 * Handles all CRUD operations for CSL policies
 */
class CSLPolicyService {
  
  /**
   * Get all CSL policies with optional filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Array>} Array of policies
   */
  async getAllPolicies(filters = {}, pagination = {}) {
    try {
      const params = {
        ...filters,
        page: pagination.page || 1,
        per_page: pagination.perPage || 20
      }
      
      const response = await cslPolicyApi.get('/csl_policies', { params })
      const policies = response.data || []
      
      // Transform to frontend format
      return policies.map(policy => this.transformPolicy(policy))
    } catch (error) {
      console.error('Failed to get CSL policies:', error)
      return []
    }
  }
  
  /**
   * Get policies assigned to a specific agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<Array>} Array of assigned policies
   */
  async getPoliciesForAgent(agentId) {
    try {
      const response = await cslPolicyApi.get('/csl_policies')
      const allPolicies = response.data || []
      
      // Filter policies assigned to this agent
      const assignedPolicies = allPolicies.filter(policy => 
        policy.assigned_to_agent_id === agentId
      )
      
      console.log(`Agent ${agentId}: ${assignedPolicies.length} assigned policies`)
      
      return assignedPolicies.map(policy => this.transformPolicy(policy))
    } catch (error) {
      console.error('Failed to get policies for agent:', error)
      return []
    }
  }

  /**
   * Get unassigned policies (shared pool)
   * @returns {Promise<Array>} Array of unassigned policies
   */
  async getUnassignedPolicies() {
    try {
      const response = await cslPolicyApi.get('/csl_policies')
      const allPolicies = response.data || []
      
      // Filter for unassigned policies (assigned_to_agent_id is null)
      const unassigned = allPolicies.filter(policy => 
        !policy.assigned_to_agent_id || policy.assigned_to_agent_id === null
      )
      
      console.log(`Found ${unassigned.length} unassigned policies in shared pool`)
      
      return unassigned.map(policy => this.transformPolicy(policy))
    } catch (error) {
      console.error('Failed to get unassigned policies:', error)
      return []
    }
  }

  /**
   * Assign a policy to an agent
   * @param {number} policyId - Policy ID
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>} Updated policy
   */
  async assignPolicyToAgent(policyId, agentId) {
    try {
      console.log(`Assigning policy ${policyId} to agent ${agentId}`)
      const response = await cslPolicyApi.patch(`/csl_policies/${policyId}`, {
        assigned_to_agent_id: agentId
      })
      return this.transformPolicy(response.data)
    } catch (error) {
      console.error('Failed to assign policy to agent:', error)
      throw error
    }
  }
  
  /**
   * Get a single policy by ID
   * @param {number} id - Policy ID
   * @returns {Promise<Object|null>} Policy object or null
   */
  async getPolicyById(id) {
    try {
      const response = await cslPolicyApi.get(`/csl_policies/${id}`)
      const policy = response.data
      
      if (!policy) {
        return null
      }
      
      return this.transformPolicy(policy)
    } catch (error) {
      console.error('Failed to get CSL policy:', error)
      return null
    }
  }
  
  /**
   * Get a policy by policy number
   * @param {string} policyNumber - Policy number
   * @returns {Promise<Object|null>} Policy object or null
   */
  async getByPolicyNumber(policyNumber) {
    try {
      const response = await cslPolicyApi.get('/csl_policies')
      const allPolicies = response.data || []
      
      // Find policy by policy_number
      const policy = allPolicies.find(p => p.policy_number === policyNumber)
      
      if (!policy) {
        return null
      }
      
      return this.transformPolicy(policy)
    } catch (error) {
      console.error('Failed to get policy by number:', error)
      return null
    }
  }

  /**
   * Get a policy by policy number AND data month (composite key)
   * This ensures we get the correct policy for a specific month
   * @param {string} policyNumber - Policy number
   * @param {string} dataAsOfDate - Data as of date (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Policy object or null
   */
  async getByPolicyNumberAndMonth(policyNumber, dataAsOfDate) {
    try {
      const response = await cslPolicyApi.get('/csl_policies')
      const allPolicies = response.data || []
      
      // Find policy by BOTH policy_number AND data_as_of_date
      const policy = allPolicies.find(p => 
        p.policy_number === policyNumber && 
        p.data_as_of_date === dataAsOfDate
      )
      
      if (!policy) {
        return null
      }
      
      return this.transformPolicy(policy)
    } catch (error) {
      console.error('Failed to get policy by number and month:', error)
      return null
    }
  }

  /**
   * Get all policies for a specific month (for batch operations)
   * This is optimized for bulk uploads - load once, check many times
   * @param {string} dataAsOfDate - Data as of date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of policies for that month
   */
  async getPoliciesForMonth(dataAsOfDate) {
    try {
      const response = await cslPolicyApi.get('/csl_policies')
      const allPolicies = response.data || []
      
      // Filter policies for this specific month
      const monthPolicies = allPolicies.filter(p => 
        p.data_as_of_date === dataAsOfDate
      )
      
      console.log(`📊 Loaded ${monthPolicies.length} existing policies for month ${dataAsOfDate}`)
      
      return monthPolicies.map(policy => this.transformPolicy(policy))
    } catch (error) {
      console.error('Failed to get policies for month:', error)
      return []
    }
  }
  
  /**
   * Create a new CSL policy
   * @param {Object} policyData - Policy data
   * @returns {Promise<Object>} Created policy
   */
  async createPolicy(policyData) {
    try {
      const response = await cslPolicyApi.post('/csl_policies', policyData)
      return this.transformPolicy(response.data)
    } catch (error) {
      console.error('Failed to create CSL policy:', error)
      throw error
    }
  }
  
  /**
   * Update an existing CSL policy
   * @param {number} id - Policy ID
   * @param {Object} policyData - Updated policy data
   * @returns {Promise<Object>} Updated policy
   */
  async updatePolicy(id, policyData) {
    try {
      const response = await cslPolicyApi.patch(`/csl_policies/${id}`, policyData)
      return this.transformPolicy(response.data)
    } catch (error) {
      console.error('Failed to update CSL policy:', error)
      throw error
    }
  }
  
  /**
   * Upsert a policy (update if exists for same month, create if not)
   * Uses composite key: policy_number + data_as_of_date
   * 
   * LOGIC:
   * - Same policy, same month → UPDATE (correction)
   * - Same policy, different month → INSERT (new monthly snapshot)
   * - New policy → INSERT
   * 
   * @param {Object} policyData - Policy data with policy_number and data_as_of_date
   * @returns {Promise<Object>} Created or updated policy
   */
  async upsertPolicy(policyData) {
    try {
      // Check if policy exists for THIS SPECIFIC MONTH (composite key)
      const existing = await this.getByPolicyNumberAndMonth(
        policyData.policy_number,
        policyData.data_as_of_date
      )
      
      if (existing) {
        // Update existing policy (correction for same month)
        console.log(`✏️ Updating policy ${policyData.policy_number} for month ${policyData.data_as_of_date}`)
        return await this.updatePolicy(existing.id, policyData)
      } else {
        // Create new policy (new month or new policy)
        console.log(`➕ Creating new record for policy ${policyData.policy_number} for month ${policyData.data_as_of_date}`)
        return await this.createPolicy(policyData)
      }
    } catch (error) {
      console.error('Failed to upsert policy:', error)
      throw error
    }
  }
  
  /**
   * Bulk upload policies (with composite key upsert logic)
   * Uses policy_number + data_as_of_date to determine update vs insert
   * @param {Array} policiesArray - Array of policy objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Upload results
   */
  async bulkUpload(policiesArray, onProgress = null) {
    const results = {
      total: policiesArray.length,
      created: 0,
      updated: 0,
      errors: []
    }
    
    // Process in batches of 10 to avoid overwhelming the API
    const batchSize = 10
    
    for (let i = 0; i < policiesArray.length; i += batchSize) {
      const batch = policiesArray.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (policy, index) => {
        try {
          // Check using composite key (policy_number + data_as_of_date)
          const existing = await this.getByPolicyNumberAndMonth(
            policy.policy_number,
            policy.data_as_of_date
          )
          
          if (existing) {
            // Update: Same policy, same month (correction)
            await this.updatePolicy(existing.id, policy)
            results.updated++
          } else {
            // Insert: New policy or new month for existing policy
            await this.createPolicy(policy)
            results.created++
          }
          
          // Call progress callback
          if (onProgress) {
            onProgress({
              processed: i + index + 1,
              total: results.total,
              created: results.created,
              updated: results.updated
            })
          }
        } catch (error) {
          results.errors.push({
            policy_number: policy.policy_number,
            error: error.message
          })
        }
      })
      
      await Promise.all(batchPromises)
    }
    
    return results
  }
  
  /**
   * Transform policy from Xano format to frontend format
   * @param {Object} policy - Raw policy from Xano
   * @returns {Object} Transformed policy
   */
  transformPolicy(policy) {
    // Return original format - no transformation needed
    // This keeps snake_case field names consistent with Xano
    return policy
  }
}

export const cslPolicyService = new CSLPolicyService()
export default cslPolicyService
