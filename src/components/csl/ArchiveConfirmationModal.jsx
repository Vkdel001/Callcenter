import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

/**
 * Archive Confirmation Modal
 * Requires user to type "Old Data" to access historical month data
 */
export default function ArchiveConfirmationModal({ month, onConfirm, onCancel }) {
  const [confirmationText, setConfirmationText] = useState('')
  
  const isValid = confirmationText === 'Old Data'
  
  const handleConfirm = () => {
    if (isValid) {
      onConfirm()
    }
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValid) {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">⚠️</span>
            <h2 className="text-xl font-bold text-gray-900">
              Access Historical Data
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            You are about to view archived data from:
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="font-bold text-yellow-900 text-lg">
              📁 {month?.label}
            </p>
            <p className="text-yellow-700 text-sm">
              {month?.policyCount} policies (Historical)
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This is old data for reference only.
              Active work should be done on the current month.
            </p>
          </div>
          
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To confirm, type: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Old Data</span>
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          
          {confirmationText && !isValid && (
            <p className="text-red-600 text-sm mt-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Text doesn't match. Please type exactly: "Old Data"
            </p>
          )}
          
          {isValid && (
            <p className="text-green-600 text-sm mt-2 flex items-center">
              ✓ Confirmed. Click "Confirm Access" to proceed.
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Confirm Access
          </button>
        </div>
      </div>
    </div>
  )
}
