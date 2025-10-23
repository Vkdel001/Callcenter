import { schedulerService } from '../services/schedulerService'

// Initialize scheduler when app starts
export const initializeScheduler = () => {
  console.log('🚀 Initializing reminder scheduler...')
  
  // Set default configuration for local development
  schedulerService.updateConfig({
    enabled: false, // Start disabled by default
    checkInterval: 60000, // Check every minute for testing
    reminderTimes: ['09:00', '14:00', '17:00'] // 9 AM, 2 PM, 5 PM
  })

  // Auto-start scheduler if in production or if explicitly enabled
  const shouldAutoStart = import.meta.env.PROD || import.meta.env.VITE_AUTO_START_SCHEDULER === 'true'
  
  if (shouldAutoStart) {
    schedulerService.setEnabled(true)
    schedulerService.start()
    console.log('✅ Scheduler auto-started for production')
  } else {
    console.log('📴 Scheduler initialized but not started (development mode)')
    console.log('💡 Go to Admin > Reminder Scheduler to start it manually')
  }

  // Add global access for debugging
  if (import.meta.env.DEV) {
    window.schedulerService = schedulerService
    console.log('🔧 Scheduler service available as window.schedulerService for debugging')
  }
}

// Cleanup scheduler when app unmounts
export const cleanupScheduler = () => {
  console.log('🧹 Cleaning up scheduler...')
  schedulerService.stop()
}