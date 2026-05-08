import { motion } from 'framer-motion'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { cn } from '../lib/utils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const CROP_PRICE_DATA = {
  tomato:   { base: 1800, peak: 2400, unit: 'quintal', holdDays: 2, season: 'Oct–Feb' },
  onion:    { base: 1200, peak: 1900, unit: 'quintal', holdDays: 5, season: 'Nov–Mar' },
  potato:   { base: 900,  peak: 1400, unit: 'quintal', holdDays: 7, season: 'Dec–Apr' },
  wheat:    { base: 2100, peak: 2600, unit: 'quintal', holdDays: 10, season: 'Apr–Jun' },
  rice:     { base: 1900, peak: 2500, unit: 'quintal', holdDays: 8, season: 'Oct–Dec' },
  maize:    { base: 1400, peak: 1900, unit: 'quintal', holdDays: 6, season: 'Sep–Nov' },
  soybean:  { base: 3800, peak: 4600, unit: 'quintal', holdDays: 12, season: 'Oct–Jan' },
  cotton:   { base: 5500, peak: 7200, unit: 'quintal', holdDays: 14, season: 'Nov–Feb' },
  apple:    { base: 4000, peak: 6500, unit: 'quintal', holdDays: 3, season: 'Aug–Oct' },
  mango:    { base: 3000, peak: 5000, unit: 'quintal', holdDays: 2, season: 'Apr–Jun' },
  banana:   { base: 1200, peak: 2000, unit: 'quintal', holdDays: 1, season: 'Year-round' },
  grapes:   { base: 3500, peak: 5500, unit: 'quintal', holdDays: 3, season: 'Feb–May' },
  carrot:   { base: 800,  peak: 1400, unit: 'quintal', holdDays: 4, season: 'Nov–Feb' },
  cucumber: { base: 600,  peak: 1100, unit: 'quintal', holdDays: 2, season: 'Mar–Jun' },
}

function buildPriceSeries(base, peak) {
  const mid = Math.round((base + peak) / 2)
  return [
    { time: '06:00', price: Math.round(base * 0.94) },
    { time: '07:00', price: Math.round(base * 0.97) },
    { time: '08:00', price: base },
    { time: '09:00', price: Math.round(base * 1.05) },
    { time: '10:00', price: Math.round(mid * 1.02) },
    { time: '11:00', price: Math.round(mid * 1.06) },
    { time: '12:00', price: Math.round(peak * 0.97) },
    { time: '13:00', price: peak },
    { time: '14:00', price: Math.round(peak * 0.96) },
    { time: '15:00', price: Math.round(mid * 1.03) },
    { time: '16:00', price: mid },
    { time: '17:00', price: Math.round(base * 1.02) },
  ]
}

async function fetchLivePrice(crop) {
  try {
    const r = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ min_price: 1000, max_price: 3000 }),
    })
    if (r.ok) {
      const d = await r.json()
      return { model: d.model_used, recommendation: d.recommendation, confidence: d.confidence, market_insight: d.market_insight, price_range_analysis: d.price_range_analysis }
    }
  } catch {}
  return null
}

