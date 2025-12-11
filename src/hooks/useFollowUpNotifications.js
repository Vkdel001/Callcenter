import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../contexts/AuthContext'
import followUpService from '../services/followUpService'

// Custom hook for follow-up notifications and alerts
export const useFollowUpNotifications = () => {
  const { user } = useAuth()
  const [showLoginAlert, setShowLoginAlert] = useState(false)
  const [hasCheckedLogin, setHasCheckedLogin] = useState(false)

  // Get follow-up alerts
  const { data: alerts, isLoading } = useQuery(
    ['followUpAlerts', user?.id, user?.agent_type, user?.branch_id],
    () => followUpService.getFollowUpAlerts(user?.id, user?.agent_type, user?.branch_id),
    {
      enabled: !!user?.id && !!user?.agent_type,
      refetchInterval: 60000, // Check every minute
      staleTime: 30000 // Consider data stale after 30 seconds
    }
  )

  // Show login alert for urgent follow-ups (only once per session)
  useEffect(() => {
    if (!hasCheckedLogin && alerts?.success && alerts.urgentCount > 0) {
      setShowLoginAlert(true)
      setHasCheckedLogin(true)
    }
  }, [alerts, hasCheckedLogin])

  // Dismiss login alert
  const dismissLoginAlert = () => {
    setShowLoginAlert(false)
  }

  // Get notification badge count for navigation
  const getNotificationCount = () => {
    if (!alerts?.success) return 0
    return alerts.urgentCount || 0
  }

  // Get notification text for badge
  const getNotificationText = () => {
    const count = getNotificationCount()
    if (count === 0) return ''
    if (count > 99) return '99+'
    return count.toString()
  }

  // Check if there are urgent notifications
  const hasUrgentNotifications = () => {
    return getNotificationCount() > 0
  }

  // Get alert summary for login modal
  const getAlertSummary = () => {
    if (!alerts?.success) return null
    
    return {
      urgentCount: alerts.urgentCount || 0,
      hasOverdue: alerts.hasOverdue || false,
      hasToday: alerts.hasToday || false,
      summary: alerts.summary || {}
    }
  }

  return {
    // Data
    alerts: alerts?.success ? alerts : null,
    isLoading,
    
    // Notification counts
    notificationCount: getNotificationCount(),
    notificationText: getNotificationText(),
    hasUrgentNotifications: hasUrgentNotifications(),
    
    // Login alert
    showLoginAlert,
    dismissLoginAlert,
    alertSummary: getAlertSummary(),
    
    // Utility functions
    refresh: () => {
      // This would trigger a refetch of the query
      // The query client handles this automatically
    }
  }
}

export default useFollowUpNotifications