import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { customerService } from '../../services/customerService'
import { useAuth } from '../../contexts/AuthContext'

const LOBDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { lobType, month } = useParams() // Get URL parameters
  const [lobData, setLobData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customerListData, setCustomerListData] = useState(null)
  const [customerListLoading, setCustomerListLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('amount_desc') // amount_desc, amount_asc, name_asc
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [loadingCustomers, setLoadingCustomers] = useState(new Set())
  const modalStateRef = useRef({ showModal: false, data: null })

  // Format month display consistently
  const formatMonthDisplay = (monthStr) => {
    if (!monthStr) return monthStr
    
    // Handle different formats: "2024-11", "Nov-25", "2024-10", "Oct-25"
    if (monthStr.includes('-')) {
      const parts = monthStr.split('-')
      
      if (parts[0].length === 4) {
        // Format: "2024-11" -> "Nov-24"
        const year = parts[0]
        const monthNum = parseInt(parts[1])
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[monthNum - 1]}-${year.slice(-2)}`
      } else {
        // Already in format "Nov-25"
        return monthStr
      }
    }
    
    return monthStr
  }

  // Load customer data when month is selected via URL
  useEffect(() => {
    const loadCustomerData = async () => {
      // Check if we have the required parameters and valid user type
      if (!lobType || !month || !user?.agent_type) return
      
      // Validate user type and required fields
      if (user.agent_type === 'sales_agent' && !user.sales_agent_id) return
      if (user.agent_type !== 'sales_agent' && user.agent_type !== 'csr') return

      console.log(`Loading customers for ${lobType} - ${month} (${user.agent_type})`)
      setCustomerListLoading(true)

      try {
        let result

        // Choose data source based on user type
        if (user.agent_type === 'sales_agent') {
          result = await customerService.getSalesAgentCustomersForLOBMonth(
            user.sales_agent_id,
            lobType,
            month
          )
        } else if (user.agent_type === 'csr') {
          result = await customerService.getCSRCustomersForLOBMonth(
            lobType,
            month
          )
        }

        if (result.success) {
          setCustomerListData(result)
          setError(null)
        } else {
          setError(result.error || 'Failed to load customers')
        }
      } catch (err) {
        console.error('Error loading customers:', err)
        setError('Failed to load customers')
      } finally {
        setCustomerListLoading(false)
      }
    }

    loadCustomerData()
  }, [lobType, month, user?.agent_type, user?.sales_agent_id])

  // Reset search when URL changes
  useEffect(() => {
    setSearchTerm('')
    setSortBy('amount_desc')
  }, [lobType, month])



  useEffect(() => {
    const fetchLOBData = async () => {
      // Validate user type and required fields
      if (user?.agent_type === 'sales_agent' && !user?.sales_agent_id) {
        setError('Sales agent ID not found')
        setLoading(false)
        return
      }

      if (!user?.agent_type || (user.agent_type !== 'sales_agent' && user.agent_type !== 'csr')) {
        setError('Invalid user type for LOB dashboard')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        let result

        // Choose data source based on user type
        if (user.agent_type === 'sales_agent') {
          console.log('Fetching LOB data for Sales Agent:', user.sales_agent_id)
          result = await customerService.getSalesAgentLOBSummary(user.sales_agent_id)
        } else if (user.agent_type === 'csr') {
          console.log('Fetching LOB data for CSR (universal access)')
          result = await customerService.getCSRLOBSummary()
        }

        if (result.success) {
          setLobData(result)
          setError(null)
        } else {
          setError(result.error || 'Failed to load LOB data')
        }
      } catch (err) {
        console.error('Error fetching LOB data:', err)
        setError('Failed to load LOB data')
      } finally {
        setLoading(false)
      }
    }

    fetchLOBData()
  }, [user?.agent_type, user?.sales_agent_id])

  const handleLOBClick = (selectedLobType) => {
    console.log(`Clicked on ${selectedLobType} LOB`)
    navigate(`/lob/${selectedLobType}`)
  }

  const handleBackToLOB = () => {
    navigate('/')
  }

  const handleBackToMonth = () => {
    navigate(`/lob/${lobType}`)
  }

  const handleGenerateQR = async (customer) => {
    try {
      console.log('Generating QR for customer:', customer.name)
      setLoadingCustomers(prev => new Set([...prev, customer.id]))

      // Use the existing QR generation service
      const qrResult = await customerService.generateQRCode({
        id: customer.id,
        name: customer.name,
        policyNumber: customer.policyNumber,
        amountDue: customer.amountDue,
        mobile: customer.mobile,
        email: customer.email
      })

      if (qrResult.qrCodeUrl) {
        console.log('QR generated successfully, showing modal')

        // Use robust approach to prevent state resets
        modalStateRef.current = { showModal: true, data: qrResult }
        window.FORCE_MODAL_OPEN = true
        setQrData(qrResult)
        setShowQRModal(true)

        console.log('Modal state set with protection')
      } else {
        alert('❌ Failed to generate QR code')
      }
    } catch (error) {
      console.error('QR generation failed:', error)
      alert('❌ Failed to generate QR code')
    } finally {
      setLoadingCustomers(prev => {
        const newSet = new Set(prev)
        newSet.delete(customer.id)
        return newSet
      })
    }
  }

  const handleSendWhatsApp = async () => {
    if (qrData) {
      try {
        const result = await customerService.sendWhatsApp(
          qrData.customerData,
          qrData.qrCodeUrl,
          qrData.paymentLink
        )

        if (result.success) {
          alert('✅ WhatsApp opened with customer contact and QR code sharing options.')
        } else {
          alert(`❌ Failed to share via WhatsApp: ${result.error}`)
        }
      } catch (error) {
        console.error('WhatsApp sharing failed:', error)
        alert('❌ Failed to share via WhatsApp')
      }
    }
  }

  const handleSendEmail = async () => {
    if (qrData) {
      try {
        const result = await customerService.sendEmail(
          qrData.customerData,
          qrData.qrCodeUrl,
          qrData.paymentLink
        )

        if (result.success) {
          alert('✅ Payment reminder email sent successfully!')
        } else {
          alert(`❌ Failed to send email: ${result.error}`)
        }
      } catch (error) {
        console.error('Email sending failed:', error)
        alert('❌ Failed to send email')
      }
    }
  }

  const copyQRToClipboard = async (qrCodeUrl) => {
    try {
      const response = await fetch(qrCodeUrl)
      if (!response.ok) throw new Error('Failed to fetch image')

      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])

      return true
    } catch (error) {
      console.error('Failed to copy QR to clipboard:', error)
      return false
    }
  }

  // Filter and sort customers
  const getFilteredAndSortedCustomers = (customers) => {
    if (!customers) return []

    // Filter by search term
    let filtered = customers
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(search) ||
        customer.mobile.includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.address?.toLowerCase().includes(search) ||
        customer.policyNumber.toLowerCase().includes(search)
      )
    }

    // Sort customers
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'amount_desc':
          return (b.amountDue || 0) - (a.amountDue || 0)
        case 'amount_asc':
          return (a.amountDue || 0) - (b.amountDue || 0)
        case 'name_asc':
          return a.name.localeCompare(b.name)
        default:
          return (b.amountDue || 0) - (a.amountDue || 0)
      }
    })

    return sorted
  }

  const handleMonthClick = (selectedMonth) => {
    console.log(`Clicked on ${selectedMonth} for ${lobType} LOB`)
    navigate(`/lob/${lobType}/${selectedMonth}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Portfolio</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const { lobSummary, totalCustomers } = lobData || {}

  // If a month is selected via URL, show customer list
  if (month && customerListData) {
    const { customers, lob, month, totalAmount } = customerListData

    return (
      <div className="space-y-6">
        {/* Customer List Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBackToMonth}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {lob} Insurance - {formatMonthDisplay(month)}
                </h1>
                <p className="text-gray-600 mt-1">
                  {customers.length} customers • MUR {totalAmount.toLocaleString()} total due
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{customers.length}</div>
              <div className="text-sm text-gray-500">Customers</div>
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Smart Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  placeholder="Search by name, phone, email, address, or policy number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="md:w-64">
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="amount_desc">Amount Due (High to Low)</option>
                <option value="amount_asc">Amount Due (Low to High)</option>
                <option value="name_asc">Name (A to Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Customer List</h2>
              <span className="text-sm text-gray-500">
                {getFilteredAndSortedCustomers(customers).length} of {customers.length} customers
                {searchTerm && ` (filtered)`}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {getFilteredAndSortedCustomers(customers).length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? `No customers match "${searchTerm}"` : 'No customers available'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-500"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              getFilteredAndSortedCustomers(customers).map((customer) => (
                <div key={customer.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 
                          className="text-lg font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          {customer.titleOwner1 ? `${customer.titleOwner1} ` : ''}{customer.name}
                        </h3>
                        <span className={`ml-3 inline-flex px-2 py-1 text-xs font-medium rounded-full ${customer.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : customer.status === 'contacted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {customer.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><span className="font-medium">Policy:</span> {customer.policyNumber}</p>
                          <p><span className="font-medium">Mobile:</span> {customer.mobile}</p>
                          <p><span className="font-medium">Email:</span> {customer.email}</p>
                        </div>
                        <div>
                          <p><span className="font-medium">Amount Due:</span> MUR {customer.amountDue.toLocaleString()}</p>
                          {customer.nationalId && (
                            <p><span className="font-medium">National ID:</span> {customer.nationalId}</p>
                          )}
                        </div>
                      </div>
                      {customer.address && (
                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Address:</span> {customer.address}
                        </p>
                      )}
                    </div>
                    <div className="ml-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          // Clean up any existing test modal
                          const existingModal = document.getElementById('test-modal')
                          if (existingModal) {
                            existingModal.remove()
                          }

                          // Now use real QR generation
                          handleGenerateQR(customer)
                        }}
                        disabled={loadingCustomers.has(customer.id)}
                        className="px-6 py-3 bg-purple-600 text-white text-base font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center shadow-lg"
                      >
                        {loadingCustomers.has(customer.id) ? (
                          <>
                            <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            📱 Generate QR
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer List Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {lob.charAt(0).toUpperCase() + lob.slice(1)} Insurance - {formatMonthDisplay(month)} Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                MUR {totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Amount Due</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
              <div className="text-sm text-gray-500">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {customers.length > 0 ? Math.round(totalAmount / customers.length) : 0}
              </div>
              <div className="text-sm text-gray-500">Avg Amount per Customer</div>
            </div>
          </div>
        </div>

        {/* QR Code Modal - Customer List View */}
        {(showQRModal || modalStateRef.current.showModal || window.FORCE_MODAL_OPEN) && (qrData || modalStateRef.current.data) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment QR Code</h3>

                <div className="mb-4">
                  <img
                    src={(qrData || modalStateRef.current.data)?.qrCodeUrl}
                    alt="Payment QR Code"
                    className="mx-auto border rounded shadow-sm"
                  />
                </div>

                <div className="mb-4 text-sm text-gray-600">
                  <p><strong>Customer:</strong> {(qrData || modalStateRef.current.data)?.customerData?.name}</p>
                  <p><strong>Policy:</strong> {(qrData || modalStateRef.current.data)?.customerData?.policyNumber}</p>
                  <p><strong>Amount:</strong> MUR {(qrData || modalStateRef.current.data)?.customerData?.amountDue?.toLocaleString()}</p>
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={async () => {
                      const success = await copyQRToClipboard((qrData || modalStateRef.current.data)?.qrCodeUrl)
                      if (success) {
                        alert('✅ QR code copied! Paste in WhatsApp (Ctrl+V or Cmd+V)')
                      } else {
                        alert('❌ Failed to copy QR code. Please try downloading instead.')
                      }
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    📋 Copy QR Code
                  </button>

                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    📱 Send via WhatsApp
                  </button>

                  <button
                    onClick={handleSendEmail}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    📧 Send via Email
                  </button>

                  <a
                    href={(qrData || modalStateRef.current.data)?.qrCodeUrl}
                    download={`payment-qr-${(qrData || modalStateRef.current.data)?.customerData?.policyNumber}.png`}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center block"
                  >
                    💾 Download QR Code
                  </a>

                  <button
                    onClick={() => {
                      modalStateRef.current = { showModal: false, data: null }
                      window.FORCE_MODAL_OPEN = false
                      setShowQRModal(false)
                      setQrData(null)
                    }}
                    className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // If customer list is loading
  if (customerListLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading customers...</span>
      </div>
    )
  }

  // If a LOB is selected via URL, show month selection
  if (lobType && lobSummary && lobSummary[lobType]) {
    const selectedLOBData = lobSummary[lobType]
    const months = selectedLOBData.months || {}
    const monthEntries = Object.entries(months).sort((a, b) => {
      // Sort months chronologically (assuming format like "Oct-25", "Nov-25")
      return a[0].localeCompare(b[0])
    })

    return (
      <div className="space-y-6">
        {/* Month Selection Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBackToLOB}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {lobType} Insurance - Month Selection
                </h1>
                <p className="text-gray-600 mt-1">
                  Select a month to view customers ({selectedLOBData.count} total customers)
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{selectedLOBData.count}</div>
              <div className="text-sm text-gray-500">Total Customers</div>
            </div>
          </div>
        </div>

        {/* Month Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monthEntries.map(([month, monthData]) => (
            <div
              key={month}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleMonthClick(month)}
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{formatMonthDisplay(month)}</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{monthData.count}</div>
                    <div className="text-sm text-gray-500">customers</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-700">
                      MUR {monthData.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">total amount due</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center text-sm text-blue-600">
                  <span>View customers</span>
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Month Selection Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
            {lobType} Insurance Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                MUR {selectedLOBData.totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Amount Due</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{monthEntries.length}</div>
              <div className="text-sm text-gray-500">Active Months</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(selectedLOBData.totalAmount / selectedLOBData.count)}
              </div>
              <div className="text-sm text-gray-500">Avg Amount per Customer</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.agent_type === 'csr' ? 'Customer Service Dashboard' : 'Sales Portfolio Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                {user?.agent_type === 'csr' 
                  ? `Welcome back! You have access to ${totalCustomers} customers across all branches and lines of business.`
                  : `Welcome back! You have ${totalCustomers} customers across all lines of business.`
                }
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{totalCustomers}</div>
              <div className="text-sm text-gray-500">Total Customers</div>
            </div>
          </div>
        </div>

        {/* LOB Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Life Insurance Card */}
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleLOBClick('life')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Life Insurance</h3>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-green-600">
                    {lobSummary?.life?.count || 0}
                  </div>
                  <div className="text-sm text-gray-500">customers</div>
                </div>
                <div className="mt-2">
                  <div className="text-lg font-semibold text-gray-700">
                    MUR {(lobSummary?.life?.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">total amount due</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <span>View customers</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Health Insurance Card */}
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleLOBClick('health')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Health Insurance</h3>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {lobSummary?.health?.count || 0}
                  </div>
                  <div className="text-sm text-gray-500">customers</div>
                </div>
                <div className="mt-2">
                  <div className="text-lg font-semibold text-gray-700">
                    MUR {(lobSummary?.health?.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">total amount due</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <span>View customers</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Motor Insurance Card */}
          <div
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleLOBClick('motor')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Motor Insurance</h3>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-orange-600">
                    {lobSummary?.motor?.count || 0}
                  </div>
                  <div className="text-sm text-gray-500">customers</div>
                </div>
                <div className="mt-2">
                  <div className="text-lg font-semibold text-gray-700">
                    MUR {(lobSummary?.motor?.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">total amount due</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-orange-600">
              <span>View customers</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                MUR {((lobSummary?.life?.totalAmount || 0) + (lobSummary?.health?.totalAmount || 0) + (lobSummary?.motor?.totalAmount || 0)).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Portfolio Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(lobSummary?.life?.months || {}).length + Object.keys(lobSummary?.health?.months || {}).length + Object.keys(lobSummary?.motor?.months || {}).length}
              </div>
              <div className="text-sm text-gray-500">Active Months</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(((lobSummary?.life?.totalAmount || 0) + (lobSummary?.health?.totalAmount || 0) + (lobSummary?.motor?.totalAmount || 0)) / (totalCustomers || 1))}
              </div>
              <div className="text-sm text-gray-500">Avg Amount per Customer</div>
            </div>
          </div>

        </div>

      </div>

      {/* QR Code Modal - Rendered outside all conditional views */}
      {(showQRModal || modalStateRef.current.showModal || window.FORCE_MODAL_OPEN) && (qrData || modalStateRef.current.data) && (
        <div
          className="fixed inset-0 bg-red-600 bg-opacity-90 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            console.log('Modal background clicked')
            // Don't close on background click for now
            e.stopPropagation()
          }}
        >
          <div
            className="relative mx-auto p-5 border-4 border-blue-500 w-96 shadow-lg rounded-md bg-yellow-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => {
              console.log('Modal content clicked')
              e.stopPropagation()
            }}
          >
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment QR Code</h3>

              <div className="mb-4">
                <img
                  src={qrData.qrCodeUrl}
                  alt="Payment QR Code"
                  className="mx-auto border rounded shadow-sm"
                />

                {qrData.testMode && (
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    🧪 Test Mode QR Code (CORS fallback)
                  </p>
                )}
              </div>

              <div className="mb-4 text-sm text-gray-600">
                <p><strong>Customer:</strong> {(qrData || modalStateRef.current.data)?.customerData?.name}</p>
                <p><strong>Policy:</strong> {(qrData || modalStateRef.current.data)?.customerData?.policyNumber}</p>
                <p><strong>Amount:</strong> MUR {(qrData || modalStateRef.current.data)?.customerData?.amountDue?.toLocaleString()}</p>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={async () => {
                    const success = await copyQRToClipboard(qrData.qrCodeUrl)
                    if (success) {
                      alert('✅ QR code copied! Paste in WhatsApp (Ctrl+V or Cmd+V)')
                    } else {
                      alert('❌ Failed to copy QR code. Please try downloading instead.')
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  📋 Copy QR Code
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  📱 Send via WhatsApp
                </button>

                <button
                  onClick={handleSendEmail}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  📧 Send via Email
                </button>

                <a
                  href={qrData.qrCodeUrl}
                  download={`payment-qr-${qrData.customerData?.policyNumber}.png`}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-center block"
                >
                  💾 Download QR Code
                </a>

                <button
                  onClick={() => {
                    console.log('Close button clicked - closing QR modal')
                    modalStateRef.current = { showModal: false, data: null }
                    window.FORCE_MODAL_OPEN = false
                    setShowQRModal(false)
                    setQrData(null)
                  }}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal - Rendered at component level, outside all conditionals */}

      {(showQRModal || modalStateRef.current.showModal || window.FORCE_MODAL_OPEN) && (qrData || modalStateRef.current.data) && (
        <div
          className="fixed inset-0 bg-red-600 bg-opacity-90 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          <div className="relative mx-auto p-5 border-4 border-blue-500 w-96 shadow-lg rounded-md bg-yellow-200">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment QR Code</h3>
              <div className="mb-4">
                <img
                  src={(qrData || modalStateRef.current.data)?.qrCodeUrl}
                  alt="Payment QR Code"
                  className="mx-auto border rounded shadow-sm"
                />
              </div>
              <div className="mb-4 text-sm text-gray-600">
                <p><strong>Customer:</strong> {(qrData || modalStateRef.current.data)?.customerData?.name}</p>
                <p><strong>Policy:</strong> {(qrData || modalStateRef.current.data)?.customerData?.policyNumber}</p>
                <p><strong>Amount:</strong> MUR {(qrData || modalStateRef.current.data)?.customerData?.amountDue?.toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  modalStateRef.current = { showModal: false, data: null }
                  window.FORCE_MODAL_OPEN = false
                  setShowQRModal(false)
                  setQrData(null)
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LOBDashboard