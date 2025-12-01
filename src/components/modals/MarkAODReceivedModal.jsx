import { useState } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'

const MarkAODReceivedModal = ({ isOpen, onClose, aod, onSubmit, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (file) => {
    setError('')

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!selectedFile) {
      setError('Please select a PDF file to upload')
      return
    }

    onSubmit({
      file: selectedFile,
      notes: notes.trim()
    })
  }

  const handleClose = () => {
    setSelectedFile(null)
    setNotes('')
    setError('')
    setDragActive(false)
    onClose()
  }

  if (!isOpen || !aod) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-medium text-gray-900">
              Mark AOD as Signed - Upload Document
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              AOD #{aod.id} - Policy: {aod.policy_number}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* AOD Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">AOD Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700">Customer:</span>
                <p className="font-medium text-gray-900">{aod.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-blue-700">Amount:</span>
                <p className="font-medium text-gray-900">MUR {aod.outstanding_amount?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-blue-700">Payment Method:</span>
                <p className="font-medium text-gray-900">{aod.payment_method?.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-blue-700">Created:</span>
                <p className="font-medium text-gray-900">
                  {new Date(aod.agreement_date || aod.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Signed AOD Document *
            </label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center justify-center">
                      <FileText className="h-4 w-4 mr-2" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Choose a file
                    </label>
                    <span className="text-gray-600"> or drag and drop</span>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF only, maximum 5MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-2 flex items-center text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Received from customer in person, Document verified..."
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Add any relevant information about receiving this document
            </p>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-yellow-800">This action will:</h5>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                  <li>Update signature status to "received"</li>
                  <li>Start the payment reminder schedule</li>
                  <li>Store the uploaded document permanently</li>
                  <li>Record your agent ID and timestamp</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Received
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MarkAODReceivedModal
