import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { initializeScheduler, cleanupScheduler } from './utils/schedulerInit'
import { initializeDatabaseCheck } from './utils/databaseFieldChecker'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import OTPVerification from './pages/auth/OTPVerification'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPasswordOTP from './pages/auth/ResetPasswordOTP'
import Dashboard from './pages/Dashboard'
import CustomerList from './pages/customers/CustomerList'
import CustomerDetail from './pages/customers/CustomerDetail'
import CustomerUpload from './pages/admin/CustomerUpload'
import Reports from './pages/admin/Reports'
import AdminDashboard from './pages/admin/AdminDashboard'
import AgentManagement from './pages/admin/AgentManagement'
import BranchManagement from './pages/admin/BranchManagement'
import ReminderScheduler from './pages/admin/ReminderScheduler'
import QuickQRGenerator from './pages/QuickQRGenerator'
import PaymentPlanTest from './pages/test/PaymentPlanTest'
import InstallmentReminder from './pages/InstallmentReminder'
import LOBDashboard from './components/sales/LOBDashboard'

function App() {
  // Initialize scheduler and check database when app starts
  useEffect(() => {
    const initialize = async () => {
      // Check database schema first
      const dbCheck = await initializeDatabaseCheck()

      // Make database check available globally for debugging
      if (import.meta.env.DEV) {
        window.dbCheck = dbCheck
        console.log('🔧 Database check available as window.dbCheck')
      }

      // Initialize scheduler
      initializeScheduler()
    }

    initialize()

    // Cleanup when app unmounts
    return () => {
      cleanupScheduler()
    }
  }, [])

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/otp-verify" element={<OTPVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password-otp" element={<ResetPasswordOTP />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="quick-qr" element={<QuickQRGenerator />} />
          <Route path="lob/:lobType" element={<LOBDashboard />} />
          <Route path="lob/:lobType/:month" element={<LOBDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/upload" element={<CustomerUpload />} />
          <Route path="admin/reports" element={<Reports />} />
          <Route path="admin/agents" element={<AgentManagement />} />
          <Route path="admin/branches" element={<BranchManagement />} />
          <Route path="admin/scheduler" element={<ReminderScheduler />} />
          <Route path="test/payment-plan" element={<PaymentPlanTest />} />
        </Route>

        {/* Public reminder pages - outside protected routes */}
        <Route path="/reminder/:installmentId" element={<InstallmentReminder />} />
      </Routes>
    </AuthProvider>
  )
}

export default App