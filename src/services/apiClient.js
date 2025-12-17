import axios from 'axios'

// Xano configuration
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL || 'https://xbde-ekcn-8kg2.n7e.xano.io'

// API keys for different tables
const API_KEYS = {
  agent: import.meta.env.VITE_XANO_AGENT_API || 'dNA8QCWg',
  customer: import.meta.env.VITE_XANO_CUSTOMER_API || 'Q4jDYUWL',
  assignment: import.meta.env.VITE_XANO_ASSIGNMENT_API || '',
  calllog: import.meta.env.VITE_XANO_CALLLOG_API || '',
  branch: import.meta.env.VITE_XANO_BRANCH_API || 'T_DdiKCA',
  payment: import.meta.env.VITE_XANO_PAYMENT_API || '05i62DIx',
  qrTransactions: import.meta.env.VITE_XANO_QR_TRANSACTIONS_API || '6MaKDJBx'
}

// Create API clients for each table
const createXanoClient = (apiKey) => {
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

// Export specific clients for each table
export const agentApi = createXanoClient(API_KEYS.agent)
export const customerApi = createXanoClient(API_KEYS.customer)
export const assignmentApi = createXanoClient(API_KEYS.assignment)
export const calllogApi = createXanoClient(API_KEYS.calllog)
export const branchApi = createXanoClient(API_KEYS.branch)
export const paymentApi = createXanoClient(API_KEYS.payment)
export const qrTransactionsApi = createXanoClient(API_KEYS.qrTransactions)

// Legacy export for backward compatibility
export const apiClient = agentApi