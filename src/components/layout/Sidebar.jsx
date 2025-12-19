import { NavLink } from 'react-router-dom'
import { Home, Users, BarChart3, Upload, Shield, QrCode, Building2, Clock, Settings, Phone, FileText, Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useFollowUpNotifications } from '../../hooks/useFollowUpNotifications'

const Sidebar = () => {
  const { user } = useAuth()
  const { notificationCount, notificationText, hasUrgentNotifications } = useFollowUpNotifications()



  // Different navigation for different agent types
  const salesAgentNavItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
    { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
    { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
    // Sales agents can generate QR for new customers
  ]

  const csrNavItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/follow-ups', icon: Calendar, label: 'Follow-Ups' },
    { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' },
    { to: '/qr-summary', icon: BarChart3, label: 'My QR Performance' }
    // CSRs use LOB Dashboard for customer access (no separate Customers link)
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
  const getNavItems = () => {
    if (user?.role === 'admin') return adminNavItems
    // CSL agents (Branch 13) get special navigation
    if (user?.branch_id === 13 && (user?.role === 'internal_agent' || user?.role === 'agent')) return cslAgentNavItems
    if (user?.agent_type === 'sales_agent') return salesAgentNavItems
    if (user?.agent_type === 'csr') return csrNavItems
    if (user?.agent_type === 'internal') return internalAgentNavItems
    return callCenterAgentNavItems // Default for call_center agents
  }

  const navItems = getNavItems()

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen hidden md:block">
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
              to={to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
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
    </aside>
  )
}

export default Sidebar