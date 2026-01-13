import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useFollowUpNotifications } from '../../hooks/useFollowUpNotifications'
import { LogOut, User, Menu, X, Home, Users, BarChart3, Upload, Shield, QrCode, Building2, Clock, Settings, Phone, FileText, Calendar } from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { notificationCount, notificationText, hasUrgentNotifications } = useFollowUpNotifications()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Complete navigation items (same logic as Sidebar)
  const getNavItems = () => {
    const salesAgentNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
      { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
      { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
    ]

    const csrNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
      { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
      { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
    ]

    const callCenterAgentNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
      { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
      { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
    ]

    const internalAgentNavItems = [
      { to: '/', icon: Home, label: 'LOB Dashboard' },
      { to: '/customers', icon: Users, label: 'All Customers' },
      { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
      { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
      { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
    ]

    // CSL Agent Navigation (Branch 13)
    const cslAgentNavItems = [
      { to: '/csl', icon: Phone, label: 'CSL Dashboard' },
      { to: '/csl/reports', icon: BarChart3, label: 'CSL Reports' }
    ]

    const adminNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/admin', icon: Shield, label: 'Admin Panel' },
      { to: '/admin/upload', icon: Upload, label: 'Upload Data' },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
      { to: '/admin/agents', icon: Users, label: 'Manage Agents' },
      { to: '/admin/branches', icon: Building2, label: 'Manage Branches' },
      ...(user?.role === 'admin' || user?.role === 'life_admin' ? [
        { to: '/admin/bulk-agents', icon: Upload, label: 'Bulk Agent Creation' }
      ] : []),
      { to: '/admin/scheduler', icon: Clock, label: 'Reminder Scheduler' },
      // CSL Admin items (only for life_admin and super admin)
      ...(user?.role === 'admin' || user?.role === 'life_admin' ? [
        { to: '/admin/csl/upload-policies', icon: Upload, label: 'Upload CSL Policies', section: 'CSL Management' },
        { to: '/admin/csl/upload-payments', icon: FileText, label: 'Upload CSL Payments', section: 'CSL Management' },
        { to: '/admin/csl/dropdown-config', icon: Settings, label: 'CSL Dropdowns', section: 'CSL Management' },
        { to: '/admin/csl/agent-reports', icon: BarChart3, label: 'CSL Agent Reports', section: 'CSL Management' }
      ] : [])
    ]

    // Choose navigation based on user role and agent type
    if (user?.role === 'admin') return adminNavItems
    // CSL agents (Branch 13) get special navigation
    if (user?.branch_id === 13 && (user?.role === 'internal_agent' || user?.role === 'agent')) return cslAgentNavItems
    if (user?.agent_type === 'sales_agent') return salesAgentNavItems
    if (user?.agent_type === 'csr') return csrNavItems
    if (user?.agent_type === 'internal') return internalAgentNavItems
    return callCenterAgentNavItems // Default for call_center agents
  }

  const navItems = getNavItems()

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile hamburger menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>

              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                Insurance Call Center
              </h1>
            </div>

            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                <span className="text-xs md:text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.name}
                </span>
              </div>

              <button
                onClick={logout}
                className="flex items-center space-x-1 md:space-x-2 px-2 md:px-3 py-2 text-xs md:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeMobileMenu}
          ></div>

          {/* Menu panel */}
          <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <nav className="p-4 space-y-2">
              {navItems.map(({ to, icon: Icon, label, section }, index) => (
                <div key={to}>
                  {/* Section header for CSL Management */}
                  {section && (index === 0 || navItems[index - 1]?.section !== section) && (
                    <div className="mt-4 mb-2 px-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {section}
                      </h3>
                    </div>
                  )}
                  
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${isActive
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{label}</span>
                    {/* Show notification badge for Follow-Ups */}
                    {to === '/follow-ups' && hasUrgentNotifications && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                        {notificationText}
                      </span>
                    )}
                  </NavLink>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar