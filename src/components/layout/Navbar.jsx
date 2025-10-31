import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut, User, Menu, X, Home, Users, BarChart3, Upload, Shield, QrCode, Building2, Clock } from 'lucide-react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Get navigation items based on user role (same logic as Sidebar)
  const getNavItems = () => {
    const salesAgentNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' }
    ]

    const callCenterAgentNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/quick-qr', icon: QrCode, label: 'Quick QR Generator' }
    ]

    const adminNavItems = [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/admin', icon: Shield, label: 'Admin Panel' },
      { to: '/admin/upload', icon: Upload, label: 'Upload Data' },
      { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
      { to: '/admin/agents', icon: Users, label: 'Manage Agents' },
      { to: '/admin/branches', icon: Building2, label: 'Manage Branches' },
      { to: '/admin/scheduler', icon: Clock, label: 'Reminder Scheduler' }
    ]

    if (user?.role === 'admin') return adminNavItems
    if (user?.agent_type === 'sales_agent') return salesAgentNavItems
    return callCenterAgentNavItems
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
              {navItems.map(({ to, icon: Icon, label }) => (
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
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar