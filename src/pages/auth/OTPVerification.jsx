import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { otpService } from '../../services/otpService'
import { useAuth } from '../../contexts/AuthContext'
import { Shield, Mail, Clock, RefreshCw } from 'lucide-react'

const OTPVerification = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [canResend, setCanResend] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm()
  
  // Get user data from navigation state
  const { email, name, userData, token } = location.state || {}

  useEffect(() => {
    // Redirect if no user data
    if (!email || !userData || !token) {
      navigate('/login')
      return
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, userData, token, navigate])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')
    
    try {
      const otp = Object.values(data).join('')
      
      const result = otpService.verifyOTP(email, otp)
      
      if (result.success) {
        // OTP verified, complete login
        localStorage.setItem('auth_token', token)
        
        // Use the login context to set user data
        await login({ email, password: 'verified' }, userData, token)
        
        navigate('/')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResendLoading(true)
    setError('')
    
    try {
      const result = await otpService.sendOTP(email, name)
      
      if (result.success) {
        setTimeLeft(300) // Reset timer
        setCanResend(false)
        alert('New OTP sent successfully!')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleInputChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      setValue(`otp${index}`, value)
      
      // Auto-focus next input
      if (value && index < 6) {
        const nextInput = document.getElementById(`otp${index + 1}`)
        if (nextInput) nextInput.focus()
      }
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !watch(`otp${index}`) && index > 1) {
      const prevInput = document.getElementById(`otp${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  if (!email || !userData || !token) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Identity
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a verification code to your email
          </p>
          <div className="mt-2 flex items-center justify-center text-sm text-gray-500">
            <Mail className="h-4 w-4 mr-1" />
            {email}
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 text-center mb-4">
              Enter 6-digit verification code
            </label>
            
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <input
                  key={index}
                  id={`otp${index}`}
                  {...register(`otp${index}`, { required: true })}
                  type="text"
                  maxLength="1"
                  className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                />
              ))}
            </div>
            
            {Object.keys(errors).length > 0 && (
              <p className="mt-2 text-sm text-red-600 text-center">
                Please enter all 6 digits
              </p>
            )}
          </div>

          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {timeLeft > 0 ? formatTime(timeLeft) : 'Expired'}
            </div>
            
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendLoading}
                className="flex items-center text-primary-600 hover:text-primary-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${resendLoading ? 'animate-spin' : ''}`} />
                {resendLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            ) : (
              <span className="text-gray-400">Resend available after expiry</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || timeLeft === 0}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify & Login'}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OTPVerification