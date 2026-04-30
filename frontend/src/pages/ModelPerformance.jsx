import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import ExplainabilityPanel from '../components/ux/ExplainabilityPanel'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { fetchPredictionWithModel, fetchPredictImage } from '../services/api'
import { cn } from '../lib/utils'

// ── Static benchmark data ─────────────────────────────────────────────────────
const modelData = [
  { model: 'Random Forest',     accuracy: 96.8 },
  { model: 'Gradient Boosting', accuracy: 97.5 },
  { model: 'ANN',               accuracy: 98.2 },
  { model: 'DNN',               accuracy: 99.1 },
  { model: 'SVM',               accuracy: 95.9 },
]

const bestModel = modelData.reduce((b, c) => c.accuracy > b.accuracy ? c : b)

const insightPoints = [
  'DNN leads in accuracy and consistency across validation folds, making it the primary inference model.',
  'ANN and Gradient Boosting remain strong fallback candidates for faster retraining windows.',
  'SVM and Random Forest show robust baseline performance but lower headroom on non-linear price-demand interactions.',
]

// ── Live comparison config ────────────────────────────────────────────────────
const MODELS = [
  { key: 'random_forest',     label: 'Random Forest',     color: '#4DA3FF' },
  { key: 'gradient_boosting', label: 'Gradient Boosting', color: '#F7B955' },
  { key: 'ann',               label: 'ANN',               color: '#2FAA65' },
]

const REC_COLOR = { SELL: 'text-green-400', HOLD: 'text-yellow-300' }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp']

