import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import FollowUpLoginAlert from '../alerts/FollowUpLoginAlert'
import { useFollowUpNotifications } from '../../hooks/useFollowUpNotifications'

const Layout = () => {
  const { showLoginAlert, dismissLoginAlert, alertSummary } = useFollowUpNotifications()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 w-full">
          <Outlet />
        </main>
      </div>
      
      {/* Follow-Up Login Alert */}
      <FollowUpLoginAlert
        isOpen={showLoginAlert}
        onClose={dismissLoginAlert}
        alertSummary={alertSummary}
      />
    </div>
  )
}

export default Layout