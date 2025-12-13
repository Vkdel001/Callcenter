import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Calendar, Clock, X } from 'lucide-react'

const FollowUpLoginAlert = ({ isOpen, onClose, alertSummary }) => {
  const navigate = useNavigate()

  if (!isOpen || !alertSummary) return null

  const { urgentCount, hasOverdue, hasToday, summary } = alertSummary

  const handleViewFollowUps = () => {
    onClose()
    navigate('/follow-ups')
  }

  const handleRemindLater = () => {
    onClose()
    // Could set a timer to remind again later
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-6 border w-96 shadow-lg rounded-md bg-white">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Alert content */}
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Your Urgent Follow-Ups
          </h3>

          {/* Message */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              You have <span className="font-semibold text-orange-600">{urgentCount}</span> urgent follow-ups from your call logs that need attention.
            </p>

            {/* Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {hasOverdue && summary.overdue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-red-600">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>Overdue follow-ups</span>
                  </div>
                  <span className="font-semibold text-red-600">{summary.overdue}</span>
                </div>
              )}
              
              {hasToday && summary.today > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-orange-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Due today</span>
                  </div>
                  <span className="font-semibold text-orange-600">{summary.today}</span>
                </div>
              )}

              {summary.upcoming > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-blue-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Upcoming (next 2 days)</span>
                  </div>
                  <span className="font-semibold text-blue-600">{summary.upcoming}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleViewFollowUps}
              className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Follow-Ups
            </button>
            
            <button
              onClick={handleRemindLater}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
            >
              Remind Me Later
            </button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-gray-500 mt-4">
            These are follow-ups from call logs you created. Stay on top of your customer commitments.
          </p>
        </div>
      </div>
    </div>
  )
}

export default FollowUpLoginAlert