function ModelPerformance() {
  const tr = useTranslate()
  const loading = useAiLoading(820)

  // ── Model comparison state ──────────────────────────────────────────────────
  const [cmpMin, setCmpMin]         = useState('')
  const [cmpMax, setCmpMax]         = useState('')
  const [cmpRunning, setCmpRunning] = useState(false)
  const [cmpResults, setCmpResults] = useState([])   // [{key, label, color, prediction, confidence, recommendation, error}]
  const [cmpError, setCmpError]     = useState(null)

  // ── Image scan state ────────────────────────────────────────────────────────
  const fileRef                     = useRef(null)
  const [imgFile, setImgFile]       = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [scanning, setScanning]     = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError]   = useState(null)

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCompare = async () => {
    const min = Number(cmpMin)
    const max = Number(cmpMax)
    if (!min || min <= 0 || !max || max <= 0) { setCmpError('Enter valid positive prices.'); return }
    if (min > max) { setCmpError('Min price must be ≤ max price.'); return }

    setCmpError(null)
    setCmpRunning(true)
    setCmpResults([])

    const settled = await Promise.allSettled(
      MODELS.map(m => fetchPredictionWithModel(min, max, m.key))
    )

    const results = MODELS.map((m, i) => {
      const s = settled[i]
      if (s.status === 'fulfilled') {
        return { ...m, prediction: s.value.prediction, confidence: s.value.confidence, recommendation: s.value.recommendation, error: null }
      }
      return { ...m, prediction: null, confidence: null, recommendation: null, error: s.reason?.message ?? 'Failed' }
    })

    setCmpResults(results)
    setCmpRunning(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { setScanError('Use JPEG, PNG, WEBP, or BMP.'); return }
    setScanError(null)
    setScanResult(null)
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  const handleScan = async () => {
    if (!imgFile) { setScanError('Please select an image first.'); return }
    setScanning(true)
    setScanResult(null)
    setScanError(null)
    try {
      const data = await fetchPredictImage(imgFile)
      setScanResult(data)
    } catch (err) {
      setScanError(err.message || 'Scan failed. Is the backend running?')
    } finally {
      setScanning(false)
    }
  }

  // Chart data from live comparison results
  const chartData = cmpResults
    .filter(r => r.confidence !== null)
    .map(r => ({ model: r.label, confidence: +(r.confidence * 100).toFixed(1), color: r.color }))

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={loading} />

      {/* ── Static benchmark chart ── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-5 xl:grid-cols-3"
      >
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardDescription>{tr('Accuracy Comparison')}</CardDescription>
            <CardTitle>{tr('Model Accuracy Benchmark')}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid stroke="#22314D" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model" tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} interval={0} angle={-12} textAnchor="end" height={56} />
                <YAxis domain={[94, 100]} tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => [`${v}%`, 'Accuracy']} contentStyle={{ background: '#0B1220', border: '1px solid #30456B', borderRadius: '12px', color: '#EAF2FF' }} />
                <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                  {modelData.map(entry => (
                    <Cell key={entry.model} fill={entry.model === bestModel.model ? '#2FAA65' : '#4DA3FF'} fillOpacity={entry.model === bestModel.model ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-agri-leaf/45 shadow-glow-cyan">
          <CardHeader>
            <CardDescription>{tr('Best Model')}</CardDescription>
            <CardTitle>{bestModel.model}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-agri-leaf/45 bg-agri-leaf/12 p-3.5">
              <p className="text-xs uppercase tracking-[0.08em] text-agri-leaf">{tr('Top Accuracy')}</p>
              <p className="mt-2 font-mono text-3xl font-bold text-text-primary">{bestModel.accuracy}%</p>
            </div>
            <p className="text-sm leading-6 text-text-secondary">
              Selected as primary production model for decision scoring due to superior accuracy and stable generalization on hold-out test data.
            </p>
          </CardContent>
        </Card>
      </motion.section>

      {/* ── Static insights ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Short Insights')}</CardDescription>
            <CardTitle>{tr('Performance Interpretation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {insightPoints.map(point => (
              <div key={point} className="interactive-tile rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                <p className="text-sm leading-6 text-text-secondary">{point}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.section>

      {/* ── Live Model Comparison ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Live API Comparison')}</CardDescription>
            <CardTitle>{tr('Compare Models on Real Input')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Inputs */}
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Min Price (INR)</span>
                <input type="number" min="0" value={cmpMin} placeholder="e.g. 1200"
                  onChange={e => setCmpMin(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Max Price (INR)</span>
                <input type="number" min="0" value={cmpMax} placeholder="e.g. 1800"
                  onChange={e => setCmpMax(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                />
              </label>
              <div className="flex items-end">
                <button type="button" onClick={handleCompare} disabled={cmpRunning}
                  className="h-11 w-full rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {cmpRunning ? tr('Running...') : tr('Compare All Models')}
                </button>
              </div>
            </div>

            {cmpError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{cmpError}</p>
              </div>
            )}

            {/* Loading */}
            {cmpRunning && (
              <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-border-soft bg-bg-cardHover/30">
                <div className="text-center">
                  <motion.div className="mx-auto mb-3 h-9 w-9 rounded-full border-2 border-brand-neonCyan border-t-transparent"
                    animate={{ rotate: 360 }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }} />
                  <p className="text-sm font-semibold text-brand-neonCyan">{tr('Calling all 3 models...')}</p>
                </div>
              </div>
            )}

            {/* Results grid */}
            {!cmpRunning && cmpResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-4">

                {/* Per-model cards */}
                <div className="grid gap-3 md:grid-cols-3">
                  {cmpResults.map(r => (
                    <div key={r.key} className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <p className="text-sm font-semibold text-text-primary">{r.label}</p>
                      </div>
                      {r.error ? (
                        <p className="text-xs text-red-400">{r.error}</p>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-text-muted">{tr('Prediction')}</p>
                            <p className={cn('text-xl font-bold', REC_COLOR[r.recommendation] ?? 'text-text-primary')}>
                              {r.recommendation}
                            </p>
                            <p className="text-xs text-text-muted">raw: {r.prediction}</p>
                          </div>
                          <div>
                            <div className="mb-1 flex justify-between">
                              <p className="text-xs text-text-muted">{tr('Confidence')}</p>
                              <p className="font-mono text-xs font-bold text-brand-neonCyan">{(r.confidence * 100).toFixed(1)}%</p>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: r.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(r.confidence * 100).toFixed(1)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comparison bar chart */}
                {chartData.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Confidence Comparison Chart')}</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                          <CartesianGrid stroke="#22314D" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="model" tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} tickFormatter={v => `${v}%`} />
                          <Tooltip formatter={v => [`${v}%`, 'Confidence']} contentStyle={{ background: '#0B1220', border: '1px solid #30456B', borderRadius: '12px', color: '#EAF2FF' }} />
                          <Bar dataKey="confidence" radius={[8, 8, 0, 0]}>
                            {chartData.map(entry => (
                              <Cell key={entry.model} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {!cmpRunning && cmpResults.length === 0 && !cmpError && (
              <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <p className="text-sm text-text-muted">{tr('Enter a price range and click Compare to run all 3 models simultaneously.')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* ── CNN Image Quality Scanner ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('CNN Image Analysis')}</CardDescription>
            <CardTitle>{tr('Crop Freshness Scanner')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Upload + scan */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Crop Image')}</span>
                <div onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex h-11 min-w-[220px] cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm transition',
                    imgFile ? 'border-brand-neonCyan/50 bg-brand-neonCyan/10 text-brand-neonCyan' : 'border-border-soft bg-bg-cardHover text-text-muted hover:border-brand-neonCyan/40',
                  )}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1 1 0 001 1h16a1 1 0 001-1v-2.5M16 10l-4-4m0 0L8 10m4-4v12" />
                  </svg>
                  <span className="truncate max-w-[160px]">{imgFile ? imgFile.name : tr('Upload image (JPEG / PNG)')}</span>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/bmp" className="hidden" onChange={handleFileChange} />
              </div>
              <button type="button" onClick={handleScan} disabled={scanning || !imgFile}
                className="h-11 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scanning ? tr('Scanning...') : tr('Scan Crop')}
              </button>
            </div>

            {scanError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{scanError}</p>
              </div>
            )}

            {/* Scan states */}
            {scanning ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-border-soft bg-bg-cardHover/30">
                <div className="text-center">
                  <motion.div className="mx-auto mb-3 h-9 w-9 rounded-full border-2 border-brand-neonCyan border-t-transparent"
                    animate={{ rotate: 360 }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }} />
                  <p className="text-sm font-semibold text-brand-neonCyan">{tr('CNN analyzing image...')}</p>
                </div>
              </div>

            ) : scanResult ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}
                className="grid gap-4 md:grid-cols-2"
              >
                {/* Image with overlay */}
                <div className="relative overflow-hidden rounded-xl border border-border-soft bg-black">
                  <div className="bg-black/60 px-3 py-1.5">
                    <p className="text-center text-xs font-bold tracking-widest text-white/70">AI Crop Analysis</p>
                  </div>
                  <img src={imgPreview} alt="scanned crop" className="h-52 w-full object-contain" />
                  <div className="absolute inset-x-0 bottom-0 space-y-0.5 bg-black/65 px-3 py-2 backdrop-blur-sm">
                    <p className="font-mono text-sm font-bold">
                      <span className="text-white/60">Freshness: </span>
                      <span className={scanResult.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400'}>{scanResult.freshness}</span>
                    </p>
                    <p className="font-mono text-sm font-bold">
                      <span className="text-white/60">Confidence: </span>
                      <span className="text-green-400">{(scanResult.confidence * 100).toFixed(2)}%</span>
                    </p>
                  </div>
                </div>

                {/* Result cards */}
                <div className="flex flex-col gap-3">
                  <div className={cn('flex-1 rounded-xl border p-4',
                    scanResult.freshness === 'Fresh' ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'
                  )}>
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">Freshness</p>
                    <p className={cn('mt-2 text-3xl font-bold', scanResult.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400')}>
                      {scanResult.freshness}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {scanResult.freshness === 'Fresh' ? tr('Good condition for market.') : tr('Not suitable for sale.')}
                    </p>
                  </div>

                  <div className="flex-1 rounded-xl border border-brand-neonCyan/35 bg-brand-neonCyan/10 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.08em] text-text-muted">CNN Confidence</p>
                      <p className="font-mono text-lg font-bold text-brand-neonCyan">{(scanResult.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className={cn('h-full rounded-full', scanResult.freshness === 'Fresh' ? 'bg-green-400' : 'bg-red-400')}
                        initial={{ width: 0 }}
                        animate={{ width: `${(scanResult.confidence * 100).toFixed(1)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-text-muted">model v{scanResult.model_version} · {scanResult.latency_ms} ms</p>
                  </div>
                </div>
              </motion.div>

            ) : !scanError && (
              <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <div className="space-y-2 text-center">
                  <svg className="mx-auto h-10 w-10 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-text-muted">{tr('Upload a crop image and click Scan to check freshness.')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <ExplainabilityPanel
        bullets={[
          'Live comparison calls all 3 models in parallel via Promise.allSettled — one failure does not block the others.',
          'Confidence bar per model uses predict_proba from scikit-learn; unavailable models show an error tile instead of crashing.',
          'CNN freshness scanner runs independently of price models — uses a separate TensorFlow endpoint (/predict-image).',
        ]}
      />
    </div>
  )
}

export default ModelPerformance
