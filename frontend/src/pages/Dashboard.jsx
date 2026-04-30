import { motion } from 'framer-motion'
import { Activity, Brain, CheckCircle, Cpu, TrendingUp, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import useTranslate from '../hooks/useTranslate'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { fetchPredictImage } from '../services/api'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import useAiLoading from '../hooks/useAiLoading'
import { cn } from '../lib/utils'

const priceData = [
  { day: 'Mon', min: 920,  max: 1410, modal: 1160 },
  { day: 'Tue', min: 880,  max: 1360, modal: 1120 },
  { day: 'Wed', min: 910,  max: 1470, modal: 1185 },
  { day: 'Thu', min: 975,  max: 1525, modal: 1235 },
  { day: 'Fri', min: 990,  max: 1600, modal: 1295 },
  { day: 'Sat', min: 950,  max: 1490, modal: 1210 },
]

const modelAccuracy = [
  { model: 'Random Forest', acc: 96.8, color: '#2FAA65' },
  { model: 'Grad. Boost',   acc: 97.5, color: '#2DE2E6' },
  { model: 'ANN',           acc: 98.2, color: '#4DA3FF' },
  { model: 'DNN',           acc: 99.1, color: '#A78BFA' },
  { model: 'SVM',           acc: 95.9, color: '#F59E0B' },
]

const statCards = [
  { labelKey: 'Active Model',      value: 'Random Forest', subKey: 'Primary inference',  icon: Brain,      color: 'text-green-neon',  glow: 'glow-green' },
  { labelKey: 'CNN Status',        value: 'Loaded',        subKey: 'Food quality model', icon: Cpu,        color: 'text-cyan-neon',   glow: 'glow-cyan'  },
  { labelKey: 'Total Predictions', value: '—',             subKey: 'Session count',      icon: Activity,   color: 'text-blue-ai',     glow: ''           },
  { labelKey: 'Avg Confidence',    value: '97.3%',         subKey: 'Last 10 calls',      icon: TrendingUp, color: 'text-green-neon',  glow: ''           },
]

const ALLOWED = ['image/jpeg','image/png','image/webp','image/bmp']

const tooltipStyle = {
  background: '#0C1A14', border: '1px solid #1A3028',
  borderRadius: '10px', color: '#E8F5EE', fontSize: 12,
}

function StatCard({ labelKey, value, subKey, icon: Icon, color, glow, delay }) {
  const tr = useTranslate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22,1,0.36,1] }}
      className={cn('glass rounded-2xl p-5 interactive-tile', glow)}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">{tr(labelKey)}</p>
        <div className={cn('p-2 rounded-lg bg-bg-elevated', color)}>
          <Icon size={16} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold font-display', color)}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{tr(subKey)}</p>
    </motion.div>
  )
}

