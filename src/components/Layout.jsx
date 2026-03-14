import { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import PendingBanner from './PendingBanner'

function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} />

      <main
        className={`
          pt-16 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}
        `}
      >
        <PendingBanner />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
