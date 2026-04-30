import { motion } from 'framer-motion'
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
  'SELL':        { bar: 'bg-green-500',  border: 'border-green-500/50',  bg: 'bg-green-500/10',  text: 'text-green-400'  },
  'HOLD':        { bar: 'bg-yellow-400', border: 'border-yellow-400/50', bg: 'bg-yellow-400/10', text: 'text-yellow-300' },
  'DO NOT SELL': { bar: 'bg-red-500',    border: 'border-red-500/50',    bg: 'bg-red-500/10',    text: 'text-red-400'    },
}

const STEPS = [
  { id: 1, label: 'CNN Analysis',       desc: 'Classifying crop freshness from image...' },
  { id: 2, label: 'Market Price Fetch', desc: 'Fetching live crop prices via web search...' },
  { id: 3, label: 'ML Prediction',      desc: 'Running price model for SELL / HOLD signal...' },
  { id: 4, label: 'AI Narrative',       desc: 'Generating analysis report...' },
]

function SmartDecision() {
  const tr = useTranslate()
  const pageLoading = useAiLoading(820)
  const fileRef = useRef(null)

  const [imageFile, setImageFile]   = useState(null)
  const [preview, setPreview]       = useState(null)
  const [cropHint, setCropHint]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep]             = useState(0)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Use JPEG, PNG, WEBP, or BMP.'); return }
    setError(null)
    setResult(null)
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!imageFile) { setError('Please upload a crop image.'); return }
    setError(null)
    setSubmitting(true)
    setResult(null)
    setStep(1)
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length)), 1800)
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

  const rec     = result ? (REC_CONFIG[result.recommendation] ?? REC_CONFIG['HOLD']) : null
  const confPct = result ? (result.confidence * 100).toFixed(1) : '0'

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={pageLoading || submitting} />

      {/* ── Input ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('CNN + Web Search + ML + Generative AI Pipeline')}</CardDescription>
            <CardTitle>{tr('Smart Crop Decision Engine')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Image upload */}
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

              {/* Crop hint */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Crop Name (optional)')}</span>
                <input
                  type="text"
                  value={cropHint}
                  onChange={e => setCropHint(e.target.value)}
                  placeholder="e.g. apple, wheat, tomato"
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                />
                <p className="text-xs text-text-muted">{tr('Improves live market price accuracy')}</p>
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

      {/* ── Result ── */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}>
        <Card className="min-h-[260px] border-border-strong">
          <CardHeader>
            <CardDescription>{tr('Output')}</CardDescription>
            <CardTitle>{tr('Decision Result')}</CardTitle>
          </CardHeader>
          <CardContent>

            {/* Step-by-step loading */}
            {submitting ? (
              <div className="space-y-3 py-4">
                {STEPS.map(s => (
                  <div key={s.id} className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-500',
                    step === s.id  ? 'border-brand-neonCyan/50 bg-brand-neonCyan/10'
                    : step > s.id  ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border-soft bg-bg-cardHover/20 opacity-40',
                  )}>
                    {step > s.id ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">✓</span>
                    ) : step === s.id ? (
                      <motion.div className="h-5 w-5 rounded-full border-2 border-brand-neonCyan border-t-transparent"
                        animate={{ rotate: 360 }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }} />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border-soft text-xs text-text-muted">{s.id}</span>
                    )}
                    <div>
                      <p className={cn('text-sm font-semibold',
                        step === s.id ? 'text-brand-neonCyan' : step > s.id ? 'text-green-400' : 'text-text-muted'
                      )}>{s.label}</p>
                      {step === s.id && <p className="text-xs text-text-muted">{s.desc}</p>}
                    </div>
                  </div>
                ))}
              </div>

            ) : result ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-4">

                {/* Row 1 — Image + Freshness + Recommendation */}
                <div className="grid gap-4 md:grid-cols-3">
                  {preview && (
                    <div className="relative overflow-hidden rounded-xl border border-border-soft bg-black">
                      <div className="bg-black/60 px-3 py-1.5 text-center text-xs font-bold tracking-widest text-white/70">{tr('AI Crop Analysis')}</div>
                      <img src={preview} alt="analyzed" className="h-44 w-full object-contain" />
                      <div className="absolute inset-x-0 bottom-0 space-y-0.5 bg-black/65 px-3 py-2 backdrop-blur-sm">
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">{tr('Freshness')}: </span>
                          <span className={result.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400'}>{result.freshness}</span>
                        </p>
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">{tr('Confidence')}: </span>
                          <span className="text-green-400">{confPct}%</span>
                        </p>
                        <p className="font-mono text-sm font-bold">
                          <span className="text-white/60">Decision: </span>
                          <span className={rec.text}>{result.recommendation}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Freshness + confidence bar */}
                  <div className={cn('rounded-xl border p-4',
                    result.freshness === 'Fresh' ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'
                  )}>
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Freshness')}</p>
                    <p className={cn('mt-2 text-3xl font-bold', result.freshness === 'Fresh' ? 'text-green-400' : 'text-red-400')}>
                      {result.freshness}
                    </p>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between">
                        <span className="text-xs text-text-muted">{tr('CNN Confidence')}</span>
                        <span className="font-mono text-xs font-bold text-brand-neonCyan">{confPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className={cn('h-full rounded-full', result.freshness === 'Fresh' ? 'bg-green-400' : 'bg-red-400')}
                          initial={{ width: 0 }}
                          animate={{ width: `${confPct}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className={cn('rounded-xl border p-4', rec.border, rec.bg)}>
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Recommendation')}</p>
                    <p className={cn('mt-2 text-2xl font-bold', rec.text)}>{result.recommendation}</p>
                    <p className="mt-1 text-xs text-text-muted">via {result.ml_model_used}</p>
                  </div>
                </div>

                {/* Row 2 — Live price */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-brand-neonCyan/30 bg-brand-neonCyan/10 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-brand-neonCyan">{tr('Estimated Market Price')}</p>
                    <p className="mt-2 font-mono text-xl font-bold text-text-primary">
                      INR {result.estimated_min_price.toLocaleString()} – {result.estimated_max_price.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Source:{' '}
                      <span className={result.price_source === 'web_search' ? 'text-green-400' : 'text-yellow-300'}>
                        {result.price_source === 'web_search' ? tr('Live web search') : tr('Dataset median (fallback)')}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Price Range Analysis')}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{result.price_range_analysis}</p>
                  </div>
                </div>

                {/* Row 3 — Market insight */}
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-green-400">{tr('Market Insight')}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-text-primary">{result.market_insight}</p>
                </div>

                {/* Row 4 — AI generated analysis */}
                <div className={cn('rounded-xl border p-4', rec.border, rec.bg)}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full border border-brand-neonCyan/40 bg-brand-neonCyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-neonCyan">
                      {tr('AI Generated')}
                    </span>
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Analysis Report')}</p>
                  </div>
                  <p className="text-sm leading-7 text-text-secondary">{result.generated_analysis}</p>
                </div>

              </motion.div>

            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <div className="space-y-2 text-center">
                  <svg className="mx-auto h-10 w-10 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-text-muted">{tr('Upload a crop image and click Analyze Crop.')}</p>
                  <p className="text-xs text-text-muted">{tr('Prices are fetched automatically — no manual input needed.')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {result && (
        <ExplainabilityPanel
          bullets={[
            `CNN classified the crop as ${result.freshness} with ${confPct}% confidence — ${result.freshness === 'Rotten' ? 'quality override applied, market signal ignored.' : 'quality check passed, proceeding to market analysis.'}`,
            `Market prices (INR ${result.estimated_min_price.toLocaleString()}–${result.estimated_max_price.toLocaleString()}) were ${result.price_source === 'web_search' ? 'fetched live via web search' : 'estimated from dataset medians'} and fed into the Random Forest model.`,
            'The AI narrative is generated by combining freshness, confidence, price data, and market signals into a structured analysis report.',
          ]}
        />
      )}
    </div>
  )
}

export default SmartDecision
