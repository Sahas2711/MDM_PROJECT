import { motion } from 'framer-motion'
import { BarChart3, Bot, Brain, LayoutDashboard, Leaf, LineChart, Microscope, Zap } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import useTranslate from '../../hooks/useTranslate'

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard',          to: '/',                    icon: LayoutDashboard },
      { label: 'Smart Decision',     to: '/smart-decision',      icon: Zap },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { label: 'Sell Timing',        to: '/sell-timing',         icon: LineChart },
      { label: 'Market Intelligence',to: '/market-intelligence', icon: BarChart3 },
      { label: 'Crop Recommendation',to: '/crop-recommendation', icon: Leaf },
    ],
  },
  {
    label: 'AI',
    items: [
      { label: 'Model Insights',     to: '/model-performance',   icon: Microscope },
      { label: 'AI Assistant',       to: '/ai-assistant',        icon: Bot },
    ],
  },
]

const sidebarAnim = {
  expanded:  { width: 260 },
  collapsed: { width: 72 },
}
const labelAnim = {
  expanded:  { opacity: 1, x: 0, display: 'block' },
  collapsed: { opacity: 0, x: -8, transitionEnd: { display: 'none' } },
}

function Sidebar({ collapsed }) {
  const tr = useTranslate()
  return (
    <motion.aside
      className="sidebar"
      variants={sidebarAnim}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Brain size={18} />
        </div>
        <motion.div
          className="sidebar-brand-copy"
          variants={labelAnim}
          initial={false}
          animate={collapsed ? 'collapsed' : 'expanded'}
          transition={{ duration: 0.16 }}
        >
          <p>AgriIntel</p>
          <small>AI Platform</small>
        </motion.div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto" aria-label="Primary navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="sidebar-section-label">{tr(group.label)}</p>
            )}
            <div className="sidebar-nav mb-2">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `sidebar-link${isActive ? ' active' : ''}${collapsed ? ' justify-center' : ''}`
                    }
                    title={collapsed ? tr(item.label) : undefined}
                  >
                    <Icon className="sidebar-icon" />
                    <motion.span
                      variants={labelAnim}
                      initial={false}
                      animate={collapsed ? 'collapsed' : 'expanded'}
                      transition={{ duration: 0.16 }}
                    >
                      {tr(item.label)}
                    </motion.span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="mt-auto pt-4 border-t border-border-soft px-2">
          <p className="text-xs text-text-muted text-center">v1.0.0 · AgriIntel AI</p>
        </div>
      )}
    </motion.aside>
  )
}

export default Sidebar
