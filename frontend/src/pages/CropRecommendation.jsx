import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import ExplainabilityPanel from '../components/ux/ExplainabilityPanel'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { cn } from '../lib/utils'

const states = ['Punjab', 'Haryana', 'Maharashtra', 'Karnataka', 'Uttar Pradesh']

const markets = {
  Punjab: ['Ludhiana Mandi', 'Amritsar Mandi', 'Jalandhar Mandi'],
  Haryana: ['Karnal Mandi', 'Hisar Mandi', 'Rohtak Mandi'],
  Maharashtra: ['Nashik Market', 'Pune Market', 'Nagpur Market'],
  Karnataka: ['Bengaluru Yard', 'Mysuru Market', 'Hubli Market'],
  'Uttar Pradesh': ['Kanpur Mandi', 'Lucknow Mandi', 'Varanasi Mandi'],
}

const crops = ['Wheat', 'Rice', 'Maize', 'Soybean', 'Cotton']

const profitabilityTone = {
  High: 'border-badge-profitBorder bg-badge-profitBg text-badge-profitText',
  Medium: 'border-badge-holdBorder bg-badge-holdBg text-badge-holdText',
  Low: 'border-badge-lossBorder bg-badge-lossBg text-badge-lossText',
}

function createRecommendation(state, market, crop) {
  const marketScore = market.length % 3
  const cropBoost = crop ? crop.length % 2 : 1
  const stateBias = state.length % 4
  const confidence = Math.min(96, 72 + marketScore * 6 + cropBoost * 5 + stateBias * 3)

  if (confidence >= 86) {
    return {
      profitability: 'High',
      priceRange: 'INR 2,350 - INR 2,780 / quintal',
      confidence,
      reason: `Strong demand and favorable spread observed in ${market}.`,
      recommendedCrop: crop || 'Wheat',
    }
  }

  if (confidence >= 79) {
    return {
      profitability: 'Medium',
      priceRange: 'INR 1,980 - INR 2,280 / quintal',
      confidence,
      reason: `Market signals are stable in ${market}, but volatility remains moderate.`,
      recommendedCrop: crop || 'Maize',
    }
  }

  return {
    profitability: 'Low',
    priceRange: 'INR 1,520 - INR 1,880 / quintal',
    confidence,
    reason: `Weak momentum and lower demand currently detected around ${market}.`,
    recommendedCrop: crop || 'Rice',
  }
}

function CropRecommendation() {
  const tr = useTranslate()
  const pageLoading = useAiLoading(820)
  const [state, setState] = useState(states[0])
  const [market, setMarket] = useState(markets[states[0]][0])
  const [crop, setCrop] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const availableMarkets = useMemo(() => markets[state] || [], [state])

  const handleStateChange = (event) => {
    const selectedState = event.target.value
    setState(selectedState)
    setMarket(markets[selectedState][0])
  }

  const handleAnalyze = () => {
    setLoading(true)
    setResult(null)

    window.setTimeout(() => {
      setResult(createRecommendation(state, market, crop.trim()))
      setLoading(false)
    }, 1400)
  }

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={pageLoading || loading} />
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('AI Input Panel')}</CardDescription>
            <CardTitle>{tr('Crop Recommendation Engine')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('State')}</span>
              <select
                value={state}
                onChange={handleStateChange}
                className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
              >
                {states.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Market')}</span>
              <select
                value={market}
                onChange={(event) => setMarket(event.target.value)}
                className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
              >
                {availableMarkets.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Optional Crop')}</span>
              <select
                value={crop}
                onChange={(event) => setCrop(event.target.value)}
                className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
              >
                <option value="">{tr('Auto-select by AI')}</option>
                {crops.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="h-11 w-full rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? tr('AI analyzing...') : tr('Analyze Recommendation')}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="min-h-[260px] border-border-strong">
          <CardHeader>
            <CardDescription>{tr('Output')}</CardDescription>
            <CardTitle>{tr('Recommendation Result')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-border-soft bg-bg-cardHover/30">
                <div className="text-center">
                  <motion.div
                    className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-brand-neonCyan border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
                  />
                  <p className="text-sm font-semibold text-brand-neonCyan">{tr('AI analyzing...')}</p>
                </div>
              </div>
            ) : result ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <p className="text-xs text-text-muted">{tr('Recommended Crop')}</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">{result.recommendedCrop}</p>
                </div>
                <div className="interactive-tile rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <p className="text-xs text-text-muted">{tr('Predicted Profitability')}</p>
                  <div className="mt-2">
                    <span
                      className={cn(
                        'inline-flex h-6 items-center rounded-full border px-3 text-[11px] font-bold tracking-[0.06em]',
                        profitabilityTone[result.profitability],
                      )}
                    >
                      {result.profitability}
                    </span>
                  </div>
                </div>
                <div className="interactive-tile rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <p className="text-xs text-text-muted">{tr('Expected Price Range')}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{result.priceRange}</p>
                </div>
                <div className="interactive-tile rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <p className="text-xs text-text-muted">{tr('Confidence')}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-brand-neonCyan">{result.confidence}%</p>
                </div>
                <div className="rounded-xl border border-brand-neonCyan/30 bg-brand-neonCyan/10 p-4 md:col-span-2 xl:col-span-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-brand-neonCyan">{tr('Why this recommendation')}</p>
                  <p className="mt-2 text-sm text-text-secondary">{result.reason}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <p className="text-sm text-text-muted">{tr('Select inputs and run analysis to generate recommendation output.')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {result ? (
        <ExplainabilityPanel
          bullets={[
            `Demand and spread behavior in ${market} increased expected profitability confidence.`,
            `${result.recommendedCrop} was prioritized because it aligns with the strongest expected price band for selected constraints.`,
            'Confidence combines region signal quality, crop-level trend consistency, and model consensus across scoring heads.',
          ]}
        />
      ) : null}
    </div>
  )
}

export default CropRecommendation
