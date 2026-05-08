import { motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
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
import { fetchModelMetrics, fetchPredictionWithModel, fetchPredictImage } from '../services/api'
import { cn } from '../lib/utils'

// ── Constants ────────────────────────────────────────────────────────────────
const MODELS = [
  { key: 'random_forest',     label: 'Random Forest',     color: '#4DA3FF' },
  { key: 'gradient_boosting', label: 'Gradient Boosting', color: '#F7B955' },
  { key: 'ann',               label: 'ANN',               color: '#2FAA65' },
  { key: 'dnn',               label: 'DNN',               color: '#A78BFA' },
]

const MODEL_COLORS = { random_forest:'#4DA3FF', gradient_boosting:'#F7B955', ann:'#2FAA65', dnn:'#A78BFA' }
const REC_COLOR = { SELL: 'text-green-400', HOLD: 'text-yellow-300' }
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp']

const insightPoints = [
  'Random Forest and Gradient Boosting use ensemble decision trees — they generalize well on tabular price data with minimal tuning.',
  'ANN and DNN models are trained with early stopping and dropout to prevent overfitting on the crop price dataset.',
  'Cross-validation accuracy (cv_accuracy_mean) is used as the primary benchmark — it reflects real generalization, not just training fit.',
]

function ModelPerformance() {
  const tr = useTranslate()
  const loading = useAiLoading(820)

  // ── Live metrics from /model-metrics ─────────────────────────────────────
  const [metrics, setMetrics] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(true)

  useEffect(() => {
    fetchModelMetrics()
      .then(d => setMetrics(d.metrics || []))
      .catch(() => setMetrics([]))
      .finally(() => setMetricsLoading(false))
  }, [])

  const metricsChartData = metrics
    .map(m => ({
      model: m.model.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      accuracy: m.cv_accuracy_mean != null
        ? +(m.cv_accuracy_mean * 100).toFixed(2)
        : m.macro_f1 != null ? +(m.macro_f1 * 100).toFixed(2) : null,
      color: MODEL_COLORS[m.model] ?? '#4DA3FF',
    }))
    .filter(m => m.accuracy != null)

  const bestModel = metricsChartData.length
    ? metricsChartData.reduce((b, c) => c.accuracy > b.accuracy ? c : b)
    : { model: '—', accuracy: 0 }

  // ── Model comparison state ──────────────────────────────────────────────────
  const [cmpMin, setCmpMin] = useState('')
  const [cmpMax, setCmpMax] = useState('')
  const [cmpRunning, setCmpRunning] = useState(false)
  const [cmpResults, setCmpResults] = useState([])
  const [cmpError, setCmpError] = useState(null)

  // ── Image scan state ────────────────────────────────────────────────────────
  const fileRef = useRef(null)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)

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

  const cmpChartData = cmpResults
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
            {metricsLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-muted">Loading metrics...</p>
              </div>
            ) : metricsChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-muted">Backend unavailable — start the server to see live metrics.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsChartData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid stroke="#22314D" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model" tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} interval={0} angle={-12} textAnchor="end" height={56} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9AB1D3', fontSize: 12 }} axisLine={{ stroke: '#30456B' }} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => [`${v}%`, 'Accuracy']} contentStyle={{ background: '#0B1220', border: '1px solid #30456B', borderRadius: '12px', color: '#EAF2FF' }} />
                <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                  {metricsChartData.map(entry => (
                    <Cell key={entry.model} fill={entry.color} fillOpacity={entry.model === bestModel.model ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
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

      <ExplainabilityPanel
        bullets={[
          'Live comparison calls all 4 models in parallel via Promise.allSettled — one failure does not block the others.',
          'Confidence bar per model uses predict_proba from scikit-learn; unavailable models show an error tile instead of crashing.',
          'CNN freshness scanner runs independently of price models — uses a separate TensorFlow endpoint (/predict-image).',
        ]}
      />
    </div>
  )
}

export default ModelPerformance