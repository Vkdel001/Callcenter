import { useState } from 'react'
import { paymentPlanService } from '../../services/paymentPlanService'
import { installmentService } from '../../services/installmentService'
import { Play, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'

const PaymentPlanTest = () => {
  const [testData, setTestData] = useState({
    customer_id: 1,
    policy_number: 'TEST001',
    outstanding_amount: 10000,
    down_payment: 1000,
    months: 12
  })
  
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})
  const [createdPlan, setCreatedPlan] = useState(null)
  const [installments, setInstallments] = useState([])

  const updateTestData = (field, value) => {
    setTestData(prev => ({
      ...prev,
      [field]: field.includes('amount') || field === 'months' || field === 'customer_id' 
        ? parseFloat(value) || 0 
        : value
    }))
  }

  const runTest = async (testName, testFunction) => {
    setLoading(prev => ({ ...prev, [testName]: true }))
    try {
      const result = await testFunction()
      setResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }))
      return result
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testName]: { success: false, error: error.message }
      }))
      console.error(`Test ${testName} failed:`, error)
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }))
    }
  }

  const testCalculations = async () => {
    return runTest('calculations', async () => {
      const calculations = paymentPlanService.calculateInstallments(
        testData.outstanding_amount,
        testData.down_payment,
        testData.months
      )
      return calculations
    })
  }

  const testScheduleGeneration = async () => {
    return runTest('schedule', async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7) // Start next week
      
      const calculations = paymentPlanService.calculateInstallments(
        testData.outstanding_amount,
        testData.down_payment,
        testData.months
      )
      
      const schedule = paymentPlanService.generateInstallmentSchedule(
        startDate,
        testData.months,
        calculations.installmentAmount
      )
      return schedule
    })
  }

  const testCreatePaymentPlan = async () => {
    return runTest('createPlan', async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7)
      
      const calculations = paymentPlanService.calculateInstallments(
        testData.outstanding_amount,
        testData.down_payment,
        testData.months
      )
      
      const planData = {
        customer_id: testData.customer_id,
        agent_id: 1, // Test agent ID
        policy_number: testData.policy_number,
        outstanding_amount: testData.outstanding_amount,
        down_payment: testData.down_payment,
        total_installments: testData.months,
        installment_amount: calculations.installmentAmount,
        payment_frequency: 'monthly',
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date(startDate.getFullYear(), startDate.getMonth() + testData.months, startDate.getDate()).toISOString().split('T')[0],
        status: 'active',
        agreement_date: new Date().toISOString(),
        notes: 'Test payment plan'
      }
      
      const plan = await paymentPlanService.createPaymentPlan(planData)
      setCreatedPlan(plan)
      return plan
    })
  }

  const testCreateInstallments = async () => {
    if (!createdPlan) {
      alert('Please create a payment plan first')
      return
    }
    
    return runTest('createInstallments', async () => {
      const startDate = new Date(createdPlan.start_date)
      const schedule = paymentPlanService.generateInstallmentSchedule(
        startDate,
        createdPlan.total_installments,
        createdPlan.installment_amount
      )
      
      const installmentsResult = await installmentService.createInstallments(
        createdPlan.id,
        schedule
      )
      setInstallments(installmentsResult)
      return installmentsResult
    })
  }

  const testGetInstallments = async () => {
    if (!createdPlan) {
      alert('Please create a payment plan first')
      return
    }
    
    return runTest('getInstallments', async () => {
      const installmentsResult = await installmentService.getPaymentPlanInstallments(createdPlan.id)
      setInstallments(installmentsResult)
      return installmentsResult
    })
  }

  const testFullWorkflow = async () => {
    setResults({})
    setCreatedPlan(null)
    setInstallments([])
    
    try {
      // Step 1: Test calculations
      await testCalculations()
      
      // Step 2: Test schedule generation
      await testScheduleGeneration()
      
      // Step 3: Create payment plan
      await testCreatePaymentPlan()
      
      // Wait a bit for plan creation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 4: Create installments
      await testCreateInstallments()
      
      alert('Full workflow test completed! Check results below.')
    } catch (error) {
      console.error('Full workflow failed:', error)
    }
  }

  const ResultDisplay = ({ testName, result }) => {
    if (!result) return null
    
    return (
      <div className={`p-3 rounded-md border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center mb-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 mr-2" />
          )}
          <span className="font-medium">{testName}</span>
        </div>
        
        {result.success ? (
          <pre className="text-sm bg-white p-2 rounded border overflow-auto max-h-32">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        ) : (
          <p className="text-red-600 text-sm">{result.error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Plan Service Test</h1>
        
        {/* Test Data Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
            <input
              type="number"
              value={testData.customer_id}
              onChange={(e) => updateTestData('customer_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
            <input
              type="text"
              value={testData.policy_number}
              onChange={(e) => updateTestData('policy_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Amount (MUR)</label>
            <input
              type="number"
              value={testData.outstanding_amount}
              onChange={(e) => updateTestData('outstanding_amount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment (MUR)</label>
            <input
              type="number"
              value={testData.down_payment}
              onChange={(e) => updateTestData('down_payment', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Months</label>
            <input
              type="number"
              value={testData.months}
              onChange={(e) => updateTestData('months', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          <button
            onClick={testCalculations}
            disabled={loading.calculations}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading.calculations ? <Clock className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            <span className="ml-2">Test Calculations</span>
          </button>
          
          <button
            onClick={testScheduleGeneration}
            disabled={loading.schedule}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading.schedule ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Test Schedule</span>
          </button>
          
          <button
            onClick={testCreatePaymentPlan}
            disabled={loading.createPlan}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {loading.createPlan ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Create Plan</span>
          </button>
          
          <button
            onClick={testCreateInstallments}
            disabled={loading.createInstallments || !createdPlan}
            className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {loading.createInstallments ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Create Installments</span>
          </button>
          
          <button
            onClick={testGetInstallments}
            disabled={loading.getInstallments || !createdPlan}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading.getInstallments ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">Get Installments</span>
          </button>
          
          <button
            onClick={testFullWorkflow}
            disabled={Object.values(loading).some(Boolean)}
            className="col-span-2 md:col-span-3 lg:col-span-2 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Full Workflow Test
          </button>
        </div>

        {/* Results Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Test Results:</h3>
          
          <ResultDisplay testName="Calculations" result={results.calculations} />
          <ResultDisplay testName="Schedule Generation" result={results.schedule} />
          <ResultDisplay testName="Payment Plan Creation" result={results.createPlan} />
          <ResultDisplay testName="Installments Creation" result={results.createInstallments} />
          <ResultDisplay testName="Get Installments" result={results.getInstallments} />
        </div>

        {/* Created Plan Display */}
        {createdPlan && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Created Payment Plan:</h4>
            <p className="text-sm text-gray-600">Plan ID: {createdPlan.id}</p>
            <p className="text-sm text-gray-600">Policy: {createdPlan.policy_number}</p>
            <p className="text-sm text-gray-600">Amount: MUR {createdPlan.outstanding_amount}</p>
            <p className="text-sm text-gray-600">Installments: {createdPlan.total_installments} x MUR {createdPlan.installment_amount}</p>
          </div>
        )}

        {/* Installments Display */}
        {installments.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Generated Installments:</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">QR Code</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {installments.slice(0, 5).map((installment) => (
                    <tr key={installment.id}>
                      <td className="px-3 py-2 text-sm text-gray-900">{installment.installment_number}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{installment.due_date}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">MUR {installment.amount}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          {installment.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {installment.qr_code_url ? (
                          <span className="text-green-600">✓ Generated</span>
                        ) : (
                          <span className="text-red-600">✗ Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {installments.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">... and {installments.length - 5} more installments</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentPlanTest