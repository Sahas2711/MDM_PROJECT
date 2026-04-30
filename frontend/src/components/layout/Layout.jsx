import { motion } from 'framer-motion'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} />
      <div className="app-content-shell">
        <Navbar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((previous) => !previous)}
        />
        <motion.main
          className="app-main"
          key={location.pathname}
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}

export default Layout
