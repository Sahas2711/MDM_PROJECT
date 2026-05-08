import { motion } from 'framer-motion'
import { Activity, Brain, Cpu, Moon, Sun, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState , useRef } from 'react'
import useTranslate from '../hooks/useTranslate'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  fetchAnalytics,
  fetchBackendHealth,
  fetchClusters,
  fetchVoiceHealth,
  fetchModelMetrics,
} from '../services/api'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import useAiLoading from '../hooks/useAiLoading'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import useChartTheme from '../hooks/useChartTheme'

// 4 deployed models — source: artifact_manifest_20260507T091738Z.json + model_metrics_20260507T091738Z.json
// Notebook-only (not deployed): KNN 89.39%, SVM 97.61%, Decision Tree 99.65%, Logistic Regression 99.01%
const MODEL_META = {
  random_forest:     { label: 'Random Forest',     color: '#2FAA65', unit: 'Unit I — Classification',    cvAcc: 99.50, testAcc: 99.65 },
  gradient_boosting: { label: 'Gradient Boosting', color: '#2DE2E6', unit: 'Unit I — Classification',    cvAcc: 99.68, testAcc: 99.59 },
  ann:               { label: 'ANN',               color: '#4DA3FF', unit: 'Unit III — ANN',             cvAcc: null,  testAcc: 98.89 },
  dnn:               { label: 'DNN',               color: '#A78BFA', unit: 'Unit III/V — Deep Learning', cvAcc: null,  testAcc: 98.89 },
}

// Notebook comparison models — trained in Updated_MDM_crop_prices.ipynb, not deployed to backend
const NOTEBOOK_ONLY_MODELS = [
  { label: 'KNN',                 unit: 'Unit I',  accuracy: '89.39%',          color: '#F7B955' },
  { label: 'SVM',                 unit: 'Unit I',  accuracy: '97.61%',          color: '#FF7A45' },
  { label: 'Decision Tree',       unit: 'Unit I',  accuracy: '99.65%',          color: '#A78BFA' },
  { label: 'Logistic Regression', unit: 'Unit I',  accuracy: '99.01%',          color: '#9AB1D3' },
  { label: 'K-Means',             unit: 'Unit II', accuracy: 'Silhouette 0.24', color: '#2DE2E6' },
  { label: 'Hierarchical',        unit: 'Unit II', accuracy: 'Silhouette 0.19', color: '#4DA3FF' },
]

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp']

function toPercent(value) {
  return typeof value === 'number' ? Number((value * 100).toFixed(2)) : null
}

