import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
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

function App() {
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
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/upload" element={<CustomerUpload />} />
          <Route path="admin/reports" element={<Reports />} />
          <Route path="admin/agents" element={<AgentManagement />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App