import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { cslService } from '../../services/csl/cslService'
import CSLInteractionForm from '../../components/csl/CSLInteractionForm'
import CSLQuickActionsPanel from '../../components/csl/CSLQuickActionsPanel'
import CSLQRModal from '../../components/csl/CSLQRModal'
import { 
  ArrowLeft,
  FileText,
  User,
  Users,
  MessageSquare,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader,
  Plus
} from 'lucide-react'

export default function CSLPolicyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [policyData, setPolicyData] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrData, setQRData] = useState(null)
  const [showAllPayments, setShowAllPayments] = useState(false)

  useEffect(() => {
    loadPolicyDetails()
  }, [id])

  const loadPolicyDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load complete policy details with interactions and payment status
      const details = await cslService.getPolicyDetails(id)
      setPolicyData(details)

    } catch (err) {
      console.error('Error loading policy details:', err)
      setError('Failed to load policy details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MU', {
      style: 'currency',
      currency: 'MUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const handleQRGenerated = (qr) => {
    setQRData(qr)
    setShowQRModal(true)
  }

  const handleSendEmail = async (qr) => {
    // Email sending is handled in Quick Actions Panel
    setShowQRModal(false)
  }

  const handleSendWhatsApp = async (qr) => {
    // WhatsApp sending is handled in Quick Actions Panel
    setShowQRModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading policy details...</p>
        </div>
      </div>
    )
  }

  if (error || !policyData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Policy not found'}</p>
          <button
            onClick={() => navigate('/csl')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const { policy, interactions, paymentStatus, hasPayment } = policyData

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'owner1', label: 'Owner 1', icon: User },
    { id: 'owner2', label: 'Owner 2', icon: Users },
    { id: 'interactions', label: 'Interactions', icon: MessageSquare, badge: interactions.length },
    { id: 'logcall', label: 'Log Call', icon: Plus }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Quick Actions Panel */}
      <CSLQuickActionsPanel
        policy={policy}
        onQRGenerated={handleQRGenerated}
        onActionComplete={(action) => {
          console.log(`Action completed: ${action}`)
          loadPolicyDetails() // Reload to show updated interactions
        }}
      />

      {/* QR Modal */}
      {showQRModal && qrData && (
        <CSLQRModal
          policy={policy}
          qrData={qrData}
          onClose={() => setShowQRModal(false)}
          onSendEmail={handleSendEmail}
          onSendWhatsApp={handleSendWhatsApp}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/csl')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {policy.policy_number}
                </h1>
                <p className="text-gray-600">
                  {policy.owner1_first_name} {policy.owner1_surname}
                </p>
              </div>
            </div>
            
            {/* Payment Status Badge */}
            <div>
              {hasPayment ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Payment Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">No Payment Found</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              // Define colors for each tab
              const tabColors = {
                overview: isActive ? 'from-blue-400 to-blue-600' : 'from-gray-100 to-gray-200 hover:from-blue-50 hover:to-blue-100',
                owner1: isActive ? 'from-purple-400 to-purple-600' : 'from-gray-100 to-gray-200 hover:from-purple-50 hover:to-purple-100',
                owner2: isActive ? 'from-indigo-400 to-indigo-600' : 'from-gray-100 to-gray-200 hover:from-indigo-50 hover:to-indigo-100',
                interactions: isActive ? 'from-green-400 to-green-600' : 'from-gray-100 to-gray-200 hover:from-green-50 hover:to-green-100',
                logcall: isActive ? 'from-orange-400 to-orange-600' : 'from-gray-100 to-gray-200 hover:from-orange-50 hover:to-orange-100'
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 font-semibold transition-all rounded-t-lg shadow-md
                    bg-gradient-to-br ${tabColors[tab.id]}
                    ${isActive 
                      ? 'text-white transform scale-105 shadow-lg' 
                      : 'text-gray-700 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-white text-gray-700' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab policy={policy} paymentStatus={paymentStatus} formatCurrency={formatCurrency} formatDate={formatDate} showAllPayments={showAllPayments} setShowAllPayments={setShowAllPayments} />}
        {activeTab === 'owner1' && <Owner1Tab policy={policy} formatDate={formatDate} />}
        {activeTab === 'owner2' && <Owner2Tab policy={policy} />}
        {activeTab === 'interactions' && <InteractionsTab interactions={interactions} formatCurrency={formatCurrency} formatDate={formatDate} />}
        {activeTab === 'logcall' && (
          <CSLInteractionForm
            policy={policy}
            onSuccess={async () => {
              await loadPolicyDetails()
              setActiveTab('interactions')
            }}
            onCancel={() => setActiveTab('interactions')}
          />
        )}
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ policy, paymentStatus, formatCurrency, formatDate, showAllPayments, setShowAllPayments }) {
  return (
    <div className="space-y-3">
      {/* Policy Status Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Policy Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <p className="text-sm text-gray-600">Policy Status</p>
            <p className="text-base font-medium text-gray-900">{policy.policy_status || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Plan Name</p>
            <p className="text-base font-medium text-gray-900">{policy.plan_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Frequency</p>
            <p className="text-base font-medium text-gray-900">{policy.frequency || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Installments in Arrears</p>
            <p className="text-base font-medium text-red-600">{policy.installments_in_arrears || 0} months</p>
          </div>
        </div>
      </div>

      {/* Financial Information Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Financial Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <p className="text-sm text-gray-600">Arrears Amount</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(policy.arrears_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Premium Date</p>
            <p className="text-xl font-bold text-gray-900">{formatDate(policy.real_nx_premium)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Computed Gross Premium</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(policy.computed_gross_premium)}</p>
          </div>
          {(policy.agent_first_name || policy.agent_surname) && (
            <div>
              <p className="text-sm text-gray-600">Agent Name</p>
              <p className="text-base font-medium text-gray-900">
                {policy.agent_first_name} {policy.agent_surname}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Important Dates Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Important Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <p className="text-sm text-gray-600">Start Date</p>
            <p className="text-base font-medium text-gray-900">{formatDate(policy.policy_start_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Maturity Date</p>
            <p className="text-base font-medium text-gray-900">{formatDate(policy.policy_maturity_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Issued Date</p>
            <p className="text-base font-medium text-gray-900">{formatDate(policy.policy_issued_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Cash Back</p>
            <p className="text-base font-medium text-gray-900">{formatDate(policy.next_cash_back_date)}</p>
          </div>
        </div>
      </div>

      {/* Payment Verification Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Verification</h2>
        {paymentStatus?.verified ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium text-lg">PAYMENT VERIFIED</span>
              {paymentStatus.payments?.length > 1 && (
                <button
                  onClick={() => setShowAllPayments(!showAllPayments)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-2 transition-colors"
                >
                  ({paymentStatus.payments.length} payments on record) {showAllPayments ? '▲' : '▼'}
                </button>
              )}
            </div>
            
            {/* Latest Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-base font-medium text-gray-900">
                  {formatCurrency(paymentStatus.latestPayment?.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-base font-medium text-gray-900">
                  {formatDate(paymentStatus.latestPayment?.date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reference</p>
                <p className="text-base font-medium text-gray-900">
                  {paymentStatus.latestPayment?.reference || 'N/A'}
                </p>
              </div>
            </div>

            {/* Expandable Payment History */}
            {showAllPayments && paymentStatus.payments?.length > 1 && (
              <div className="mt-6 border-t pt-4 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Complete Payment History</h3>
                  <span className="text-sm text-gray-600">
                    Total: {formatCurrency(
                      paymentStatus.payments.reduce((sum, p) => sum + (p.payment_amount || 0), 0)
                    )}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">#</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Amount</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Reference</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentStatus.payments.map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-600">{index + 1}</td>
                          <td className="py-2 px-3 text-gray-900">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {formatCurrency(payment.payment_amount)}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {payment.payment_reference || 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {payment.payment_method || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">No payment verification found</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Owner 1 Tab Component
function Owner1Tab({ policy, formatDate }) {
  return (
    <div className="space-y-3">
      {/* Personal Details Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Personal Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <p className="text-sm text-gray-600">Title</p>
            <p className="text-base font-medium text-gray-900">{policy.owner1_title || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Surname</p>
            <p className="text-base font-medium text-gray-900">{policy.owner1_surname || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">First Name</p>
            <p className="text-base font-medium text-gray-900">{policy.owner1_first_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Maiden Name</p>
            <p className="text-base font-medium text-gray-900">{policy.owner1_maiden_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">NIC</p>
            <p className="text-base font-medium text-gray-900">{policy.owner1_nic || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Contact Information & Address Card */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Contact Information & Address</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600">SMS Number</p>
                <p className="text-sm font-medium text-gray-900">{policy.owner1_sms_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Mobile Number</p>
                <p className="text-sm font-medium text-gray-900">{policy.owner1_mobile_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Home Telephone</p>
                <p className="text-sm font-medium text-gray-900">{policy.owner1_home_tel_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Email Address</p>
                <p className="text-sm font-medium text-gray-900">{policy.owner1_email || 'N/A'}</p>
              </div>
            </div>
            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {policy.owner1_mobile_no && (
                <a
                  href={`tel:${policy.owner1_mobile_no}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              )}
              {policy.owner1_email && (
                <a
                  href={`mailto:${policy.owner1_email}`}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Email
                </a>
              )}
            </div>
          </div>
          
          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Address</h3>
            <div className="space-y-1">
              {policy.owner1_address_1 && (
                <p className="text-sm text-gray-900">{policy.owner1_address_1}</p>
              )}
              {policy.owner1_address_2 && (
                <p className="text-sm text-gray-900">{policy.owner1_address_2}</p>
              )}
              {policy.owner1_address_3 && (
                <p className="text-sm text-gray-900">{policy.owner1_address_3}</p>
              )}
              {policy.owner1_address_4 && (
                <p className="text-sm text-gray-900">{policy.owner1_address_4}</p>
              )}
              {!policy.owner1_address_1 && !policy.owner1_address_2 && !policy.owner1_address_3 && !policy.owner1_address_4 && (
                <p className="text-sm text-gray-500">No address on file</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Owner 2 Tab Component
function Owner2Tab({ policy }) {
  const hasOwner2 = policy.owner2_first_name || policy.owner2_surname || policy.owner2_nic

  if (!hasOwner2) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Secondary Owner</h3>
        <p className="text-gray-600">This policy does not have a second owner registered.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personal Details Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Title</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_title || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Surname</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_surname || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">First Name</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_first_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">NIC</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_nic || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Contact Information Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">SMS Number</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_sms_no || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Mobile Number</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_mobile_no || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Home Telephone</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_home_tel_no || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email Address</p>
            <p className="text-base font-medium text-gray-900">{policy.owner2_email || 'N/A'}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          {policy.owner2_mobile_no && (
            <a
              href={`tel:${policy.owner2_mobile_no}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call Mobile</span>
            </a>
          )}
          {policy.owner2_email && (
            <a
              href={`mailto:${policy.owner2_email}`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <span>Send Email</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// Interactions Tab Component
function InteractionsTab({ interactions, formatCurrency, formatDate }) {
  if (interactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Interactions Yet</h3>
        <p className="text-gray-600">No call interactions have been logged for this policy.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {interactions.map((interaction) => (
        <div key={interaction.id} className="bg-white rounded-lg shadow p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(interaction.client_calling_date)}
              </p>
              <p className="text-sm text-gray-600">
                Logged at {new Date(interaction.created_at * 1000).toLocaleTimeString('en-GB')}
              </p>
            </div>
            {interaction.outcome_1 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {interaction.outcome_1}
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {interaction.recovery_type && (
              <div>
                <p className="text-sm text-gray-600">Recovery Type</p>
                <p className="text-base font-medium text-gray-900">{interaction.recovery_type}</p>
              </div>
            )}
            {interaction.amount_paid > 0 && (
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-base font-medium text-green-600">{formatCurrency(interaction.amount_paid)}</p>
              </div>
            )}
            {interaction.follow_up_date && (
              <div>
                <p className="text-sm text-gray-600">Follow Up Date</p>
                <p className="text-base font-medium text-gray-900">{formatDate(interaction.follow_up_date)}</p>
              </div>
            )}
            {interaction.mode_of_payment && (
              <div>
                <p className="text-sm text-gray-600">Payment Mode</p>
                <p className="text-base font-medium text-gray-900">{interaction.mode_of_payment}</p>
              </div>
            )}
          </div>

          {/* Remarks */}
          {interaction.calling_remarks && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-1">Remarks</p>
              <p className="text-base text-gray-900">{interaction.calling_remarks}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