function StatCard({ labelKey, value, subKey, icon: Icon, color, glow, delay }) {
  const tr = useTranslate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn('glass interactive-tile rounded-2xl p-5', glow)}
    >
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">{tr(labelKey)}</p>
        <div className={cn('rounded-lg bg-bg-elevated p-2', color)}>
          <Icon size={16} />
        </div>
      </div>
      <p className={cn('font-display text-2xl font-bold', color)}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{subKey}</p>
    </motion.div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-border-soft bg-bg-cardHover/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-text-primary">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const pageLoading = useAiLoading(800)
  const tr = useTranslate()
  const fileRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const chartTheme = useChartTheme()

  const [metrics, setMetrics] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [backendHealth, setBackendHealth] = useState(null)
  const [voiceHealth, setVoiceHealth] = useState(null)
  const [clusterSample, setClusterSample] = useState([])

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!ALLOWED.includes(file.type)) {
      return
    }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleScan = async () => {}

  useEffect(() => {
    Promise.allSettled([
      fetchModelMetrics(),
      fetchAnalytics(),
      fetchBackendHealth(),
      fetchVoiceHealth(),
      fetchClusters(80),
    ]).then(([metricsResult, analyticsResult, backendResult, voiceResult, clusterResult]) => {
      setMetricsLoading(false)

      if (metricsResult.status === 'fulfilled') {
        setMetrics(metricsResult.value.metrics || [])
      } else {
        setMetrics([])
      }

      setAnalytics(analyticsResult.status === 'fulfilled' ? analyticsResult.value : null)
      setBackendHealth(backendResult.status === 'fulfilled' ? backendResult.value : null)
      setVoiceHealth(voiceResult.status === 'fulfilled' ? voiceResult.value : null)
      setClusterSample(clusterResult.status === 'fulfilled' ? clusterResult.value.clusters || [] : [])
    })
  }, [])

  const modelCards = useMemo(
    () => metrics.map((metric) => {
      const meta = MODEL_META[metric.model] ?? { label: metric.model, color: '#4DA3FF' }
      return {
        ...metric,
        displayName: meta.label,
        color: meta.color,
        accuracyPct: toPercent(metric.accuracy ?? metric.cv_accuracy_mean),
        macroF1Pct: toPercent(metric.macro_f1),
        weightedF1Pct: toPercent(metric.weighted_f1),
        cvAccuracyPct: toPercent(metric.cv_accuracy_mean),
      }
    }),
    [metrics],
  )

  const scoreboardData = useMemo(
    () => modelCards.map((metric) => ({
      model: metric.displayName,
      accuracy: metric.accuracyPct,
      macroF1: metric.macroF1Pct,
      weightedF1: metric.weightedF1Pct,
      color: metric.color,
    })),
    [modelCards],
  )

  const selectedCurveModel = useMemo(
    () => modelCards.find((metric) => metric.model === 'ann') || modelCards.find((metric) => metric.model === 'dnn') || modelCards[0] || null,
    [modelCards],
  )

  const neuralHistoryData = useMemo(() => {
    if (!selectedCurveModel?.history?.accuracy || !selectedCurveModel?.history?.val_accuracy) return []
    return selectedCurveModel.history.accuracy.map((accuracy, index) => ({
      epoch: index + 1,
      trainAccuracy: toPercent(accuracy),
      valAccuracy: toPercent(selectedCurveModel.history.val_accuracy[index]),
      trainLoss: selectedCurveModel.history.loss?.[index] ?? null,
      valLoss: selectedCurveModel.history.val_loss?.[index] ?? null,
    }))
  }, [selectedCurveModel])

  const learningCurveData = useMemo(() => {
    const curveSource = modelCards.find((metric) => metric.learning_curve?.train_sizes?.length) || null
    if (!curveSource) return []
    return curveSource.learning_curve.train_sizes.map((size, index) => ({
      trainSize: size,
      trainAccuracy: toPercent(curveSource.learning_curve.train_accuracy_mean[index]),
      validationAccuracy: toPercent(curveSource.learning_curve.validation_accuracy_mean[index]),
    }))
  }, [modelCards])

  const validationCurveData = useMemo(() => {
    const curveSource = modelCards.find((metric) => metric.validation_curve?.param_range?.length) || null
    if (!curveSource) return { model: null, paramName: null, rows: [] }
    return {
      model: curveSource.displayName,
      paramName: curveSource.validation_curve.param_name,
      rows: curveSource.validation_curve.param_range.map((value, index) => ({
        param: value,
        trainAccuracy: toPercent(curveSource.validation_curve.train_accuracy_mean[index]),
        validationAccuracy: toPercent(curveSource.validation_curve.validation_accuracy_mean[index]),
      })),
    }
  }, [modelCards])

  const confusionSummary = useMemo(() => {
    const source = modelCards.find((metric) => metric.confusion_matrix?.length) || null
    if (!source) return []
    const labels = ['Low', 'Medium', 'High']
    return source.confusion_matrix.map((row, index) => ({
      actual: labels[index],
      predictedLow: row[0],
      predictedMedium: row[1],
      predictedHigh: row[2],
    }))
  }, [modelCards])

  const clusteredPoints = useMemo(
    () => clusterSample.map((point) => ({
      x: point.modal_price,
      y: point.max_price,
      cluster: point.cluster_id,
      commodity: point.commodity,
    })),
    [clusterSample],
  )

  const clustersById = useMemo(
    () => clusteredPoints.reduce((acc, point) => {
      const key = String(point.cluster)
      if (!acc[key]) acc[key] = []
      acc[key].push(point)
      return acc
    }, {}),
    [clusteredPoints],
  )

  const clusterColors = ['#FF7A45', '#4DA3FF', '#2FAA65', '#F7B955', '#A78BFA']

  const bestAccuracy = scoreboardData.length ? `${Math.max(...scoreboardData.map((metric) => metric.accuracy ?? 0)).toFixed(2)}%` : '—'
  const activeModel = backendHealth?.default_model || 'Unavailable'
  const cnnStatus = backendHealth?.cnn_model?.loaded ? 'Loaded' : 'Unavailable'
  const totalPredictions = analytics?.total ?? '—'

  const statCards = [
    {
      labelKey: 'Active Model',
      value: activeModel,
      subKey: 'Primary inference from backend health',
      icon: Brain,
      color: 'text-green-neon',
      glow: 'glow-green',
    },
    {
      labelKey: 'Deployed Models',
      value: modelCards.length || '4',
      subKey: 'RF • GB • ANN • DNN — Unit I, III, V',
      icon: TrendingUp,
      color: 'text-cyan-neon',
      glow: 'glow-cyan',
    },
    {
      labelKey: 'Total Predictions',
      value: totalPredictions,
      subKey: analytics ? `SELL ${analytics.sell} | HOLD ${analytics.hold}` : 'Waiting for analytics',
      icon: Activity,
      color: 'text-blue-ai',
      glow: '',
    },
    {
      labelKey: 'Best CV Accuracy',
      value: bestAccuracy,
      subKey: 'Gradient Boosting CV 99.68% — Unit I',
      icon: Cpu,
      color: 'text-green-neon',
      glow: '',
    },
  ]

  return (
    <div className="space-y-6">
      <AIAnalyzingOverlay loading={pageLoading} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">{tr('Dashboard')}</h1>
            <p className="mt-1 text-sm text-text-muted">{tr('System health, model status and crop quality scanner')}</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-11 items-center gap-2 self-start rounded-xl border border-border-soft bg-bg-elevated px-4 text-sm font-semibold text-text-primary shadow-sm transition hover:border-green-neon"
            aria-label="Toggle dashboard theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Switch to light' : 'Switch to dark'}</span>
          </button>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => <StatCard key={card.labelKey} {...card} delay={index * 0.07} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Prediction API</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{backendHealth?.status === 'ok' ? 'Live' : 'Offline'}</p>
          <p className="mt-1 text-sm text-text-muted">Version {backendHealth?.app_version ?? '—'}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Voice Assistant</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">{voiceHealth?.status === 'ok' ? 'Live' : 'Offline'}</p>
          <p className="mt-1 text-sm text-text-muted">{voiceHealth?.providers?.llm ? `LLM ${voiceHealth.providers.llm}` : 'Waiting for service'}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Average Confidence</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">
            {analytics ? `${(analytics.avg_confidence * 100).toFixed(1)}%` : '—'}
          </p>
          <p className="mt-1 text-sm text-text-muted">Calculated from saved prediction history</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="glass rounded-2xl p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-text-primary">Deployed Model Scoreboard</h2>
              <p className="mt-1 text-xs text-text-muted">RF · GB · ANN · DNN — source: model_metrics_20260507T091738Z.json from Updated_MDM_crop_prices.ipynb</p>
            </div>
          </div>

          {metricsLoading ? (
            <div className="flex h-72 items-center justify-center">
              <motion.div className="h-8 w-8 rounded-full border-2 border-green-neon border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreboardData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="model" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                  <YAxis domain={[90, 100]} tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={chartTheme.tooltip} formatter={(value) => [`${value}%`, 'Score']} />
                  <Legend />
                  <Bar dataKey="accuracy" name="Accuracy" radius={[6, 6, 0, 0]} fill="#2FAA65" />
                  <Bar dataKey="macroF1" name="Macro F1" radius={[6, 6, 0, 0]} fill="#4DA3FF" />
                  <Bar dataKey="weightedF1" name="Weighted F1" radius={[6, 6, 0, 0]} fill="#A78BFA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="glass rounded-2xl p-6"
        >
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-text-primary">Deployed Model Metrics</h2>
            <p className="mt-1 text-xs text-text-muted">artifact_manifest_20260507T091738Z.json · 4 models deployed to backend</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {modelCards.map((metric) => {
              const meta = MODEL_META[metric.model]
              return (
                <div key={metric.model} className="rounded-2xl border border-border-soft bg-bg-cardHover/35 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{metric.displayName}</p>
                      <p className="text-xs text-text-muted">{meta?.unit ?? metric.model}</p>
                    </div>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: metric.color }} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MiniMetric label="Test Accuracy" value={metric.accuracyPct ? `${metric.accuracyPct}%` : meta?.testAcc ? `${meta.testAcc}%` : 'N/A'} />
                    <MiniMetric label="CV Accuracy" value={metric.cvAccuracyPct ? `${metric.cvAccuracyPct}%` : meta?.cvAcc ? `${meta.cvAcc}%` : 'N/A'} />
                    <MiniMetric label="Macro F1" value={metric.macroF1Pct ? `${metric.macroF1Pct}%` : 'N/A'} />
                    <MiniMetric label="Weighted F1" value={metric.weightedF1Pct ? `${metric.weightedF1Pct}%` : 'N/A'} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 border-t border-border-soft pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Notebook-Only Models (not deployed — Updated_MDM_crop_prices.ipynb)</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {NOTEBOOK_ONLY_MODELS.map((m) => (
                <div key={m.label} className="flex items-center justify-between rounded-xl border border-border-soft bg-bg-cardHover/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{m.label}</p>
                      <p className="text-[10px] text-text-muted">{m.unit}</p>
                    </div>
                  </div>
                  <p className="font-mono text-xs font-bold text-text-secondary">{m.accuracy}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
          className="glass rounded-2xl p-6"
        >
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-text-primary">Neural Training Curve</h2>
            <p className="mt-1 text-xs text-text-muted">
              {selectedCurveModel ? `${selectedCurveModel.displayName} epoch history from notebook training export` : 'No neural history available'}
            </p>
          </div>
          {neuralHistoryData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-text-muted">No neural history available.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={neuralHistoryData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="epoch" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                  <YAxis domain={[85, 100]} tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={chartTheme.tooltip} formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Legend />
                  <Line type="monotone" dataKey="trainAccuracy" name="Train Accuracy" stroke="#2FAA65" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="valAccuracy" name="Validation Accuracy" stroke="#4DA3FF" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="glass rounded-2xl p-6"
        >
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-text-primary">Classical Model Learning Curve</h2>
            <p className="mt-1 text-xs text-text-muted">Train vs validation accuracy across notebook training sizes</p>
          </div>
          {learningCurveData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-text-muted">No learning curve available.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={learningCurveData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="trainSize" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                  <YAxis domain={[98, 100]} tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={chartTheme.tooltip} formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Legend />
                  <Line type="monotone" dataKey="trainAccuracy" name="Train Accuracy" stroke="#2FAA65" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="validationAccuracy" name="Validation Accuracy" stroke="#2DE2E6" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38 }}
          className="glass rounded-2xl p-6"
        >
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-text-primary">Validation Curve</h2>
            <p className="mt-1 text-xs text-text-muted">
              {validationCurveData.model ? `${validationCurveData.model} parameter sweep: ${validationCurveData.paramName}` : 'No validation curve available'}
            </p>
          </div>
          {validationCurveData.rows.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-text-muted">No validation curve available.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={validationCurveData.rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="param" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                  <YAxis domain={[99, 100]} tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={chartTheme.tooltip} formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Legend />
                  <Line type="monotone" dataKey="trainAccuracy" name="Train Accuracy" stroke="#2FAA65" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="validationAccuracy" name="Validation Accuracy" stroke="#A78BFA" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.41 }}
          className="glass rounded-2xl p-6"
        >
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-text-primary">Confusion Matrix Summary</h2>
            <p className="mt-1 text-xs text-text-muted">Notebook test-set counts by actual class</p>
          </div>
          {confusionSummary.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-text-muted">No confusion matrix available.</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confusionSummary} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="actual" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                  <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                  <Tooltip contentStyle={chartTheme.tooltip} />
                  <Legend />
                  <Bar dataKey="predictedLow" name="Predicted Low" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="predictedMedium" name="Predicted Medium" stackId="a" fill="#4DA3FF" />
                  <Bar dataKey="predictedHigh" name="Predicted High" stackId="a" fill="#2FAA65" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.43 }}
        className="glass rounded-2xl p-6"
      >
        <div className="mb-4">
          <h2 className="font-display text-base font-semibold text-text-primary">Notebook Cluster Scatter</h2>
          <p className="mt-1 text-xs text-text-muted">Real cluster assignments from the production KMeans pipeline exposed by the backend</p>
        </div>
        {clusteredPoints.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-text-muted">No cluster sample available.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Modal Price" tick={{ fill: chartTheme.tick, fontSize: 10 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Max Price" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={{ stroke: chartTheme.axis }} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: chartTheme.axis, strokeDasharray: '4 4' }}
                  contentStyle={chartTheme.tooltip}
                  formatter={(value, name) => [Number(value).toFixed(2), name === 'x' ? 'Modal Price' : 'Max Price']}
                  labelFormatter={() => ''}
                />
                <Legend />
                {Object.entries(clustersById).map(([clusterId, points]) => (
                  <Scatter
                    key={clusterId}
                    name={`Cluster ${clusterId}`}
                    data={points}
                    fill={clusterColors[Number(clusterId) % clusterColors.length]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

    </div>
  )
}
