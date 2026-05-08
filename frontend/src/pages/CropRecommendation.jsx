import { motion } from 'framer-motion'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { fetchCropRecommendation } from '../services/api'
import { cn } from '../lib/utils'

const SEASONS = ['kharif', 'rabi', 'zaid']
const SOIL_TYPES = ['loamy', 'sandy', 'clay', 'black', 'red', 'alluvial']
const BUDGETS = [
  { label: '< ₹10,000', value: 8000 },
  { label: '₹10,000 – ₹20,000', value: 15000 },
  { label: '₹20,000 – ₹40,000', value: 30000 },
  { label: '₹40,000 – ₹80,000', value: 60000 },
  { label: '> ₹80,000', value: 100000 },
]

const SEASON_CONTEXT = {
  kharif: 'Kharif crops are sown in June–July with monsoon onset and harvested in Sep–Oct. High rainfall crops like rice, maize, cotton, and soybean thrive.',
  rabi:   'Rabi crops are sown in Oct–Nov after monsoon and harvested in Mar–Apr. Cool-weather crops like wheat, mustard, and chickpea are ideal.',
  zaid:   'Zaid crops grow in the short summer season (Mar–Jun) between rabi and kharif. Watermelon, cucumber, and fodder crops are common.',
}

const SOIL_CONTEXT = {
  loamy:    'Loamy soil has balanced sand, silt, and clay — ideal for most crops. Good water retention and drainage.',
  sandy:    'Sandy soil drains fast and warms quickly. Suitable for root vegetables and drought-tolerant crops.',
  clay:     'Clay soil retains water well but drains slowly. Good for rice and wheat but needs management.',
  black:    'Black (regur) soil is rich in calcium and magnesium. Excellent for cotton, soybean, and sorghum.',
  red:      'Red soil is low in nitrogen but good for groundnut, millets, and pulses with proper fertilization.',
  alluvial: 'Alluvial soil is highly fertile, found in river plains. Supports wheat, rice, sugarcane, and vegetables.',
}

const profitabilityTone = {
  High:   'border-green-500/40 bg-green-500/10 text-green-400',
  Medium: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  Low:    'border-red-500/40 bg-red-500/10 text-red-400',
}

export default function CropRecommendation() {
  const tr = useTranslate()
  const pageLoading = useAiLoading(820)
  const [season, setSeason] = useState('kharif')
  const [soilType, setSoilType] = useState('loamy')
  const [budget, setBudget] = useState(BUDGETS[1].value)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const data = await fetchCropRecommendation(season, budget, soilType)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Recommendation failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const budgetLabel = BUDGETS.find(b => b.value === budget)?.label ?? `₹${budget.toLocaleString()}`

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={pageLoading || loading} />

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('Multi-feature crop recommendation engine')}</CardDescription>
            <CardTitle>{tr('Crop Recommendation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">{tr('Season')}</span>
                <select
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                >
                  {SEASONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">{tr('Soil Type')}</span>
                <select
                  value={soilType}
                  onChange={e => setSoilType(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                >
                  {SOIL_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">{tr('Budget')}</span>
                <select
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                >
                  {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </label>
            </div>

            {/* Feature context pills */}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border-soft bg-bg-elevated px-3 py-1 text-xs text-text-muted">
                Season: <span className="font-semibold text-text-primary">{season}</span>
              </span>
              <span className="rounded-full border border-border-soft bg-bg-elevated px-3 py-1 text-xs text-text-muted">
                Soil: <span className="font-semibold text-text-primary">{soilType}</span>
              </span>
              <span className="rounded-full border border-border-soft bg-bg-elevated px-3 py-1 text-xs text-text-muted">
                Budget: <span className="font-semibold text-text-primary">{budgetLabel}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading}
              className="h-11 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-white shadow-card-sm transition hover:brightness-110 disabled:opacity-70"
            >
              {loading ? tr('Analyzing...') : tr('Get Recommendation')}
            </button>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Context cards — always visible */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.04 }}>
          <Card>
            <CardHeader>
              <CardDescription>Season context</CardDescription>
              <CardTitle className="capitalize">{season}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-text-secondary">{SEASON_CONTEXT[season]}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }}>
          <Card>
            <CardHeader>
              <CardDescription>Soil context</CardDescription>
              <CardTitle className="capitalize">{soilType}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-text-secondary">{SOIL_CONTEXT[soilType]}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Result */}
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.06 }}>
        <Card className="min-h-[220px] border-border-strong">
          <CardHeader>
            <CardDescription>{tr('Live recommendation output')}</CardDescription>
            <CardTitle>{tr('Recommendation Result')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <div className="text-center">
                  <motion.div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-brand-neonCyan border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
                  <p className="text-sm font-semibold text-brand-neonCyan">{tr('AI analyzing...')}</p>
                </div>
              </div>
            ) : result ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-4">

                {/* Top metrics */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-brand-neonCyan/30 bg-brand-neonCyan/10 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted">Recommended Crop</p>
                    <p className="mt-2 text-xl font-bold text-brand-neonCyan">{result.recommended_crop ?? result.recommendedCrop ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted">Expected Price</p>
                    <p className="mt-2 text-lg font-bold text-text-primary">{result.expected_price_range ?? result.priceRange ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted">Profitability</p>
                    <span className={cn('mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold', profitabilityTone[result.profitability] ?? profitabilityTone.Medium)}>
                      {result.profitability ?? 'Medium'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted">Confidence</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-brand-neonCyan">{result.confidence ?? '—'}%</p>
                  </div>
                </div>

                {/* Why this crop */}
                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
                  <p className="mb-2 text-xs uppercase tracking-widest text-green-400">Why This Crop</p>
                  <p className="text-sm leading-7 text-text-primary">{result.reason ?? result.reasoning ?? '—'}</p>
                </div>

                {/* Feature reasoning */}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Season Match</p>
                    <p className="text-sm font-semibold text-text-primary capitalize">{season}</p>
                    <p className="mt-1 text-xs text-text-muted">{result.season_reason ?? SEASON_CONTEXT[season].split('.')[0] + '.'}</p>
                  </div>
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Soil Compatibility</p>
                    <p className="text-sm font-semibold text-text-primary capitalize">{soilType}</p>
                    <p className="mt-1 text-xs text-text-muted">{result.soil_reason ?? SOIL_CONTEXT[soilType].split('.')[0] + '.'}</p>
                  </div>
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Budget Fit</p>
                    <p className="text-sm font-semibold text-text-primary">{budgetLabel}</p>
                    <p className="mt-1 text-xs text-text-muted">{result.budget_reason ?? `Budget of ₹${budget.toLocaleString()} is sufficient for ${result.recommended_crop ?? 'this crop'} cultivation.`}</p>
                  </div>
                </div>

                {/* Alternatives */}
                {result.alternatives?.length > 0 && (
                  <div className="rounded-2xl border border-border-soft bg-bg-cardHover/20 p-4">
                    <p className="mb-3 text-xs uppercase tracking-widest text-text-muted">Alternative Crops</p>
                    <div className="flex flex-wrap gap-2">
                      {result.alternatives.map(alt => (
                        <span key={alt} className="rounded-full border border-border-soft bg-bg-elevated px-3 py-1 text-xs font-semibold text-text-secondary">{alt}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <p className="text-sm text-text-muted">{tr('Select season, soil type, and budget then click Get Recommendation.')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  )
}