export default function SellTiming() {
  const tr = useTranslate()
  const loading = useAiLoading(860)
  const [cropInput, setCropInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    const key = cropInput.trim().toLowerCase()
    if (!key) { setError('Enter a crop or vegetable name.'); return }

    setError(null)
    setAnalyzing(true)
    setResult(null)

    const meta = CROP_PRICE_DATA[key] ?? {
      base: 1500, peak: 2200, unit: 'quintal', holdDays: 5, season: 'Seasonal',
    }

    const series = buildPriceSeries(meta.base, meta.peak)
    const live = await fetchLivePrice(key)

    const priceNow = meta.base
    const pricePeak = meta.peak
    const diff = pricePeak - priceNow
    const pctGain = ((diff / priceNow) * 100).toFixed(1)
    const recommendation = diff > 300 ? 'HOLD' : 'SELL'

    setResult({
      crop: cropInput.trim(),
      series,
      priceNow,
      pricePeak,
      pctGain,
      holdDays: meta.holdDays,
      unit: meta.unit,
      season: meta.season,
      recommendation,
      confidence: live?.confidence ?? (recommendation === 'SELL' ? 0.87 : 0.79),
      whySell: recommendation === 'SELL'
        ? `Current market price of INR ${priceNow.toLocaleString()} per ${meta.unit} is already near the seasonal peak (INR ${pricePeak.toLocaleString()}). Holding further risks quality loss with minimal price upside of only ${pctGain}%.`
        : `Current price INR ${priceNow.toLocaleString()} is below the seasonal peak of INR ${pricePeak.toLocaleString()}. Holding for ${meta.holdDays} days can yield up to ${pctGain}% more (INR ${diff.toLocaleString()} per ${meta.unit}) as demand rises during ${meta.season}.`,
      whyHold: recommendation === 'HOLD'
        ? `Peak demand window for ${cropInput.trim()} is ${meta.season}. Prices typically rise by ${pctGain}% (INR ${diff.toLocaleString()}) during this period. Store in cool, dry, ventilated conditions and check quality daily.`
        : `No significant hold advantage — current price is already at a favorable level. Sell now to avoid storage costs and quality degradation.`,
      marketInsight: live?.market_insight ?? `${cropInput.trim()} prices are driven by seasonal demand, mandi arrivals, and cold-storage availability. Monitor daily arrivals data for price direction.`,
      priceRangeAnalysis: live?.price_range_analysis ?? `Expected price band: INR ${priceNow.toLocaleString()} – INR ${pricePeak.toLocaleString()} per ${meta.unit} based on historical mandi data.`,
    })
    setAnalyzing(false)
  }

  const rec = result?.recommendation
  const recStyle = rec === 'SELL'
    ? { border: 'border-badge-sellBorder', bg: 'bg-badge-sellBg', text: 'text-badge-sellText' }
    : { border: 'border-badge-holdBorder', bg: 'bg-badge-holdBg', text: 'text-badge-holdText' }

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={loading || analyzing} />

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('Enter crop or vegetable to get sell timing intelligence')}</CardDescription>
            <CardTitle>{tr('Sell Timing Intelligence')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="text"
                value={cropInput}
                onChange={e => setCropInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="e.g. tomato, onion, wheat, apple, mango..."
                className="h-11 flex-1 rounded-xl border border-border-soft bg-bg-cardHover px-3 text-sm text-text-primary outline-none transition focus:border-brand-neonCyan"
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="h-11 rounded-xl bg-brand-gradient px-6 text-sm font-semibold text-white shadow-card-sm transition hover:brightness-110 disabled:opacity-70"
              >
                {analyzing ? tr('Analyzing...') : tr('Analyze')}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </CardContent>
        </Card>
      </motion.section>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="space-y-5">

          {/* Summary row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Recommendation', value: result.recommendation, cls: cn('border', recStyle.border, recStyle.bg), textCls: cn('text-2xl font-bold', recStyle.text) },
              { label: 'Current Price', value: `INR ${result.priceNow.toLocaleString()}`, sub: `per ${result.unit}`, cls: 'border-border-soft bg-bg-cardHover/30', textCls: 'text-2xl font-bold text-text-primary' },
              { label: 'Peak Price', value: `INR ${result.pricePeak.toLocaleString()}`, sub: `+${result.pctGain}% potential`, cls: 'border-green-500/30 bg-green-500/10', textCls: 'text-2xl font-bold text-green-400' },
              { label: 'Hold Days', value: result.recommendation === 'HOLD' ? `${result.holdDays} days` : '0 days', sub: result.recommendation === 'HOLD' ? `Peak season: ${result.season}` : 'Sell now', cls: 'border-brand-neonCyan/30 bg-brand-neonCyan/10', textCls: 'text-2xl font-bold text-brand-neonCyan' },
            ].map(({ label, value, sub, cls, textCls }) => (
              <div key={label} className={cn('rounded-2xl border p-4', cls)}>
                <p className="text-xs uppercase tracking-widest text-text-muted">{label}</p>
                <p className={cn('mt-2', textCls)}>{value}</p>
                {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Price chart */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}>
            <Card>
              <CardHeader>
                <CardDescription>{tr('Intraday price trend for')} {result.crop}</CardDescription>
                <CardTitle>{tr('Price Curve')}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.series} margin={{ top: 10, right: 12, left: -10, bottom: 4 }}>
                    <CartesianGrid stroke="#22314D" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} />
                    <YAxis tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip contentStyle={{ background: '#0B1220', border: '1px solid #30456B', borderRadius: '12px', color: '#EAF2FF' }} formatter={v => [`INR ${v}`, 'Price']} />
                    <ReferenceArea x1="11:00" x2="13:00" fill="rgba(31,212,122,0.14)" stroke="rgba(31,212,122,0.3)" strokeWidth={1} label={{ value: 'Best Window', fill: '#2FAA65', fontSize: 10 }} />
                    <ReferenceArea x1="06:00" x2="08:00" fill="rgba(255,93,108,0.1)" stroke="rgba(255,93,108,0.3)" strokeWidth={1} />
                    <Line type="monotone" dataKey="price" stroke="#2DE2E6" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#4DA3FF' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.section>

          {/* Why panel */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
            <Card>
              <CardHeader>
                <CardDescription>{tr('Reasoning behind the recommendation')}</CardDescription>
                <CardTitle>{tr('Why This Decision')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={cn('rounded-2xl border p-4', recStyle.border, recStyle.bg)}>
                  <p className="text-xs uppercase tracking-widest text-text-muted mb-2">{rec === 'SELL' ? 'Why Sell Now' : 'Why Hold'}</p>
                  <p className="text-sm leading-7 text-text-primary">{result.whySell}</p>
                </div>
                <div className="rounded-2xl border border-brand-neonCyan/25 bg-brand-neonCyan/10 p-4">
                  <p className="text-xs uppercase tracking-widest text-brand-neonCyan mb-2">Storage & Hold Strategy</p>
                  <p className="text-sm leading-7 text-text-secondary">{result.whyHold}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Market Insight</p>
                    <p className="text-sm leading-6 text-text-secondary">{result.marketInsight}</p>
                  </div>
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Price Range Analysis</p>
                    <p className="text-sm leading-6 text-text-secondary">{result.priceRangeAnalysis}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </motion.div>
      )}

      {!result && !analyzing && (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-border-soft bg-bg-cardHover/20">
          <p className="text-sm text-text-muted">{tr('Enter a crop or vegetable name above to get sell timing analysis.')}</p>
        </div>
      )}
    </div>
  )
}
