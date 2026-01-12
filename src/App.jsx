import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { deviceService } from './services/deviceService'
import { initializeScheduler, cleanupScheduler } from './utils/schedulerInit'
import { initializeDatabaseCheck } from './utils/databaseFieldChecker'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoleProtectedRoute from './components/auth/RoleProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import OTPVerification from './pages/auth/OTPVerification'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPasswordOTP from './pages/auth/ResetPasswordOTP'
import Unauthorized from './pages/auth/Unauthorized'
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
import AgentQRSummary from './pages/AgentQRSummary'
import PaymentPlanTest from './pages/test/PaymentPlanTest'
import InstallmentReminder from './pages/InstallmentReminder'
import LOBDashboard from './components/sales/LOBDashboard'
import CSLDropdownConfig from './pages/admin/csl/CSLDropdownConfig'
import CSLPolicyUpload from './pages/admin/csl/CSLPolicyUpload'
import CSLPaymentUpload from './pages/admin/csl/CSLPaymentUpload'
import CSLAgentReports from './pages/admin/csl/CSLAgentReports'
import CSLDashboard from './pages/csl/CSLDashboard'
import CSLPolicyDetail from './pages/csl/CSLPolicyDetail'
import CSLReports from './pages/csl/CSLReports'
import FollowUpDashboard from './pages/FollowUpDashboard'
import BulkAgentCreation from './pages/admin/BulkAgentCreation'

function App() {
  // Initialize scheduler and check database when app starts
  useEffect(() => {
    const initialize = async () => {
      // Check for device auto-linking from Windows client
      if (deviceService.isAutoLinkRequested()) {
        const urlComputerName = deviceService.getComputerNameFromURL();
        const urlDeviceId = deviceService.getDeviceIdFromURL();
        
        if (urlComputerName || urlDeviceId) {
          console.log('🔗 Auto-linking requested from Windows client:', { 
            computer_name: urlComputerName, 
            device_id: urlDeviceId 
          });
          
          // Store the values in localStorage for when user logs in
          if (urlDeviceId) {
            localStorage.setItem('linked_device_id', urlDeviceId);
          }
          if (urlComputerName) {
            localStorage.setItem('computer_name', urlComputerName);
          }
          
          console.log('✅ Device parameters stored for auto-linking on login');
        }
      }
      
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
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/otp-verify" element={<OTPVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password-otp" element={<ResetPasswordOTP />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/reminder/:installmentId" element={<InstallmentReminder />} />
        
        {/* Protected routes with role-based authorization */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Basic authenticated routes - all users */}
          <Route index element={
            <RoleProtectedRoute>
              <Dashboard />
            </RoleProtectedRoute>
          } />
          
          <Route path="follow-ups" element={
            <RoleProtectedRoute>
              <FollowUpDashboard />
            </RoleProtectedRoute>
          } />
          
          <Route path="quick-qr" element={
            <RoleProtectedRoute>
              <QuickQRGenerator />
            </RoleProtectedRoute>
          } />
          
          <Route path="qr-summary" element={
            <RoleProtectedRoute>
              <AgentQRSummary />
            </RoleProtectedRoute>
          } />
          
          {/* Customer routes - requires customer access permission */}
          <Route path="customers" element={
            <RoleProtectedRoute>
              <CustomerList />
            </RoleProtectedRoute>
          } />
          
          <Route path="customers/:id" element={
            <RoleProtectedRoute>
              <CustomerDetail />
            </RoleProtectedRoute>
          } />
          
          {/* LOB Dashboard routes */}
          <Route path="lob/:lobType" element={
            <RoleProtectedRoute>
              <LOBDashboard />
            </RoleProtectedRoute>
          } />
          
          <Route path="lob/:lobType/:month" element={
            <RoleProtectedRoute>
              <LOBDashboard />
            </RoleProtectedRoute>
          } />
          
          {/* Admin routes - admin/life_admin only */}
          <Route path="admin" element={
            <RoleProtectedRoute>
              <AdminDashboard />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/upload" element={
            <RoleProtectedRoute>
              <CustomerUpload />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/reports" element={
            <RoleProtectedRoute>
              <Reports />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/agents" element={
            <RoleProtectedRoute>
              <AgentManagement />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/branches" element={
            <RoleProtectedRoute>
              <BranchManagement />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/bulk-agents" element={
            <RoleProtectedRoute>
              <BulkAgentCreation />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/scheduler" element={
            <RoleProtectedRoute>
              <ReminderScheduler />
            </RoleProtectedRoute>
          } />
          
          {/* CSL Admin Routes - admin/life_admin only */}
          <Route path="admin/csl/upload-policies" element={
            <RoleProtectedRoute>
              <CSLPolicyUpload />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/csl/upload-payments" element={
            <RoleProtectedRoute>
              <CSLPaymentUpload />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/csl/dropdown-config" element={
            <RoleProtectedRoute>
              <CSLDropdownConfig />
            </RoleProtectedRoute>
          } />
          
          <Route path="admin/csl/agent-reports" element={
            <RoleProtectedRoute>
              <CSLAgentReports />
            </RoleProtectedRoute>
          } />
          
          {/* CSL Agent Routes - branch 13 agents */}
          <Route path="csl" element={
            <RoleProtectedRoute>
              <CSLDashboard />
            </RoleProtectedRoute>
          } />
          
          <Route path="csl/policy/:id" element={
            <RoleProtectedRoute>
              <CSLPolicyDetail />
            </RoleProtectedRoute>
          } />
          
          <Route path="csl/reports" element={
            <RoleProtectedRoute>
              <CSLReports />
            </RoleProtectedRoute>
          } />
          
          {/* Test routes - development only */}
          <Route path="test/payment-plan" element={
            <RoleProtectedRoute>
              <PaymentPlanTest />
            </RoleProtectedRoute>
          } />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App