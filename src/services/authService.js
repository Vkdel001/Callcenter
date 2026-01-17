import { agentApi } from './apiClient'
import { otpService } from './otpService'
import { secureLogger } from '../utils/secureLogger'

export const authService = {
  async login(credentials) {
    try {
      console.log('🔐 authService.login called with:', { email: credentials.email });
      secureLogger.authLog('LOGIN_ATTEMPT', null, credentials.email)
      
      // ✅ Use Xano's auth endpoint
      console.log('📡 Calling /auth/login endpoint...');
      const response = await agentApi.post('/auth/login', {
        email: credentials.email,
        password: credentials.password
      })
      
      console.log('✅ /auth/login response:', response.data);
      const { auth_token } = response.data
      
      if (!auth_token) {
        console.error('❌ No auth_token in response!');
        throw new Error('No auth token received')
      }
      
      console.log('✅ Token received, length:', auth_token.length);
      secureLogger.authLog('LOGIN_SUCCESS', null, credentials.email)
      
      // Store token temporarily to get user data
      localStorage.setItem('auth_token', auth_token)
      
      // Get user details using the token
      console.log('📡 Fetching agent details...');
      const userResponse = await agentApi.get('/nic_cc_agent')
      const allAgents = userResponse.data || []
      console.log('✅ Got', allAgents.length, 'agents');
      
      const agent = allAgents.find(a => a.email === credentials.email)
      
      if (!agent) {
        console.error('❌ Agent not found for email:', credentials.email);
        throw new Error('User not found after authentication')
      }

      console.log('✅ Agent found:', { id: agent.id, name: agent.name, role: agent.role });

      // Temporary fix: manually set admin role for specific user
      let userRole = agent.role
      if (agent.email === 'vkdel001@gmail.com') {
        userRole = 'life_admin'  // Changed to life_admin for bulk agent creation access
      } else {
        userRole = agent.role || 'agent'
      }
      
      secureLogger.authLog('USER_FOUND', agent.id, agent.email)
      
      const userData = {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: userRole,
        agent_type: agent.agent_type || 'call_center', // Default to call_center for old agents
        sales_agent_id: agent.sales_agent_id || null,   // Sales agent ID (if applicable)
        branch_id: agent.branch_id || null,             // Branch ID (for internal agents)
        admin_lob: agent.admin_lob || null              // LOB-specific admin access (NEW)
      }

      // Send OTP
      console.log('📧 Sending OTP to:', agent.email);
      const otpResult = await otpService.sendOTP(agent.email, agent.name)
      console.log('📧 OTP result:', otpResult);
      
      if (!otpResult.success) {
        console.error('❌ OTP sending failed:', otpResult.error);
        throw new Error('Failed to send verification code')
      }

      console.log('✅ Login successful, returning OTP response');
      // Return special response indicating OTP sent
      return {
        requiresOTP: true,
        email: agent.email,
        name: agent.name,
        userData,
        token: auth_token,  // ✅ Now using Xano's JWT token
        message: 'Verification code sent to your email'
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      secureLogger.error('Login failed:', error)
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid email or password')
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

      const validatedUserData = {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: userRole,
        agent_type: agent.agent_type || 'call_center', // Default to call_center for old agents
        sales_agent_id: agent.sales_agent_id || null,   // Sales agent ID (if applicable)
        branch_id: agent.branch_id || null,             // Branch ID (for internal agents)
        admin_lob: agent.admin_lob || null              // LOB-specific admin access (NEW)
      }
      
      return validatedUserData
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
  },

  async resetPassword(email, newPassword) {
    try {
      // Get user by email
      const response = await agentApi.get('/nic_cc_agent')
      const allAgents = response.data || []
      
      const agent = allAgents.find(a => a.email === email && a.active === true)
      if (!agent) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Update password - try password_hash first
      console.log('Updating password for agent ID:', agent.id)
      console.log('New password length:', newPassword.length)
      
      let updateResponse
      try {
        updateResponse = await agentApi.patch(`/nic_cc_agent/${agent.id}`, {
          password_hash: newPassword
        })
        console.log('Password update successful with password_hash:', updateResponse.data)
      } catch (firstError) {
        console.log('password_hash failed, trying password field')
        updateResponse = await agentApi.patch(`/nic_cc_agent/${agent.id}`, {
          password: newPassword
        })
        console.log('Password update successful with password:', updateResponse.data)
      }

      // Clear the password reset OTP after successful password reset
      localStorage.removeItem(`otp_reset_${email}`)

      return {
        success: true,
        message: 'Password reset successfully'
      }
    } catch (error) {
      console.error('Password reset failed:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reset password'
      }
    }
  }
}