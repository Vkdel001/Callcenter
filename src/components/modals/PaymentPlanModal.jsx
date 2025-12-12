import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from 'react-query'
import { paymentPlanService } from '../../services/paymentPlanService'
import { installmentService } from '../../services/installmentService'
import { useAuth } from '../../contexts/AuthContext'
import { X, Calculator, Calendar, DollarSign, FileText, AlertCircle, Download, Mail } from 'lucide-react'
import { aodPdfService } from '../../services/aodPdfService'
import { emailService } from '../../services/emailService'

const AODModal = ({ isOpen, onClose, customer, existingPlan = null }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1) // 1: Form, 2: Preview, 3: Success
  const [calculations, setCalculations] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [createdPlan, setCreatedPlan] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      payment_method: 'installments',
      policy_number: customer?.policyNumber || '',
      outstanding_amount: customer?.amountDue || 0,
      // Installment fields
      down_payment: 0,
      months: 6,
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Fund value deduction fields
      fund_deduction_amount: customer?.amountDue || 0,
      fund_policy_number: customer?.policyNumber || '',
      // Benefits transfer fields
      source_policy_number: '',
      target_policy_number: customer?.policyNumber || '',
      notes: ''
    }
  })

  const watchedValues = watch()

  // Auto-calculate when values change - only for installments
  useEffect(() => {
    if (watchedValues.payment_method === 'installments' && watchedValues.outstanding_amount && watchedValues.months) {
      try {
        const calc = paymentPlanService.calculateInstallments(
          parseFloat(watchedValues.outstanding_amount) || 0,
          parseFloat(watchedValues.down_payment) || 0,
          parseInt(watchedValues.months) || 6
        )
        setCalculations(calc)

        // Generate schedule preview
        if (watchedValues.start_date) {
          const schedulePreview = paymentPlanService.generateInstallmentSchedule(
            watchedValues.start_date,
            parseInt(watchedValues.months) || 6,
            calc.installmentAmount
          )
          setSchedule(schedulePreview)
        }
      } catch (error) {
        console.error('Error calculating installments:', error)
        setCalculations(null)
        setSchedule([])
      }
    } else {
      setCalculations(null)
      setSchedule([])
    }
  }, [watchedValues.payment_method, customer?.amountDue, watchedValues.down_payment, watchedValues.months, watchedValues.start_date])

  // Create AOD mutation
  const createPlanMutation = useMutation(
    async (planData) => {
      // Step 1: Check for existing active AOD for this policy
      console.log(`🔍 Checking for existing AOD for policy: ${planData.policy_number}`)
      const existingPlan = await paymentPlanService.getActivePlanForPolicy(planData.policy_number)

      if (existingPlan) {
        console.log('📋 Found existing AOD:', existingPlan)
        const confirmReplace = window.confirm(
          `An active AOD already exists for policy ${planData.policy_number} (ID: ${existingPlan.id}).\n\nStatus: ${existingPlan.status}\nSignature Status: ${existingPlan.signature_status || 'N/A'}\n\nDo you want to replace it with the new AOD agreement?`
        )

        if (!confirmReplace) {
          throw new Error('AOD creation cancelled by user')
        }

        // Cancel the existing plan
        await paymentPlanService.cancelPaymentPlan(existingPlan.id)
      }

      // Step 2: Create new payment plan with signature workflow
      const planDataWithSignature = {
        ...planData,
        signature_status: 'pending_signature',
        signature_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        signature_reminder_count: 0,
        created_by_agent: parseInt(user?.id) || 0
      }
      
      const plan = await paymentPlanService.createPaymentPlan(planDataWithSignature)

      // Step 3: Create installments with QR codes (only for installment payments)
      // Note: Installments are created but won't be active until signature is received
      let installments = []
      if (planDataWithSignature.payment_method === 'installments') {
        installments = await installmentService.createInstallments(plan.id, schedule)
      }

      return { plan, installments }
    },
    {
      onSuccess: ({ plan, installments }) => {
        setCreatedPlan({ ...plan, installments })
        setStep(3)
        // Refresh all customer-related data
        queryClient.invalidateQueries(['customer', customer.id])
        queryClient.invalidateQueries(['customerAOD', customer.id])
        queryClient.invalidateQueries(['customerInstallments'])
        queryClient.invalidateQueries('customers')
      },
      onError: (error) => {
        alert(`Failed to create payment plan: ${error.message}`)
      }
    }
  )

  const onSubmit = (data) => {
    if (step === 1) {
      setStep(2) // Go to preview
      return
    }

    if (step === 2) {
      // Create the AOD plan data
      console.log('Creating AOD with customer:', customer)
      console.log('Customer ID field:', customer?.id)

      const planData = {
        customer: parseInt(customer?.id) || 0,  // Changed from customer_id to customer
        agent: parseInt(user?.id) || 0,         // Changed from agent_id to agent  
        policy_number: customer?.policyNumber || '',
        outstanding_amount: parseFloat(data.outstanding_amount) || 0,  // Use edited amount from form
        payment_method: data.payment_method || 'installments',
        status: 'active',
        agreement_date: new Date().toISOString(),
        notes: data.notes || ''
      }

      console.log('AOD Plan Data being sent:', planData)

      // Add method-specific fields
      if (data.payment_method === 'installments') {
        planData.down_payment = parseFloat(data.down_payment) || 0
        planData.total_installments = parseInt(data.months) || 6
        planData.installment_amount = calculations?.installmentAmount || 0
        planData.payment_frequency = 'monthly'
        planData.start_date = data.start_date
        if (data.start_date) {
          const endDate = new Date(data.start_date)
          endDate.setMonth(endDate.getMonth() + (parseInt(data.months) || 6))
          planData.end_date = endDate.toISOString().split('T')[0]
        }
      } else if (data.payment_method === 'fund_deduction') {
        planData.fund_deduction_amount = parseFloat(data.fund_deduction_amount) || 0
        planData.fund_policy_number = data.fund_policy_number || ''
      } else if (data.payment_method === 'benefits_transfer') {
        planData.source_policy_number = data.source_policy_number || ''
        planData.target_policy_number = data.target_policy_number || ''
      }



      createPlanMutation.mutate(planData)
    }
  }

  const handleClose = () => {
    setStep(1)
    setCalculations(null)
    setSchedule([])
    setCreatedPlan(null)
    setGeneratingPdf(false)
    setSendingEmail(false)
    reset()
    onClose()
  }

  const handleGeneratePdf = async () => {
    if (!createdPlan || !customer) return

    setGeneratingPdf(true)
    try {
      // Fetch complete customer data including title, national_id, address fields
      const { customerService } = await import('../../services/customerService')
      const fullCustomer = await customerService.getCustomerById(customer.id)
      
      console.log('📋 Full customer data for PDF:', fullCustomer)
      
      await aodPdfService.downloadPdf(createdPlan, fullCustomer, createdPlan.installments || [])
      alert('AOD PDF downloaded successfully!')
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert(`Failed to generate PDF: ${error.message}`)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleEmailAOD = async () => {
    if (!createdPlan || !customer) return

    setSendingEmail(true)
    try {
      // Fetch complete customer data including title, national_id, address fields
      const { customerService } = await import('../../services/customerService')
      const fullCustomer = await customerService.getCustomerById(customer.id)
      
      console.log('📋 Full customer data for email:', fullCustomer)
      
      // Generate PDF blob for email attachment
      const pdfBlob = await aodPdfService.getPdfBlob(createdPlan, fullCustomer, createdPlan.installments || [])

      // Send email with PDF attachment
      const result = await emailService.sendAODEmail(fullCustomer, createdPlan, pdfBlob, createdPlan.installments || [], user)

      if (result.success) {
        alert('AOD PDF emailed successfully to customer! (You have been CC\'d)')
      } else {
        alert(`Failed to send email: ${result.error}`)
      }
    } catch (error) {
      console.error('Email sending failed:', error)
      alert(`Failed to send email: ${error.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const goBack = () => {
    if (step === 2) setStep(1)
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-medium text-gray-900">
              Create Acknowledgment of Debt
            </h3>
            <p className="text-sm text-gray-600">
              Customer: {customer?.name} | Policy: {customer?.policyNumber}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <Calculator className="h-4 w-4" />
            </div>
            <span className="ml-2 text-sm font-medium">Details</span>
          </div>

          <div className={`w-16 h-1 mx-4 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>

          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="ml-2 text-sm font-medium">Preview</span>
          </div>

          <div className={`w-16 h-1 mx-4 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>

          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <Calendar className="h-4 w-4" />
            </div>
            <span className="ml-2 text-sm font-medium">Complete</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: AOD Details */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      {...register('payment_method', { required: 'Payment method is required' })}
                      type="radio"
                      value="installments"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Monthly Installment Payments</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      {...register('payment_method')}
                      type="radio"
                      value="fund_deduction"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Deduction from Fund Value</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      {...register('payment_method')}
                      type="radio"
                      value="benefits_transfer"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Deduction from Forthcoming Benefits</span>
                  </label>
                </div>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    value={customer?.policyNumber || ''}
                    type="text"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auto-filled from customer data</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount for AOD (MUR) *
                  </label>
                  <input
                    {...register('outstanding_amount', {
                      required: 'Amount is required',
                      min: { value: 0.01, message: 'Amount must be greater than 0' },
                      max: { value: 10000000, message: 'Amount is too large' }
                    })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter AOD amount"
                  />
                  {errors.outstanding_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.outstanding_amount.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Pre-filled from customer data. You can edit if needed.
                  </p>
                </div>

              </div>

              {/* Conditional Fields Based on Payment Method */}
              {watchedValues.payment_method === 'installments' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-3">Installment Payment Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Down Payment (MUR)
                      </label>
                      <input
                        {...register('down_payment', {
                          min: { value: 0, message: 'Down payment cannot be negative' }
                        })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                      {errors.down_payment && (
                        <p className="mt-1 text-sm text-red-600">{errors.down_payment.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Months *
                      </label>
                      <select
                        {...register('months', { required: watchedValues.payment_method === 'installments' ? 'Number of months is required' : false })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="1">1 month</option>
                        <option value="2">2 months</option>
                        <option value="3">3 months</option>
                        <option value="4">4 months</option>
                        <option value="5">5 months</option>
                        <option value="6">6 months</option>
                        <option value="7">7 months</option>
                        <option value="8">8 months</option>
                        <option value="9">9 months</option>
                      </select>
                      {errors.months && (
                        <p className="mt-1 text-sm text-red-600">{errors.months.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        {...register('start_date', { required: watchedValues.payment_method === 'installments' ? 'Start date is required' : false })}
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                      {errors.start_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {watchedValues.payment_method === 'fund_deduction' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-medium text-green-900 mb-3">Fund Value Deduction Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deduction Amount (MUR) *
                      </label>
                      <input
                        {...register('fund_deduction_amount', {
                          required: watchedValues.payment_method === 'fund_deduction' ? 'Deduction amount is required' : false,
                          min: { value: 1, message: 'Amount must be greater than 0' }
                        })}
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                      {errors.fund_deduction_amount && (
                        <p className="mt-1 text-sm text-red-600">{errors.fund_deduction_amount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Policy Number *
                      </label>
                      <input
                        {...register('fund_policy_number', {
                          required: watchedValues.payment_method === 'fund_deduction' ? 'Policy number is required' : false
                        })}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Enter policy number"
                      />
                      {errors.fund_policy_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.fund_policy_number.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {watchedValues.payment_method === 'benefits_transfer' && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h4 className="font-medium text-purple-900 mb-3">Benefits Transfer Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Source Policy Number *
                      </label>
                      <input
                        {...register('source_policy_number', {
                          required: watchedValues.payment_method === 'benefits_transfer' ? 'Source policy number is required' : false
                        })}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Policy to deduct benefits from"
                      />
                      {errors.source_policy_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.source_policy_number.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Policy Number *
                      </label>
                      <input
                        {...register('target_policy_number', {
                          required: watchedValues.payment_method === 'benefits_transfer' ? 'Target policy number is required' : false
                        })}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Policy to credit to"
                      />
                      {errors.target_policy_number && (
                        <p className="mt-1 text-sm text-red-600">{errors.target_policy_number.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Additional notes about this payment plan..."
                />
              </div>

              {/* Calculations Preview - Only for Installments */}
              {watchedValues.payment_method === 'installments' && calculations && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                    <Calculator className="h-4 w-4 mr-2" />
                    Payment Calculation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Amount:</span>
                      <p className="font-medium">MUR {calculations.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Down Payment:</span>
                      <p className="font-medium">MUR {(parseFloat(watchedValues.down_payment) || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Remaining:</span>
                      <p className="font-medium">MUR {calculations.remainingAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Monthly Payment:</span>
                      <p className="font-medium text-lg">MUR {calculations.installmentAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Payment Plan Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Policy Number:</span>
                    <p className="font-medium">{customer?.policyNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount for AOD:</span>
                    <p className="font-medium">MUR {parseFloat(watchedValues.outstanding_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Down Payment:</span>
                    <p className="font-medium">MUR {(parseFloat(watchedValues.down_payment) || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Payment:</span>
                    <p className="font-medium">MUR {calculations?.installmentAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">{watchedValues.months} months</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <p className="font-medium">{new Date(watchedValues.start_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Payment Schedule</h4>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {schedule.map((installment) => (
                        <tr key={installment.installment_number}>
                          <td className="px-4 py-2 text-sm text-gray-900">{installment.installment_number}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(installment.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            MUR {installment.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-800">Important Notes:</h5>
                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                      <li>QR codes will be generated for each installment</li>
                      <li>Customers will receive payment reminders via email and SMS</li>
                      <li>This agreement will be legally binding once created</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && createdPlan && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">AOD Agreement Created Successfully!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  AOD ID: {createdPlan.id} | Status: Pending Customer Signature
                </p>
                <p className="text-sm text-orange-600 mt-1 font-medium">
                  ⚠️ Payment reminders will start only after customer returns signed document
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="font-medium text-green-900 mb-3">Next Steps:</h4>

                <div className="flex justify-center space-x-3 mb-4">
                  <button
                    onClick={handleGeneratePdf}
                    disabled={generatingPdf}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generatingPdf ? 'Generating...' : 'Download PDF'}
                  </button>

                  <button
                    onClick={handleEmailAOD}
                    disabled={sendingEmail}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Email to Customer'}
                  </button>
                </div>

                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Download the AOD PDF for your records</li>
                  <li>• Email the PDF to customer for signature</li>
                  <li>• Customer has 30 days to return signed document</li>
                  <li>• Mark as "Signed Copy Received" when customer returns it</li>
                  <li>• Payment reminders will start after signature confirmation</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                {step === 3 ? 'Close' : 'Cancel'}
              </button>

              {step < 3 && (
                <button
                  type="submit"
                  disabled={createPlanMutation.isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createPlanMutation.isLoading
                    ? 'Creating...'
                    : step === 1
                      ? 'Preview AOD'
                      : 'Create AOD Agreement'
                  }
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AODModal