export default function Dashboard() {
  const pageLoading = useAiLoading(800)
  const tr = useTranslate()
  const fileRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview]     = useState(null)
  const [scanning, setScanning]   = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ALLOWED.includes(f.type)) { setError('Use JPEG, PNG, WEBP or BMP.'); return }
    setError(null); setResult(null)
    setImageFile(f); setPreview(URL.createObjectURL(f))
  }

  const handleScan = async () => {
    if (!imageFile) { setError('Select an image first.'); return }
    setScanning(true); setResult(null); setError(null)
    try { setResult(await fetchPredictImage(imageFile)) }
    catch (e) { setError(e.message || 'Scan failed.') }
    finally { setScanning(false) }
  }

  return (
    <div className="space-y-6">
      <AIAnalyzingOverlay loading={pageLoading} />

      {/* Header */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
        <h1 className="text-2xl font-bold font-display text-text-primary">{tr('Dashboard')}</h1>
        <p className="text-sm text-text-muted mt-1">{tr('System health, model status and crop quality scanner')}</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c, i) => <StatCard key={c.labelKey} {...c} delay={i * 0.07} />)}
      </div>

      {/* Crop Quality Scanner */}
      <motion.div
        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, delay:0.28 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <Zap size={18} className="text-green-neon" />
          <h2 className="text-base font-semibold font-display text-text-primary">{tr('Crop Quality Scanner')}</h2>
          <span className="ml-auto text-xs text-text-muted">{tr('CNN · cnn_food_quality_model.h5')}</span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">{tr('Crop Image')}</p>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'flex h-11 min-w-[220px] cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm transition',
                imageFile
                  ? 'border-green-neon/50 bg-green-neon/10 text-green-neon'
                  : 'border-border-soft bg-bg-elevated text-text-muted hover:border-green-neon/40',
              )}
            >
              <CheckCircle size={15} />
              <span className="truncate max-w-[180px]">{imageFile ? imageFile.name : tr('Upload image (JPEG / PNG)')}</span>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/bmp" className="hidden" onChange={handleFile} />
          </div>
          <button
            type="button" onClick={handleScan}
            disabled={scanning || !imageFile}
            className="h-11 rounded-xl px-6 text-sm font-semibold text-bg-canvas bg-green-gradient shadow-glow-green transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? tr('Scanning...') : tr('Analyze Crop')}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-badge-donotBorder bg-badge-donotBg px-4 py-3 mb-4">
            <p className="text-sm text-badge-donotText">{error}</p>
          </div>
        )}

        {/* Result area */}
        {scanning ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border-soft bg-bg-elevated/50">
            <div className="text-center space-y-3">
              <motion.div className="mx-auto h-10 w-10 rounded-full border-2 border-green-neon border-t-transparent"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
              <p className="text-sm font-semibold text-green-neon">{tr('CNN analyzing image...')}</p>
            </div>
          </div>
        ) : result ? (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
            className="grid gap-4 md:grid-cols-2">
            {/* Annotated image */}
            <div className="relative overflow-hidden rounded-xl border-2 bg-black"
              style={{ borderColor: result.freshness === 'Fresh' ? '#2FAA65' : '#EF4444' }}>
              <div className="absolute inset-x-0 top-0 z-10 bg-black/70 px-3 py-2 backdrop-blur-sm text-center">
                <p className="text-sm font-bold tracking-widest text-white">{tr('AI Crop Analysis')}</p>
              </div>
              <img src={preview} alt="analyzed" className="h-64 w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 z-10 bg-black/70 px-3 py-2.5 backdrop-blur-sm space-y-0.5">
                <p className="font-mono text-sm font-bold">
                  <span className="text-white/60">{tr('Freshness:')} </span>
                  <span className={result.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400'}>{result.freshness}</span>
                </p>
                <p className="font-mono text-sm font-bold">
                  <span className="text-white/60">{tr('Confidence:')} </span>
                  <span className="text-green-400">{(result.confidence * 100).toFixed(2)}%</span>
                </p>
                <p className="font-mono text-sm font-bold">
                  <span className="text-white/60">{tr('Decision:')} </span>
                  <span className="text-blue-400">{result.freshness === 'Fresh' ? tr('STORE / SELL') : tr('DO NOT SELL')}</span>
                </p>
              </div>
            </div>
            {/* Output panel */}
            <div className="flex flex-col gap-3">
              <div className="glass-strong rounded-xl p-4 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">{tr('===== Final System Output =====')}</p>
                <div className="space-y-2 font-mono text-sm">
                  {[
                    [tr('Freshness'), result.freshness, result.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400'],
                    [tr('Confidence'), `${(result.confidence*100).toFixed(2)}%`, 'text-green-400'],
                    [tr('Agent Decision'), result.freshness === 'Fresh' ? tr('STORE') : tr('DISCARD'), 'text-blue-400'],
                    [tr('Latency'), `${result.latency_ms} ms`, 'text-text-secondary'],
                    [tr('Model Version'), `v${result.model_version}`, 'text-text-secondary'],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex justify-between border-b border-border-soft/40 pb-1.5">
                      <span className="text-text-muted">{k}</span>
                      <span className={cn('font-bold', cls)}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-strong rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest text-text-muted">{tr('CNN Confidence')}</span>
                  <span className="font-mono font-bold text-green-neon">{(result.confidence*100).toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div className="progress-fill" initial={{ width:0 }}
                    animate={{ width: `${(result.confidence*100).toFixed(1)}%` }}
                    transition={{ duration:0.8, ease:'easeOut' }} />
                </div>
              </div>
            </div>
          </motion.div>
        ) : !error && (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-elevated/30">
            <div className="text-center space-y-2">
              <Zap size={32} className="mx-auto text-text-muted/30" />
              <p className="text-sm text-text-muted">{tr('Upload a crop image and click Analyze Crop')}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Charts row */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Price distribution */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4, delay:0.35 }} className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold font-display text-text-primary mb-4">{tr('Price Distribution')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ top:8, right:8, left:-16, bottom:0 }}>
                <CartesianGrid stroke="#1A3028" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill:'#5A8A72', fontSize:11 }} axisLine={{ stroke:'#1A3028' }} tickLine={false} />
                <YAxis tick={{ fill:'#5A8A72', fontSize:11 }} axisLine={{ stroke:'#1A3028' }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="min"   stroke="#F59E0B" strokeWidth={2} dot={false} name="Min" />
                <Line type="monotone" dataKey="modal" stroke="#2DE2E6" strokeWidth={2.5} dot={false} name="Modal" />
                <Line type="monotone" dataKey="max"   stroke="#2FAA65" strokeWidth={2} dot={false} name="Max" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Model accuracy */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4, delay:0.42 }} className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold font-display text-text-primary mb-4">{tr('Model Accuracy Comparison')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelAccuracy} margin={{ top:8, right:8, left:-16, bottom:0 }}>
                <CartesianGrid stroke="#1A3028" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model" tick={{ fill:'#5A8A72', fontSize:10 }} axisLine={{ stroke:'#1A3028' }} tickLine={false} />
                <YAxis domain={[94,100]} tick={{ fill:'#5A8A72', fontSize:11 }} axisLine={{ stroke:'#1A3028' }} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}%`, 'Accuracy']} />
                <Bar dataKey="acc" radius={[6,6,0,0]}>
                  {modelAccuracy.map(e => <Cell key={e.model} fill={e.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
