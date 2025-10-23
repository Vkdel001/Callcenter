import { useState, useEffect } from 'react'
import { schedulerService } from '../../services/schedulerService'
import { Play, Pause, Settings, Clock, Mail, MessageSquare, BarChart3, RefreshCw, Eye } from 'lucide-react'

const ReminderScheduler = () => {
  const [status, setStatus] = useState(null)
  const [preview, setPreview] = useState(null)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState({
    enabled: false,
    checkInterval: 60000,
    reminderTimes: ['09:00', '14:00']
  })
  const [loading, setLoading] = useState(false)

  // Load initial status
  useEffect(() => {
    loadStatus()
    loadPreview()
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = () => {
    const currentStatus = schedulerService.getStatus()
    setStatus(currentStatus)
    setConfig(currentStatus.config)
  }

  const loadPreview = async () => {
    try {
      const previewData = await schedulerService.getPreview()
      setPreview(previewData)
    } catch (error) {
      console.error('Failed to load preview:', error)
    }
  }

  const handleStart = () => {
    const success = schedulerService.start()
    if (success) {
      loadStatus()
    }
  }

  const handleStop = () => {
    const success = schedulerService.stop()
    if (success) {
      loadStatus()
    }
  }

  const handleToggleEnabled = () => {
    const newEnabled = !config.enabled
    schedulerService.setEnabled(newEnabled)
    loadStatus()
  }

  const handleConfigSave = () => {
    schedulerService.updateConfig(config)
    setShowConfig(false)
    loadStatus()
  }

  const handleManualRun = async () => {
    setLoading(true)
    try {
      const result = await schedulerService.triggerManualRun()
      alert(result.message)
      loadStatus()
      loadPreview()
    } catch (error) {
      alert(`Manual run failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetStats = () => {
    if (confirm('Are you sure you want to reset all statistics?')) {
      schedulerService.resetStats()
      loadStatus()
    }
  }

  const formatTime = (isoString) => {
    if (!isoString) return 'Never'
    return new Date(isoString).toLocaleString()
  }

  const formatUptime = (ms) => {
    if (!ms) return '0s'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automated Reminder Scheduler</h1>
          <p className="text-gray-600">Manage automated payment reminder scheduling</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
          
          <button
            onClick={loadPreview}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Scheduler Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduler Status</p>
              <p className={`text-2xl font-bold ${status.isRunning ? 'text-green-600' : 'text-gray-400'}`}>
                {status.isRunning ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div className={`p-3 rounded-full ${status.isRunning ? 'bg-green-100' : 'bg-gray-100'}`}>
              {status.isRunning ? (
                <Play className={`h-6 w-6 ${status.isRunning ? 'text-green-600' : 'text-gray-400'}`} />
              ) : (
                <Pause className="h-6 w-6 text-gray-400" />
              )}
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            {status.isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
              >
                <Pause className="h-3 w-3 mr-1" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
              >
                <Play className="h-3 w-3 mr-1" />
                Start
              </button>
            )}
            
            <button
              onClick={handleToggleEnabled}
              className={`px-3 py-1 rounded-md text-sm ${
                config.enabled 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Next Run */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Next Run</p>
              <p className="text-lg font-semibold text-gray-900">
                {status.stats.nextRunTime ? (
                  new Date(status.stats.nextRunTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                ) : 'Not scheduled'}
              </p>
            </div>
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {status.stats.nextRunTime ? (
              `${new Date(status.stats.nextRunTime).toLocaleDateString()}`
            ) : 'Configure reminder times'}
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {status.stats.totalProcessed > 0 
                  ? Math.round((status.stats.successfulReminders / status.stats.totalProcessed) * 100)
                  : 0}%
              </p>
            </div>
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {status.stats.successfulReminders} of {status.stats.totalProcessed} sent
          </p>
        </div>

        {/* Pending Reminders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Reminders</p>
              <p className="text-2xl font-bold text-orange-600">
                {preview?.count || 0}
              </p>
            </div>
            <Mail className="h-6 w-6 text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Ready to be sent
          </p>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Scheduler Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check Interval (seconds)
              </label>
              <input
                type="number"
                value={config.checkInterval / 1000}
                onChange={(e) => setConfig({
                  ...config,
                  checkInterval: parseInt(e.target.value) * 1000
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                min="10"
                max="3600"
              />
              <p className="text-xs text-gray-500 mt-1">How often to check for reminders (10-3600 seconds)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Times
              </label>
              <div className="space-y-2">
                {config.reminderTimes.map((time, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...config.reminderTimes]
                        newTimes[index] = e.target.value
                        setConfig({ ...config, reminderTimes: newTimes })
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={() => {
                        const newTimes = config.reminderTimes.filter((_, i) => i !== index)
                        setConfig({ ...config, reminderTimes: newTimes })
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setConfig({
                      ...config,
                      reminderTimes: [...config.reminderTimes, '12:00']
                    })
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Time
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfigSave}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Statistics</h3>
          <button
            onClick={handleResetStats}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Reset Stats
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{status.stats.totalProcessed}</p>
            <p className="text-sm text-gray-600">Total Processed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{status.stats.successfulReminders}</p>
            <p className="text-sm text-gray-600">Successful</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{status.stats.failedReminders}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatUptime(status.uptime)}</p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Last Run:</strong> {formatTime(status.stats.lastRunTime)}
          </p>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Controls</h3>
        
        <div className="flex space-x-4">
          <button
            onClick={handleManualRun}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Processing...' : 'Run Now'}
          </button>

          <button
            onClick={loadPreview}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Reminders
          </button>
        </div>

        {preview && preview.count > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">
              Reminders Ready to Send ({preview.count})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {preview.installments.map((installment, index) => (
                <div key={index} className="text-sm text-gray-600 flex justify-between">
                  <span>Installment #{installment.installment_number}</span>
                  <span>Due: {new Date(installment.due_date).toLocaleDateString()}</span>
                  <span>MUR {installment.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {preview.totalCount > preview.installments.length && (
              <p className="text-xs text-gray-500 mt-2">
                ...and {preview.totalCount - preview.installments.length} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReminderScheduler