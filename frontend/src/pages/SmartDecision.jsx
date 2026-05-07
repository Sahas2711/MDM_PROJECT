import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { fetchSmartDecision } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import ExplainabilityPanel from '../components/ux/ExplainabilityPanel'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { cn } from '../lib/utils'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp']

const REC_CONFIG = {
  SELL: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400' },
  HOLD: { border: 'border-yellow-400/50', bg: 'bg-yellow-400/10', text: 'text-yellow-300' },
  'DO NOT SELL': { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400' },
  'NOT FRUIT IMAGE': { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400' },
}

// ── Workflow node status config ───────────────────────────────────────────────
const STATUS_CONFIG = {
  SUCCESS: {
    border: 'border-green-500/40',
    bg: 'bg-green-500/5',
    badge: 'bg-green-500/20 text-green-400 border-green-500/40',
    dot: 'bg-green-500',
    connector: 'bg-green-500/30',
  },
  FAILED: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    dot: 'bg-red-500',
    connector: 'bg-red-500/30',
  },
  PARTIAL: {
    border: 'border-yellow-400/40',
    bg: 'bg-yellow-400/5',
    badge: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
    dot: 'bg-yellow-400',
    connector: 'bg-yellow-400/30',
  },
  SKIPPED: {
    border: 'border-border-soft',
    bg: 'bg-bg-cardHover/10',
    badge: 'bg-bg-cardHover text-text-muted border-border-soft',
    dot: 'bg-text-muted/40',
    connector: 'bg-border-soft',
  },
}

const NODE_ICONS = {
  PREPROCESSING:     '⚡',
  IMAGE_VALIDATION:  '🔍',
  QUALITY_ANALYSIS:  '🧠',
  FEATURE_PIPELINE:  '⚙️',
  PRICE_MODEL:       '💰',
  CLUSTER_ANALYSIS:  '🔵',
  MARKET_ENRICHMENT: '🌐',
  DECISION_ENGINE:   '⚖️',
  HOLD_STRATEGY:     '🏪',
}

const NODE_LABELS = {
  PREPROCESSING:     'Preprocessing',
  IMAGE_VALIDATION:  'Image Validation',
  QUALITY_ANALYSIS:  'Quality Analysis',
  FEATURE_PIPELINE:  'Feature Pipeline',
  PRICE_MODEL:       'Price Model Ensemble',
  CLUSTER_ANALYSIS:  'Cluster Analysis',
  MARKET_ENRICHMENT: 'Market Enrichment',
  DECISION_ENGINE:   'Decision Engine',
  HOLD_STRATEGY:     'Hold Strategy',
}

function WorkflowNode({ node, index, isLast }) {
  const [open, setOpen] = useState(false)
  const s = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.SKIPPED

  const outputEntries = Object.entries(node.output ?? {})
  const inputEntries  = Object.entries(node.input  ?? {})

  return (
    <div className="flex gap-3">
      {/* connector column */}
      <div className="flex flex-col items-center">
        <div className={cn('mt-3.5 h-3 w-3 shrink-0 rounded-full border-2 border-bg-base', s.dot)} />
        {!isLast && <div className={cn('mt-1 w-0.5 flex-1', s.connector)} />}
      </div>

      {/* card */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={cn('mb-2 flex-1 rounded-xl border', s.border, s.bg)}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left"
        >
          <span className="mt-0.5 text-base shrink-0">{NODE_ICONS[node.node] ?? '▸'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-text-muted/60">{node.id}</span>
              <p className="text-sm font-semibold text-text-primary">{NODE_LABELS[node.node] ?? node.node}</p>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', s.badge)}>
                {node.status}
              </span>
              {node.depends_on && (
                <span className="rounded-full border border-border-soft bg-bg-cardHover/30 px-2 py-0.5 text-[10px] text-text-muted">
                  ← {node.depends_on}
                </span>
              )}
              {/* quick output chips */}
              {node.status !== 'SKIPPED' && outputEntries.slice(0, 2).map(([k, v]) =>
                typeof v !== 'object' ? (
                  <span key={k} className="rounded-full border border-border-soft bg-bg-cardHover/40 px-2 py-0.5 text-[10px] text-text-muted">
                    {k}: <span className="text-text-secondary">{String(v)}</span>
                  </span>
                ) : null
              )}
            </div>
          </div>
          <svg className={cn('mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-border-soft px-4 pb-4 pt-3">

                {/* INPUT */}
                {inputEntries.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Input</p>
                    <div className="flex flex-wrap gap-1.5">
                      {inputEntries.map(([k, v]) => (
                        <span key={k} className="rounded-lg border border-border-soft bg-bg-cardHover/30 px-2 py-1 text-[11px] text-text-muted">
                          <span className="text-text-secondary">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* OUTPUT */}
                {outputEntries.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">Output</p>
                    <div className="flex flex-wrap gap-1.5">
                      {outputEntries.map(([k, v]) => (
                        <span key={k} className={cn(
                          'rounded-lg border px-2 py-1 text-[11px]',
                          node.status === 'SUCCESS' ? 'border-green-500/20 bg-green-500/5 text-green-300' :
                          node.status === 'PARTIAL'  ? 'border-yellow-400/20 bg-yellow-400/5 text-yellow-200' :
                          node.status === 'FAILED'   ? 'border-red-500/20 bg-red-500/5 text-red-300' :
                          'border-border-soft bg-bg-cardHover/30 text-text-muted'
                        )}>
                          <span className="text-text-muted">{k}:</span> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ERROR — FAILED and PARTIAL nodes */}
                {(node.status === 'FAILED' || node.status === 'PARTIAL') && node.error && (
                  <div className={cn(
                    'rounded-lg border px-3 py-2',
                    node.status === 'FAILED' ? 'border-red-500/30 bg-red-500/10' : 'border-yellow-400/30 bg-yellow-400/10'
                  )}>
                    <p className={cn('mb-1 text-[10px] font-bold uppercase tracking-widest', node.status === 'FAILED' ? 'text-red-400' : 'text-yellow-300')}>Error</p>
                    <p className={cn('font-mono text-[11px] leading-5 break-all', node.status === 'FAILED' ? 'text-red-300' : 'text-yellow-200')}>{node.error}</p>
                  </div>
                )}

                {/* WHY */}
                {node.why && (
                  <div className="border-l-2 border-brand-neonCyan/40 pl-3">
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-neonCyan">Why</p>
                    <p className="text-xs leading-5 text-text-muted">{node.why}</p>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Legacy pipeline step config (kept for pipeline_result panel) ──────────────
const STEPS = [
  { id: 1, label: 'Fruit Check', desc: 'Checking whether the uploaded image is really a fruit or crop image...' },
  { id: 2, label: 'CNN Freshness', desc: 'Measuring crop freshness confidence from the image...' },
  { id: 3, label: 'Price Model', desc: 'Building 9-feature crop price inputs from the exported model bundle...' },
  { id: 4, label: 'Web Price Search', desc: 'Collecting market price context and fallback price logic...' },
  { id: 5, label: 'Decision Why', desc: 'Explaining hold / sell logic with image and price reasons...' },
]

function InfoCard({ label, value, subvalue, tone = 'default' }) {
  const toneClass = {
    default: 'border-border-soft bg-bg-cardHover/30 text-text-primary',
    success: 'border-green-500/40 bg-green-500/10 text-green-400',
    warning: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
    danger: 'border-red-500/40 bg-red-500/10 text-red-400',
  }[tone]

  return (
    <div className={cn('rounded-xl border p-4', toneClass)}>
      <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
      {subvalue ? <p className="mt-1 text-xs text-text-muted">{subvalue}</p> : null}
    </div>
  )
}

function SmartDecision() {
  const tr = useTranslate()
  const pageLoading = useAiLoading(820)
  const fileRef = useRef(null)

  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [cropHint, setCropHint] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Use JPEG, PNG, WEBP, or BMP.')
      return
    }
    setError(null)
    setResult(null)
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!imageFile) {
      setError('Please upload a crop image.')
      return
    }

    setError(null)
    setSubmitting(true)
    setResult(null)
    setStep(1)
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), 1700)

    try {
      const data = await fetchSmartDecision(imageFile, cropHint)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Request failed. Is the backend running?')
    } finally {
      clearInterval(stepTimer)
      setStep(0)
      setSubmitting(false)
    }
  }

  const rec = result ? (REC_CONFIG[result.recommendation] ?? REC_CONFIG.HOLD) : REC_CONFIG.HOLD
  const freshnessPct = result ? (result.confidence * 100).toFixed(1) : '0'
  const fruitPct = result ? (result.fruit_confidence * 100).toFixed(1) : '0'
  const fruitFailed = result && result.recommendation === 'NOT FRUIT IMAGE'

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={pageLoading || submitting} />

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('Image validation + CNN freshness + 9-feature price classification + why-based hold guidance')}</CardDescription>
            <CardTitle>{tr('Smart Crop Decision Engine')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Crop Image')}</span>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm transition',
                    imageFile
                      ? 'border-brand-neonCyan/50 bg-brand-neonCyan/10 text-brand-neonCyan'
                      : 'border-border-soft bg-bg-cardHover text-text-muted hover:border-brand-neonCyan/40',
                  )}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1 1 0 001 1h16a1 1 0 001-1v-2.5M16 10l-4-4m0 0L8 10m4-4v12" />
                  </svg>
                  <span className="truncate">{imageFile ? imageFile.name : tr('Upload crop image (JPEG / PNG)')}</span>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/bmp" className="hidden" onChange={handleFile} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Crop Name Hint')}</span>
                <input
                  type="text"
                  value={cropHint}
                  onChange={(e) => setCropHint(e.target.value)}
                  placeholder="e.g. apple, mango, tomato, onion"
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                />
                <p className="text-xs text-text-muted">{tr('Used for commodity encoding, web price lookup, and result explanations.')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-11 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? tr('Analyzing...') : tr('Analyze Crop')}
              </button>
              {preview && <img src={preview} alt="preview" className="h-11 w-11 rounded-xl border border-border-soft object-cover" />}
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}>
        <Card className="min-h-[260px] border-border-strong">
          <CardHeader>
            <CardDescription>{tr('Output')}</CardDescription>
            <CardTitle>{tr('Decision Result')}</CardTitle>
          </CardHeader>
          <CardContent>
            {submitting ? (
              <div className="space-y-3 py-4">
                {STEPS.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-500',
                      step === s.id
                        ? 'border-brand-neonCyan/50 bg-brand-neonCyan/10'
                        : step > s.id
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-border-soft bg-bg-cardHover/20 opacity-40',
                    )}
                  >
                    {step > s.id ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">✓</span>
                    ) : step === s.id ? (
                      <motion.div className="h-5 w-5 rounded-full border-2 border-brand-neonCyan border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }} />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border-soft text-xs text-text-muted">{s.id}</span>
                    )}
                    <div>
                      <p className={cn('text-sm font-semibold', step === s.id ? 'text-brand-neonCyan' : step > s.id ? 'text-green-400' : 'text-text-muted')}>{s.label}</p>
                      {step === s.id && <p className="text-xs text-text-muted">{s.desc}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : result ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  {preview && (
                    <div className="relative overflow-hidden rounded-xl border border-border-soft bg-black">
                      <div className="bg-black/60 px-3 py-1.5 text-center text-xs font-bold tracking-widest text-white/70">{tr('AI Crop Analysis')}</div>
                      <img src={preview} alt="analyzed" className="h-64 w-full object-contain" />
                      <div className="absolute inset-x-0 bottom-0 space-y-0.5 bg-black/65 px-3 py-2 backdrop-blur-sm">
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">{tr('Fruit Check')}: </span>
                          <span className={result.fruit_detected ? 'text-green-400' : 'text-yellow-300'}>{result.fruit_detected ? tr('Detected') : tr('Uncertain')}</span>
                        </p>
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">{tr('Fruit Confidence')}: </span>
                          <span className="text-cyan-300">{fruitPct}%</span>
                        </p>
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">{tr('Freshness')}: </span>
                          <span className={result.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400'}>{result.freshness}</span>
                        </p>
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">{tr('Decision')}: </span>
                          <span className={rec.text}>{result.recommendation}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <InfoCard
                      label={tr('Final Recommendation')}
                      value={result.recommendation}
                      subvalue={fruitFailed ? tr('Pipeline stopped at fruit validation.') : `${tr('Price class')}: ${result.price_prediction_label} | ${tr('Model')}: ${result.ml_model_used}`}
                      tone={result.recommendation === 'SELL' ? 'success' : result.recommendation === 'DO NOT SELL' || fruitFailed ? 'danger' : 'warning'}
                    />
                    <InfoCard
                      label={tr('Freshness Confidence')}
                      value={fruitFailed ? tr('Skipped') : `${freshnessPct}%`}
                      subvalue={result.image_reason}
                      tone={fruitFailed ? 'warning' : result.freshness === 'Fresh' ? 'success' : 'danger'}
                    />
                    <InfoCard
                      label={tr('Hold Guidance')}
                      value={result.should_hold ? `${result.hold_duration_days} ${tr('days')}` : tr('Do not hold')}
                      subvalue={result.should_hold ? result.hold_reason : (result.not_hold_reason || result.hold_reason)}
                      tone={result.should_hold ? 'warning' : 'default'}
                    />
                  </div>
                </div>

                {!fruitFailed && (
                <div className="grid gap-3 md:grid-cols-3">
                  <InfoCard label={tr('Estimated Market Price')} value={`INR ${result.estimated_min_price.toLocaleString()} - ${result.estimated_max_price.toLocaleString()}`} subvalue={result.price_source === 'web_search' ? tr('Live web search') : tr('Dataset fallback')} tone="default" />
                  <InfoCard label={tr('Price Probabilities')} value={`High ${((result.price_probabilities.High ?? 0) * 100).toFixed(0)}%`} subvalue={`Medium ${((result.price_probabilities.Medium ?? 0) * 100).toFixed(0)}% | Low ${((result.price_probabilities.Low ?? 0) * 100).toFixed(0)}%`} tone="default" />
                  <InfoCard label={tr('Cluster Signal')} value={result.cluster_id >= 0 ? `Cluster ${result.cluster_id}` : tr('Unavailable')} subvalue={result.cluster_id >= 0 ? `${tr('Distance')}: ${result.cluster_distance}` : tr('K-means model not available')} tone="default" />
                </div>
                )}

                {!fruitFailed && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Why This Price')}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{result.price_reason}</p>
                    <p className="mt-3 text-xs text-text-muted">{result.price_range_analysis}</p>
                  </div>
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Why This Price With Image')}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{result.image_price_reason}</p>
                    <p className="mt-3 text-xs text-text-muted">{result.market_insight}</p>
                  </div>
                </div>
                )}

                <div className={cn('rounded-xl border p-4', rec.border, rec.bg)}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full border border-brand-neonCyan/40 bg-brand-neonCyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-neonCyan">
                      {tr('Decision Why')}
                    </span>
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Hold / Sell Explanation')}</p>
                  </div>
                  <p className="text-sm leading-7 text-text-secondary">{result.decision_reason}</p>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">{result.hold_instructions}</p>
                </div>

                {!fruitFailed && result.feature_contributions?.length > 0 && (
                <div className="rounded-xl border border-border-soft bg-bg-cardHover/20 p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Feature Contributions to Price Confidence')}</p>
                  <div className="space-y-3">
                    {result.feature_contributions.map((fc, i) => {
                      const barColor = fc.direction === 'positive' ? 'bg-green-500' : fc.direction === 'negative' ? 'bg-red-500' : 'bg-yellow-400'
                      const textColor = fc.direction === 'positive' ? 'text-green-400' : fc.direction === 'negative' ? 'text-red-400' : 'text-yellow-300'
                      const barWidth = `${Math.round(fc.impact * 100)}%`
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-text-primary">{fc.feature}</span>
                              <span className="rounded-full border border-border-soft px-2 py-0.5 text-[10px] text-text-muted">{fc.value}</span>
                            </div>
                            <span className={`text-xs font-bold ${textColor}`}>{(fc.impact * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-cardHover">
                            <motion.div
                              className={`h-full rounded-full ${barColor}`}
                              initial={{ width: 0 }}
                              animate={{ width: barWidth }}
                              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                          <p className="text-xs leading-5 text-text-muted">{fc.explanation}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}

                {!fruitFailed && (
                <div className="rounded-xl border border-brand-neonCyan/30 bg-brand-neonCyan/10 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-brand-neonCyan">{tr('Model Context Used')}</p>
                  <div className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                    <p>{tr('State')}: {result.feature_context.state}</p>
                    <p>{tr('District')}: {result.feature_context.district}</p>
                    <p>{tr('Market')}: {result.feature_context.market}</p>
                    <p>{tr('Commodity')}: {result.feature_context.commodity}</p>
                    <p>{tr('Variety')}: {result.feature_context.variety}</p>
                    <p>{tr('Grade')}: {result.feature_context.grade}</p>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">{tr('Web Query')}: {result.web_query}</p>
                </div>
                )}

                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-green-400">{tr('Full Analysis')}</p>
                  <p className="mt-2 text-sm leading-7 text-text-primary">{result.generated_analysis}</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <div className="space-y-2 text-center">
                  <svg className="mx-auto h-10 w-10 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-text-muted">{tr('Upload a crop image and click Analyze Crop.')}</p>
                  <p className="text-xs text-text-muted">{tr('The result will explain fruit check, CNN confidence, market price, hold logic, and storage guidance.')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {result && (
        <ExplainabilityPanel
          bullets={result.stage_explanations}
        />
      )}

      {result && !fruitFailed && result.node_graph?.nodes?.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card>
            <CardHeader>
              <CardDescription>
                {tr('n8n-style node graph — id, name, status, data, why, depends_on, edges — all grounded in real model outputs')}
              </CardDescription>
              <CardTitle>
                <span className="flex flex-wrap items-center gap-2">
                  {tr('Workflow Node Graph')}
                  <span className="flex gap-2 text-xs font-normal">
                    {['SUCCESS','PARTIAL','FAILED','SKIPPED'].map((s) => {
                      const count = result.node_graph.nodes.filter(n => n.status === s).length
                      if (!count) return null
                      const color = s === 'SUCCESS' ? 'text-green-400' : s === 'FAILED' ? 'text-red-400' : s === 'PARTIAL' ? 'text-yellow-300' : 'text-text-muted'
                      return <span key={s} className={color}>{count} {s}</span>
                    })}
                  </span>
                  <span className="text-xs font-normal text-text-muted">
                    {result.node_graph.edges?.length ?? 0} edges
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-3">
              {result.node_graph.nodes.map((node, i) => (
                <WorkflowNode
                  key={node.id}
                  node={node}
                  index={i}
                  isLast={i === result.node_graph.nodes.length - 1}
                />
              ))}
            </CardContent>
          </Card>
        </motion.section>
      )}
    </div>
  )
}

export default SmartDecision
