import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { deviceService } from '../services/deviceService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const userData = await authService.validateToken(token)
          setUser(userData)
        }
      } catch (error) {
        localStorage.removeItem('auth_token')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials, userData = null, token = null) => {
    try {
      // If userData and token provided, it means OTP was verified
      if (userData && token) {
        setUser(userData)
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        
        // Link device to agent (non-blocking)
        const agentId = userData.id || userData.email
        console.log('🔗 Attempting to link device for agent:', agentId, userData.name)
        deviceService.linkDevice(agentId, userData.name)
          .then(result => {
            if (result.success) {
              console.log('✅ Device linked successfully:', result.device_id)
            } else {
              console.warn('⚠️ Device linking failed:', result.error)
            }
          })
          .catch(err => {
            console.error('❌ Device linking error:', err)
          })
        
        return { user: userData, token }
      }
      
      // Otherwise, normal login flow
      const response = await authService.login(credentials)
      
      // Check if OTP is required
      if (response.requiresOTP) {
        return response // Don't set user yet, wait for OTP
      }
      
      // Normal login without OTP
      setUser(response.user)
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Link device to agent (non-blocking)
      const agentId = response.user.id || response.user.email
      console.log('🔗 Attempting to link device for agent:', agentId, response.user.name)
      deviceService.linkDevice(agentId, response.user.name)
        .then(result => {
          if (result.success) {
            console.log('✅ Device linked successfully:', result.device_id)
          } else {
            console.warn('⚠️ Device linking failed:', result.error)
          }
        })
        .catch(err => {
          console.error('❌ Device linking error:', err)
        })
      
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth_token')
  }

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}