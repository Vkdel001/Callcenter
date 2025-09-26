import { NavLink } from 'react-router-dom'
import { Home, Users, BarChart3, Upload, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Sidebar = () => {
  const { user } = useAuth()
  

  
  const agentNavItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/customers', icon: Users, label: 'Customers' }
  ]

  const adminNavItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/admin', icon: Shield, label: 'Admin Panel' },
    { to: '/admin/upload', icon: Upload, label: 'Upload Data' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/admin/agents', icon: Users, label: 'Manage Agents' }
  ]

  const navItems = user?.role === 'admin' ? adminNavItems : agentNavItems

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
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
    </aside>
  )
}

export default Sidebar