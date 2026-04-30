import { motion } from 'framer-motion'
import { Bell, Menu, Wifi } from 'lucide-react'
import { LANGUAGES, useLang } from '../../context/LanguageContext'

function Navbar({ collapsed, onToggleSidebar }) {
  const { lang, setLang } = useLang()

  return (
    <motion.header
      className="top-navbar"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="top-navbar-left">
        <button type="button" className="icon-button" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <span /><span /><span />
        </button>
        <div>
          <p className="top-navbar-title">AgriIntel AI</p>
          <span className="top-navbar-subtitle">Crop Intelligence Platform</span>
        </div>
      </div>

      <div className="top-navbar-right">
        {/* Language selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border-soft bg-bg-elevated px-1 py-1">
          {Object.entries(LANGUAGES).map(([code, meta]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide transition ${
                lang === code
                  ? 'bg-brand-neonCyan/20 text-brand-neonCyan border border-brand-neonCyan/40'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {meta.short}
            </button>
          ))}
        </div>

        {/* System status */}
        <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-bg-elevated px-3 py-1.5">
          <div className="status-dot" />
          <span className="text-xs font-medium text-green-neon">System Online</span>
          <Wifi size={12} className="text-green-neon ml-1" />
        </div>

        {/* Notifications */}
        <button type="button" className="relative rounded-lg border border-border-soft bg-bg-elevated p-2 text-text-muted hover:border-green-neon hover:text-green-neon transition-colors">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-neon text-bg-canvas text-[9px] font-bold grid place-items-center">3</span>
        </button>

        {/* User */}
        <div className="user-pill">
          <div className="user-avatar">AI</div>
          <div className="user-meta">
            <p>AgriIntel</p>
            <span>AI System</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

export default Navbar
