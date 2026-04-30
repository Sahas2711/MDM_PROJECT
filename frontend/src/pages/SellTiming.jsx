import { motion } from 'framer-motion'
import { useState } from 'react'
import { fetchPrediction } from '../services/api'
import useTranslate from '../hooks/useTranslate'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
import { cn } from '../lib/utils'

const priceSeries = [
  { time: '06:00', price: 1780 },
  { time: '07:00', price: 1835 },
  { time: '08:00', price: 1890 },
  { time: '09:00', price: 1980 },
  { time: '10:00', price: 2065 },
  { time: '11:00', price: 2120 },
  { time: '12:00', price: 2175 },
  { time: '13:00', price: 2210 },
  { time: '14:00', price: 2160 },
  { time: '15:00', price: 2095 },
  { time: '16:00', price: 2010 },
  { time: '17:00', price: 1935 },
]

const bestWindow = {
  start: '10:00',
  end: '13:00',
  label: 'Best Sell Window',
}

const worstWindow = {
  start: '06:00',
  end: '08:00',
  label: 'Worst Sell Window',
}

const recommendation = {
  signal: 'SELL',
  confidence: 91,
  explanation:
    'Price momentum peaks between 10:00 and 13:00 with stronger buyer activity and tighter spread. Early morning window shows weak demand and lower expected execution price.',
}

function SignalBadge({ signal }) {
  const tone = {
    SELL: 'border-badge-sellBorder bg-badge-sellBg text-badge-sellText',
    HOLD: 'border-badge-holdBorder bg-badge-holdBg text-badge-holdText',
  }

  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full border px-3 text-xs font-bold tracking-[0.06em]',
        tone[signal],
      )}
    >
      {signal}
    </span>
  )
}

