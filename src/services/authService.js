import { agentApi } from './apiClient'
import { otpService } from './otpService'
import { secureLogger } from '../utils/secureLogger'

export const authService = {
  async login(credentials) {
    try {
      secureLogger.authLog('LOGIN_ATTEMPT', null, credentials.email)
      
      // Skip Xano auth for now, use simple CRUD approach
      const response = await agentApi.get('/nic_cc_agent')
      const allAgents = response.data || []
      
      secureLogger.log('Retrieved agents count:', allAgents.length)
      
      const agent = allAgents.find(a => 
        a.email === credentials.email && 
        a.active === true
      )

      if (!agent) {
        secureLogger.authLog('LOGIN_FAILED_NO_USER', null, credentials.email)
        throw new Error('Invalid email or password')
      }

      // Temporary fix: manually set admin role for specific user
      let userRole = agent.role
      if (agent.email === 'vkdel001@gmail.com') {
        userRole = 'admin'

      } else {
        userRole = agent.role || 'agent'
      }
      secureLogger.authLog('USER_FOUND', agent.id, agent.email)
      
      // Check all possible password fields
      const passwordMatch = 
        agent.password === credentials.password ||
        agent.password_hash === credentials.password ||
        agent.Password === credentials.password ||
        agent.Password_Hash === credentials.password

      if (!passwordMatch) {
        secureLogger.authLog('LOGIN_FAILED_INVALID_PASSWORD', agent.id, agent.email)
        throw new Error('Invalid email or password')
      }

      // Generate simple token
      const token = btoa(JSON.stringify({
        id: agent.id,
        email: agent.email,
        timestamp: Date.now()
      }))

      // Instead of returning immediately, send OTP first
      const userData = {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: userRole
      }

      // Send OTP
      const otpResult = await otpService.sendOTP(agent.email, agent.name)
      
      if (!otpResult.success) {
        throw new Error('Failed to send verification code')
      }

      // Return special response indicating OTP sent
      return {
        requiresOTP: true,
        email: agent.email,
        name: agent.name,
        userData,
        token,
        message: 'Verification code sent to your email'
      }
    } catch (error) {
      secureLogger.error('Login failed:', error)
      
      if (error.message.includes('Invalid email or password')) {
        throw error
      }
      
      throw new Error('Login failed. Please try again.')
    }
  },

  async validateToken(token) {
    try {
      // Decode and validate our simple token
      const decoded = JSON.parse(atob(token))
      
      // Check if token is not too old (7 days for better UX)
      const tokenAge = Date.now() - decoded.timestamp
      if (tokenAge > 7 * 24 * 60 * 60 * 1000) {
        throw new Error('Token expired')
      }

      // Get fresh user data from Xano
      const response = await agentApi.get(`/nic_cc_agent/${decoded.id}`)
      const agent = response.data

      if (!agent || agent.active === false) {
        throw new Error('User not found or inactive')
      }


      
      // Temporary fix: manually set admin role for specific user
      let userRole = 'agent'
      if (agent.email === 'vkdel001@gmail.com') {
        userRole = 'admin'
      } else {
        userRole = agent.role || agent.Role || 'agent'
      }

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: userRole
      }
    } catch (error) {
      console.error('Token validation failed:', error)
      throw new Error('Invalid token')
    }
  },

  async logout() {
    // Xano doesn't require server-side logout for JWT tokens
    // Just remove token from frontend
    return true
  },

  async signup(userData) {
    try {
      // Use direct CRUD to create agent - much simpler!
      const response = await agentApi.post('/nic_cc_agent', {
        name: userData.name,
        email: userData.email,
        password_hash: userData.password,  // Try password_hash first
        role: userData.role || 'agent',
        active: true
      })

      return response.data
    } catch (error) {
      secureLogger.error('Signup failed:', error)
      
      // If password_hash fails, try with 'password' field
      if (error.response?.status === 400) {
        try {
          secureLogger.log('Trying alternative password field format')
          const response = await agentApi.post('/nic_cc_agent', {
            name: userData.name,
            email: userData.email,
            password: userData.password,  // Try password field
            role: userData.role || 'agent',
            active: true
          })
          return response.data
        } catch (secondError) {
          secureLogger.error('Alternative signup format failed:', secondError)
        }
      }
      
      if (error.response?.status === 409) {
        throw new Error('Email already exists')
      }
      
      throw new Error('Signup failed. Please check your Xano table structure.')
    }
  }
}