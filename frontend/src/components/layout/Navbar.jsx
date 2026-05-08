import { motion } from 'framer-motion'
import { Bell, Moon, Sun, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LANGUAGES, useLang } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { fetchBackendHealth, fetchPredictionHistory, fetchVoiceHealth } from '../../services/api'

function Navbar({ onToggleSidebar }) {
  const { lang, setLang } = useLang()
  const { theme, toggleTheme } = useTheme()
  const [backendOk, setBackendOk] = useState(false)
  const [voiceOk, setVoiceOk] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)

  useEffect(() => {
    let active = true

    Promise.allSettled([
      fetchBackendHealth(),
      fetchVoiceHealth(),
      fetchPredictionHistory(5),
    ]).then(([backend, voice, history]) => {
      if (!active) return
      setBackendOk(backend.status === 'fulfilled')
      setVoiceOk(voice.status === 'fulfilled')
      setHistoryCount(history.status === 'fulfilled' ? history.value.history?.length || 0 : 0)
    })

    return () => {
      active = false
    }
  }, [])

  const overallOnline = backendOk || voiceOk
  const systemLabel = useMemo(() => {
    if (backendOk && voiceOk) return 'Backend + assistant live'
    if (backendOk) return 'Backend live'
    if (voiceOk) return 'Assistant live'
    return 'Services unavailable'
  }, [backendOk, voiceOk])

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
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-soft bg-bg-elevated px-3 text-xs font-semibold text-text-primary shadow-sm transition hover:border-green-neon"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        <div className="flex items-center gap-1 rounded-lg border border-border-soft bg-bg-elevated px-1 py-1 shadow-sm">
          {Object.entries(LANGUAGES).map(([code, meta]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide transition ${
                lang === code
                  ? 'border border-brand-neonCyan/30 bg-brand-neonCyan/20 text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {meta.short}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-bg-elevated px-3 py-1.5 shadow-sm">
          <div className="status-dot" />
          <span className="text-xs font-medium text-text-primary">{systemLabel}</span>
          {overallOnline ? (
            <Wifi size={12} className="ml-1 text-green-neon" />
          ) : (
            <WifiOff size={12} className="ml-1 text-red-500" />
          )}
        </div>

        <button type="button" className="relative rounded-lg border border-border-soft bg-bg-elevated p-2 text-text-muted transition-colors hover:border-green-neon hover:text-green-neon">
          <Bell size={16} />
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-green-neon text-[9px] font-bold text-white">
            {historyCount}
          </span>
        </button>

        <div className="user-pill">
          <div className="user-avatar">AI</div>
          <div className="user-meta">
            <p>AgriIntel</p>
            <span>{overallOnline ? 'Live system' : 'Waiting for services'}</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

export default Navbar