function SellTiming() {
  const tr = useTranslate()
  const loading = useAiLoading(860)

  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [predicting, setPredicting] = useState(false)
  const [predResult, setPredResult] = useState(null)
  const [predError, setPredError] = useState(null)

  const handlePredict = async () => {
    const min = Number(minPrice)
    const max = Number(maxPrice)

    if (!min || !max || min <= 0 || max <= 0) {
      setPredError('Enter valid positive values for both prices.')
      return
    }
    if (min > max) {
      setPredError('Min price cannot be greater than max price.')
      return
    }

    setPredicting(true)
    setPredResult(null)
    setPredError(null)

    try {
      const data = await fetchPrediction(min, max)
      setPredResult(data)
    } catch (err) {
      setPredError(err.message || 'Prediction failed. Is the backend running?')
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={loading} />
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-5 xl:grid-cols-3"
      >
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardDescription>{tr('Time-Series Graph')}</CardDescription>
            <CardTitle>{tr('Intraday Price Trend')}</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceSeries} margin={{ top: 10, right: 12, left: -10, bottom: 4 }}>
                <CartesianGrid stroke="#22314D" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#9AB1D3', fontSize: 12 }}
                  axisLine={{ stroke: '#30456B' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9AB1D3', fontSize: 12 }}
                  axisLine={{ stroke: '#30456B' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0B1220',
                    border: '1px solid #30456B',
                    borderRadius: '12px',
                    color: '#EAF2FF',
                  }}
                  formatter={(value) => [`INR ${value}`, 'Price']}
                />
                <ReferenceArea
                  x1={bestWindow.start}
                  x2={bestWindow.end}
                  fill="rgba(31, 212, 122, 0.16)"
                  stroke="rgba(31, 212, 122, 0.35)"
                  strokeWidth={1}
                />
                <ReferenceArea
                  x1={worstWindow.start}
                  x2={worstWindow.end}
                  fill="rgba(255, 93, 108, 0.14)"
                  stroke="rgba(255, 93, 108, 0.35)"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2DE2E6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#4DA3FF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-brand-neonCyan/35 shadow-glow-cyan">
          <CardHeader>
            <CardDescription>{tr('Recommendation')}</CardDescription>
            <CardTitle>{tr('Action Indicator')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <SignalBadge signal={recommendation.signal} />
              <p className="font-mono text-lg font-bold text-brand-neonCyan">{recommendation.confidence}%</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border-soft bg-bg-cardHover/30 p-3.5">
              <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Best Window')}</p>
              <p className="text-sm font-semibold text-text-primary">{bestWindow.start} - {bestWindow.end}</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border-soft bg-bg-cardHover/30 p-3.5">
              <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Worst Window')}</p>
              <p className="text-sm font-semibold text-text-primary">{worstWindow.start} - {worstWindow.end}</p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* ── Live Prediction ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Live Prediction')}</CardDescription>
            <CardTitle>{tr('SELL / HOLD Signal from Model')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Inputs */}
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Min Price (INR)')}</span>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="e.g. 1200"
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Max Price (INR)')}</span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="e.g. 1800"
                  className="h-11 w-full rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handlePredict}
                  disabled={predicting}
                  className="h-11 w-full rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {predicting ? tr('Predicting...') : tr('Run Prediction')}
                </button>
              </div>
            </div>

            {/* Result / Error / Idle */}
            {predicting ? (
              <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-border-soft bg-bg-cardHover/30">
                <div className="text-center">
                  <motion.div
                    className="mx-auto mb-3 h-9 w-9 rounded-full border-2 border-brand-neonCyan border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
                  />
                  <p className="text-sm font-semibold text-brand-neonCyan">{tr('AI predicting...')}</p>
                </div>
              </div>
            ) : predError ? (
              <div className="rounded-xl border border-badge-lossBorder bg-badge-lossBg px-4 py-3">
                <p className="text-sm text-badge-lossText">{predError}</p>
              </div>
            ) : predResult ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24 }}
                className="space-y-3"
              >
                {/* Row 1 — Recommendation · Raw output · Confidence */}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className={cn(
                    'rounded-xl border p-4',
                    predResult.recommendation === 'SELL'
                      ? 'border-badge-sellBorder bg-badge-sellBg'
                      : 'border-badge-holdBorder bg-badge-holdBg',
                  )}>
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Recommendation')}</p>
                    <p className={cn(
                      'mt-2 text-3xl font-bold tracking-wide',
                      predResult.recommendation === 'SELL' ? 'text-badge-sellText' : 'text-badge-holdText',
                    )}>
                      {predResult.recommendation}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Model Output')}</p>
                    <p className="mt-2 font-mono text-3xl font-bold text-brand-neonCyan">{predResult.prediction}</p>
                    <p className="mt-1 text-xs text-text-muted">{tr('Raw value (1 = SELL, 0 = HOLD)')}</p>
                  </div>

                  <div className="rounded-xl border border-brand-neonCyan/35 bg-brand-neonCyan/10 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Confidence')}</p>
                    <p className="mt-2 font-mono text-3xl font-bold text-brand-neonCyan">
                      {(predResult.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{tr('Model certainty score')}</p>
                  </div>
                </div>

                {/* Row 2 — Market insight (highlighted) */}
                <div className="rounded-xl border border-agri-leaf/40 bg-agri-leaf/10 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-agri-leaf">{tr('Market Insight')}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-text-primary">{predResult.market_insight}</p>
                </div>

                {/* Row 3 — Price range analysis */}
                <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-text-muted">{tr('Price Range Analysis')}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{predResult.price_range_analysis}</p>
                </div>

                {/* Row 4 — Model version · Latency */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-text-muted">
                    Model: <span className="font-mono text-text-secondary">{predResult.model_used}</span>
                    <span className="ml-2 text-text-muted/60">v{predResult.model_version}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    Latency: <span className="font-mono text-text-secondary">{predResult.latency_ms} ms</span>
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                <p className="text-sm text-text-muted">{tr('Enter price range and run prediction to see the model signal.')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Explanation')}</CardDescription>
            <CardTitle>{tr('Why The Model Suggests This Action')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-5xl text-sm leading-7 text-text-secondary">{recommendation.explanation}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-agri-leaf/40 bg-agri-leaf/10 p-3.5">
                <p className="text-xs uppercase tracking-[0.08em] text-agri-leaf">{tr('Best sell window')}</p>
                <p className="mt-2 text-sm text-text-primary">
                  Highest trend region with strong momentum and favorable expected clearing price.
                </p>
              </div>
              <div className="rounded-xl border border-badge-lossBorder/45 bg-badge-lossBg/40 p-3.5">
                <p className="text-xs uppercase tracking-[0.08em] text-badge-lossText">{tr('Worst sell window')}</p>
                <p className="mt-2 text-sm text-text-primary">
                  Lower liquidity window with weak buyer pressure, increasing execution risk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <ExplainabilityPanel
        bullets={[
          'Best sell window is selected where the price curve is highest and trend slope remains positive.',
          'Worst window is marked by weaker demand pressure and lower expected clearing efficiency.',
          'SELL or HOLD signals combine intraday momentum, spread behavior, and confidence gating.',
        ]}
      />
    </div>
  )
}

export default SellTiming
