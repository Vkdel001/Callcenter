import { reminderService } from './reminderService'
import { signatureReminderService } from './signatureReminderService'

class SchedulerService {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    this.scheduleConfig = {
      enabled: false,
      checkInterval: 60000, // Check every minute (for testing)
      reminderTimes: ['09:00', '14:00'], // Times to send reminders (24h format)
      timezone: 'Indian/Mauritius'
    }
    this.lastProcessedDate = null
    this.stats = {
      totalProcessed: 0,
      successfulReminders: 0,
      failedReminders: 0,
      lastRunTime: null,
      nextRunTime: null
    }
  }

  // Start the automated scheduler
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running')
      return false
    }

    console.log('🚀 Starting automated reminder scheduler...')
    this.isRunning = true
    
    // Run immediately on start
    this.processScheduledReminders()
    
    // Set up interval to check for reminders
    this.intervalId = setInterval(() => {
      this.processScheduledReminders()
    }, this.scheduleConfig.checkInterval)

    console.log(`✅ Scheduler started - checking every ${this.scheduleConfig.checkInterval / 1000} seconds`)
    return true
  }

  // Stop the automated scheduler
  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running')
      return false
    }

    console.log('⏹️ Stopping automated reminder scheduler...')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('✅ Scheduler stopped')
    return true
  }

  // Process scheduled reminders
  async processScheduledReminders() {
    try {
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
      const currentDate = now.toDateString()

      console.log(`🔍 Checking for scheduled reminders at ${currentTime}`)

      // Only process if scheduler is enabled
      if (!this.scheduleConfig.enabled) {
        console.log('📴 Scheduler is disabled - skipping')
        return
      }

      // Check if it's time to send reminders
      const shouldSendNow = this.scheduleConfig.reminderTimes.includes(currentTime)
      
      // Prevent duplicate processing on the same date
      const alreadyProcessedToday = this.lastProcessedDate === currentDate

      if (!shouldSendNow) {
        // Update next run time for display
        this.updateNextRunTime()
        return
      }

      if (alreadyProcessedToday) {
        console.log('📅 Already processed reminders for today - skipping')
        return
      }

      console.log('⏰ Time to send scheduled reminders!')
      
      // Process payment reminders
      const paymentResult = await reminderService.processScheduledReminders()
      
      // Process signature reminders
      const signatureResult = await signatureReminderService.processSignatureReminders()
      
      // Combine results
      const result = {
        total: (paymentResult.total || 0) + (signatureResult.processed || 0),
        successful: (paymentResult.successful || 0) + (signatureResult.reminders || 0),
        failed: (paymentResult.failed || 0) + (signatureResult.processed || 0) - (signatureResult.reminders || 0),
        paymentReminders: paymentResult,
        signatureReminders: signatureResult
      }
      
      // Update stats
      this.stats.totalProcessed += result.total || 0
      this.stats.successfulReminders += result.successful || 0
      this.stats.failedReminders += result.failed || 0
      this.stats.lastRunTime = now.toISOString()
      this.lastProcessedDate = currentDate

      console.log('📊 Reminder processing complete:', {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      })

      // Update next run time
      this.updateNextRunTime()

    } catch (error) {
      console.error('❌ Error in scheduled reminder processing:', error)
      this.stats.failedReminders++
    }
  }

  // Update next run time for display
  updateNextRunTime() {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    
    // Find next reminder time today or tomorrow
    let nextTime = null
    
    for (const time of this.scheduleConfig.reminderTimes) {
      if (time > currentTime) {
        // Next time is today
        const [hours, minutes] = time.split(':')
        nextTime = new Date()
        nextTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        break
      }
    }
    
    if (!nextTime) {
      // Next time is tomorrow (first time of the day)
      const [hours, minutes] = this.scheduleConfig.reminderTimes[0].split(':')
      nextTime = new Date()
      nextTime.setDate(nextTime.getDate() + 1)
      nextTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    }
    
    this.stats.nextRunTime = nextTime.toISOString()
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.scheduleConfig,
      stats: this.stats,
      uptime: this.isRunning ? Date.now() - (new Date(this.stats.lastRunTime || Date.now()).getTime()) : 0
    }
  }

  // Update scheduler configuration
  updateConfig(newConfig) {
    const oldConfig = { ...this.scheduleConfig }
    this.scheduleConfig = { ...this.scheduleConfig, ...newConfig }
    
    console.log('⚙️ Scheduler configuration updated:', {
      old: oldConfig,
      new: this.scheduleConfig
    })

    // If interval changed and scheduler is running, restart it
    if (this.isRunning && oldConfig.checkInterval !== this.scheduleConfig.checkInterval) {
      console.log('🔄 Restarting scheduler with new interval...')
      this.stop()
      this.start()
    }

    this.updateNextRunTime()
    return this.scheduleConfig
  }

  // Enable/disable scheduler
  setEnabled(enabled) {
    this.scheduleConfig.enabled = enabled
    console.log(`📡 Scheduler ${enabled ? 'enabled' : 'disabled'}`)
    
    if (enabled && !this.isRunning) {
      this.start()
    } else if (!enabled && this.isRunning) {
      // Keep running but don't process reminders
      console.log('🔕 Scheduler will continue running but skip processing')
    }
    
    return this.scheduleConfig.enabled
  }

  // Manual trigger for testing
  async triggerManualRun() {
    console.log('🔧 Manual reminder processing triggered')
    
    try {
      // Process both payment and signature reminders
      const paymentResult = await reminderService.processScheduledReminders()
      const signatureResult = await signatureReminderService.processSignatureReminders()
      
      // Combine results
      const result = {
        total: (paymentResult.total || 0) + (signatureResult.processed || 0),
        successful: (paymentResult.successful || 0) + (signatureResult.reminders || 0),
        failed: (paymentResult.failed || 0) + (signatureResult.processed || 0) - (signatureResult.reminders || 0),
        paymentReminders: paymentResult,
        signatureReminders: signatureResult
      }
      
      // Update stats
      this.stats.totalProcessed += result.total || 0
      this.stats.successfulReminders += result.successful || 0
      this.stats.failedReminders += result.failed || 0
      this.stats.lastRunTime = new Date().toISOString()

      return {
        success: true,
        result,
        message: `Manual run completed: ${result.successful} payment/signature reminders sent, ${result.failed} failed`
      }
    } catch (error) {
      console.error('❌ Manual run failed:', error)
      return {
        success: false,
        error: error.message,
        message: 'Manual run failed'
      }
    }
  }

  // Reset stats
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      successfulReminders: 0,
      failedReminders: 0,
      lastRunTime: null,
      nextRunTime: null
    }
    console.log('📊 Scheduler stats reset')
    return this.stats
  }

  // Get reminder preview (what would be sent)
  async getPreview() {
    try {
      const installments = await reminderService.getInstallmentsNeedingReminders()
      return {
        count: installments.length,
        installments: installments.slice(0, 10), // Preview first 10
        totalCount: installments.length
      }
    } catch (error) {
      console.error('Error getting reminder preview:', error)
      return {
        count: 0,
        installments: [],
        error: error.message
      }
    }
  }
}

export const schedulerService = new SchedulerService()