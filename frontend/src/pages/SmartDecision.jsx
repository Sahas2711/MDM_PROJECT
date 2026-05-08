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

// ── Pipeline graph nodes ──────────────────────────────────────────────────────
const PIPELINE_NODES = [
  { id: 'fruit_check',    icon: '🔍', label: 'Fruit Check',          desc: 'Validating image is a crop/fruit' },
  { id: 'cnn_freshness',  icon: '🧠', label: 'CNN Freshness',         desc: 'Classifying Fresh / Rotten' },
  { id: 'price_fetch',    icon: '🌐', label: 'Market Price Fetch',    desc: 'Live price via web search' },
  { id: 'feature_build',  icon: '⚙️', label: 'Feature Pipeline',      desc: 'Building 9-feature input vector' },
  { id: 'price_model',    icon: '💰', label: 'Price Model',           desc: 'RF / ANN / DNN inference' },
  { id: 'cluster',        icon: '🔵', label: 'Cluster Analysis',      desc: 'KMeans market segmentation' },
  { id: 'decision',       icon: '⚖️', label: 'Decision Engine',       desc: 'SELL / HOLD / DO NOT SELL' },
  { id: 'narrative',      icon: '✍️', label: 'AI Narrative',          desc: 'Generating analysis report' },
]

const FULL_PIPELINE_NODES = [
  { id: 'preprocessing',     icon: '⚡', label: 'Preprocessing',        desc: 'Preparing the uploaded crop image for downstream analysis' },
  { id: 'image_validation',  icon: '🔍', label: 'Image Validation',     desc: 'Validating that the image contains a crop or fruit' },
  { id: 'quality_analysis',  icon: '🧠', label: 'Quality Analysis',     desc: 'Classifying freshness and image quality confidence' },
  { id: 'feature_pipeline',  icon: '⚙️', label: 'Feature Pipeline',     desc: 'Building the 9-feature input vector for pricing' },
  { id: 'price_model',       icon: '💰', label: 'Price Model Ensemble', desc: 'Running RF / ANN / DNN pricing inference' },
  { id: 'cluster_analysis',  icon: '🔵', label: 'Cluster Analysis',     desc: 'Applying market cluster segmentation signals' },
  { id: 'market_enrichment', icon: '🌐', label: 'Market Enrichment',    desc: 'Adding web price context and market trend data' },
  { id: 'decision_engine',   icon: '⚖️', label: 'Decision Engine',      desc: 'Producing the final sell / hold recommendation' },
  { id: 'hold_strategy',     icon: '🏪', label: 'Hold Strategy',        desc: 'Generating storage and hold-duration guidance' },
]

// Status: 'idle' | 'running' | 'done' | 'error'
const NODE_STATUS_STYLE = {
  idle:    { ring: 'border-border-soft',       bg: 'bg-bg-cardHover/20',  icon: 'text-text-muted/40',  label: 'text-text-muted',    badge: null },
  running: { ring: 'border-brand-neonCyan/70', bg: 'bg-brand-neonCyan/8', icon: 'text-brand-neonCyan', label: 'text-brand-neonCyan', badge: 'bg-brand-neonCyan/20 text-brand-neonCyan border-brand-neonCyan/40' },
  done:    { ring: 'border-green-500/50',      bg: 'bg-green-500/8',      icon: 'text-green-400',      label: 'text-text-primary',  badge: 'bg-green-500/20 text-green-400 border-green-500/40' },
  error:   { ring: 'border-red-500/50',        bg: 'bg-red-500/8',        icon: 'text-red-400',        label: 'text-red-400',       badge: 'bg-red-500/20 text-red-400 border-red-500/40' },
}

function PipelineGraph({ currentStep }) {
  // currentStep: 0=idle, 1..8=running that node index (1-based), 9=all done
  return (
    <div className="rounded-2xl border border-border-soft bg-bg-cardHover/10 p-5">
      <div className="mb-4 flex items-center gap-2">
        <motion.div
          className="h-2 w-2 rounded-full bg-brand-neonCyan"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        />
        <p className="text-xs font-bold uppercase tracking-widest text-brand-neonCyan">Pipeline Executing</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {FULL_PIPELINE_NODES.map((node, i) => {
          const nodeNum = i + 1
          let status = 'idle'
          if (currentStep === 0) status = 'idle'
          else if (nodeNum < currentStep) status = 'done'
          else if (nodeNum === currentStep) status = 'running'
          else status = 'idle'

          const s = NODE_STATUS_STYLE[status]

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className={cn('relative rounded-xl border p-3 transition-all duration-300', s.ring, s.bg)}
            >
              {/* Running pulse ring */}
              {status === 'running' && (
                <motion.div
                  className="absolute inset-0 rounded-xl border border-brand-neonCyan/40"
                  animate={{ opacity: [0.8, 0, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                />
              )}

              <div className="flex items-start justify-between gap-2">
                <span className={cn('text-xl', s.icon)}>{node.icon}</span>
                {status === 'running' && (
                  <motion.div
                    className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-brand-neonCyan border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  />
                )}
                {status === 'done' && (
                  <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] text-white font-bold">✓</span>
                )}
                {status === 'idle' && (
                  <span className="mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border-soft text-[9px] text-text-muted font-mono">{nodeNum}</span>
                )}
              </div>

              <p className={cn('mt-2 text-xs font-semibold leading-tight', s.label)}>{node.label}</p>
              <p className="mt-0.5 text-[10px] text-text-muted leading-tight">{node.desc}</p>

              {s.badge && (
                <span className={cn('mt-2 inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', s.badge)}>
                  {status}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border-soft">
        <motion.div
          className="h-full rounded-full bg-brand-neonCyan"
          animate={{ width: `${Math.min((currentStep / FULL_PIPELINE_NODES.length) * 100, 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1.5 text-right text-[10px] text-text-muted">
        {currentStep === 0 ? 'Starting...' : currentStep > FULL_PIPELINE_NODES.length ? 'Complete' : `Step ${currentStep} of ${FULL_PIPELINE_NODES.length}`}
      </p>
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

const FULL_STEPS = [
  { id: 1, label: 'Preprocessing', desc: 'Preparing the uploaded crop image for the pipeline...' },
  { id: 2, label: 'Image Validation', desc: 'Checking whether the uploaded image is really a fruit or crop image...' },
  { id: 3, label: 'Quality Analysis', desc: 'Measuring crop freshness confidence from the image...' },
  { id: 4, label: 'Feature Pipeline', desc: 'Building the 9-feature crop price input bundle...' },
  { id: 5, label: 'Price Model Ensemble', desc: 'Running the learned pricing models on the feature vector...' },
  { id: 6, label: 'Cluster Analysis', desc: 'Comparing the crop against learned market cluster patterns...' },
  { id: 7, label: 'Market Enrichment', desc: 'Collecting market price context and fallback price logic...' },
  { id: 8, label: 'Decision Engine', desc: 'Combining image and price signals into a final recommendation...' },
  { id: 9, label: 'Hold Strategy', desc: 'Generating hold guidance and storage instructions...' },
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

function formatPercent(value, digits = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
  return `${(value * 100).toFixed(digits)}%`
}

function formatCurrencyRange(min, max) {
  if (typeof min !== 'number' || typeof max !== 'number') return 'N/A'
  return `INR ${min.toLocaleString()} - ${max.toLocaleString()}`
}

function summarizeText(text) {
  if (!text) return null
  const normalized = String(text).replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized
  return firstSentence.length > 140 ? `${firstSentence.slice(0, 137)}...` : firstSentence
}

function getMarketTrend(result) {
  const marketNode = result?.node_graph?.nodes?.find((node) => node.node === 'MARKET_ENRICHMENT')
  return marketNode?.output?.trend ?? marketNode?.output?.market_trend ?? result?.market_trend ?? 'Contextual'
}

function getNodeConfidence(node) {
  const raw = node?.output?.confidence ?? node?.output?.score ?? node?.output?.freshness_confidence
  return typeof raw === 'number' ? `${(raw * 100).toFixed(1)}%` : null
}

function getTopFeatureSignals(featureContributions = [], limit = 2) {
  return featureContributions
    .filter((item) => typeof item?.impact === 'number')
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit)
}

function buildNodeWhy(node, result) {
  if (!node) return null

  const featureSignals = getTopFeatureSignals(result?.feature_contributions ?? [], 2)
  const highProb = result?.price_probabilities?.High
  const mediumProb = result?.price_probabilities?.Medium
  const lowProb = result?.price_probabilities?.Low
  const bestBand = [
    { label: 'High', value: highProb },
    { label: 'Medium', value: mediumProb },
    { label: 'Low', value: lowProb },
  ]
    .filter((item) => typeof item.value === 'number')
    .sort((a, b) => b.value - a.value)[0]

  switch (node.node) {
    case 'PREPROCESSING':
      return `The uploaded image was decoded with ${node.output?.decoder ?? 'the image decoder'}, resized from ${Array.isArray(node.output?.original_size) ? node.output.original_size.join('x') : node.output?.original_size ?? 'unknown'} to ${Array.isArray(node.output?.resized_to) ? node.output.resized_to.join('x') : '128x128'}, and normalized to the [0,1] range before CNN inference. ${node.output?.yolo_label ? `YOLO also detected '${node.output.yolo_label}' at ${formatPercent(node.output.yolo_conf, 1)} before the validation crop was passed forward.` : 'No supported YOLO fruit box was retained above the detection threshold.'}`

    case 'IMAGE_VALIDATION':
      if (typeof result?.fruit_confidence === 'number') {
        return `Validation classified the image as ${node.output?.fruit_label ?? 'a crop sample'} with ${formatPercent(result.fruit_confidence, 1)} confidence, so the pipeline continued.`
      }
      return 'Validation confirmed that the uploaded image matches the expected crop/fruit class needed for downstream inference.'

    case 'QUALITY_ANALYSIS':
      if (typeof result?.confidence === 'number') {
        return `The freshness CNN predicted ${result.freshness} with ${formatPercent(result.confidence, 1)} confidence after analyzing the normalized 128x128 RGB image. The current backend exposes only the final class probability and the defect summary '${node.output?.defect_indicators ?? 'not available'}'; it does not yet return per-region or per-feature attribution weights, so showing exact visual contributors would require adding Grad-CAM or saliency outputs in the backend.`
      }
      return 'The CNN quality model estimated freshness from visual crop signals before pricing logic was applied.'

    case 'FEATURE_PIPELINE':
      if (featureSignals.length > 0) {
        const featureText = featureSignals.map((item) => `${item.feature} (${item.value})`).join(' and ')
        return `The 9-feature pricing vector was built using market context plus high-impact signals such as ${featureText}, which contributed most to price confidence.`
      }
      return 'The feature pipeline combined crop metadata and market context into the 9-feature vector required by the price ensemble.'

    case 'PRICE_MODEL':
      if (bestBand) {
        const signalText = featureSignals.length > 0
          ? ` Strongest supporting features were ${featureSignals.map((item) => item.feature).join(' and ')}.`
          : ''
        return `The ensemble model gave the highest probability to the ${bestBand.label} band at ${formatPercent(bestBand.value)} and mapped it to ${node.output?.predicted_price_range ?? 'the current price range'}.${signalText}`
      }
      return 'The pricing ensemble compared the extracted features against learned price patterns and selected the most probable output band.'

    case 'CLUSTER_ANALYSIS':
      if (typeof result?.cluster_distance === 'number') {
        return `The sample aligned most closely with cluster ${result.cluster_id}, with a distance of ${result.cluster_distance}, indicating similarity to historical pricing behavior in that group.`
      }
      return 'Cluster analysis matched the crop against learned market-behavior groups to refine the price interpretation.'

    case 'MARKET_ENRICHMENT':
      return `Market enrichment combined the model price range with external context, yielding a ${getMarketTrend(result)} trend signal${node.status === 'PARTIAL' ? ' while using partial fallback market evidence' : ''}.`

    case 'DECISION_ENGINE':
      if (typeof result?.estimated_min_price === 'number' && typeof result?.estimated_max_price === 'number') {
        const midpoint = Math.round((result.estimated_min_price + result.estimated_max_price) / 2)
        return `The decision engine fused freshness, the ${result.price_prediction_label ?? 'predicted'} price band, and market context to reach ${result.recommendation} around an expected value near INR ${midpoint.toLocaleString()}.`
      }
      return 'The decision engine fused quality, pricing, and market evidence into the final recommendation.'

    case 'HOLD_STRATEGY':
      if (result?.should_hold) {
        return `Hold strategy recommended a ${result.hold_duration_days}-day wait because current quality can sustain storage while market conditions suggest better value after a short delay.`
      }
      return 'Hold strategy found limited upside from waiting, so immediate action is preferred over storage.'

    default:
      return summarizeText(node.why)
  }
}

function buildKeyReasons(result) {
  if (!result) return []

  const reasons = []

  if (result.fruit_detected) {
    reasons.push(`Vision validation accepted the upload as a crop image with ${formatPercent(result.fruit_confidence, 1)} confidence.`)
  } else {
    reasons.push('Vision validation could not confidently confirm a crop image, so downstream reasoning is constrained.')
  }

  if (result.freshness && result.recommendation !== 'NOT FRUIT IMAGE') {
    reasons.push(`${result.freshness} visual quality was detected with ${formatPercent(result.confidence, 1)} freshness confidence.`)
  }

  if (result.price_prediction_label || result.ml_model_used) {
    reasons.push(`The ensemble pricing stack placed this sample in the ${result.price_prediction_label ?? 'estimated'} price band${result.ml_model_used ? ` using ${result.ml_model_used}` : ''}.`)
  }

  if (typeof result.cluster_id === 'number' && result.cluster_id >= 0) {
    reasons.push(`Cluster ${result.cluster_id} alignment supports the market pattern used for the recommendation.`)
  }

  if (result.should_hold) {
    reasons.push(`Hold guidance favors a ${result.hold_duration_days}-day wait window based on current quality and market context.`)
  } else if (result.recommendation && result.recommendation !== 'NOT FRUIT IMAGE') {
    reasons.push('Immediate sale is favored because the expected hold upside is limited under current market conditions.')
  }

  return reasons.slice(0, 5)
}

function SummaryStat({ label, value, accent = 'default', subvalue }) {
  const accentClass = {
    default: 'border-border-soft bg-bg-cardHover/30 text-text-primary',
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    warning: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
    danger: 'border-red-500/30 bg-red-500/10 text-red-300',
    cyan: 'border-brand-neonCyan/30 bg-brand-neonCyan/10 text-brand-neonCyan',
  }[accent]

  return (
    <div className={cn('rounded-2xl border p-4 backdrop-blur-sm', accentClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {subvalue ? <p className="mt-1 text-xs text-text-muted">{subvalue}</p> : null}
    </div>
  )
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-neonCyan">{eyebrow}</p> : null}
      <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
      {description ? <p className="max-w-3xl text-sm text-text-muted">{description}</p> : null}
    </div>
  )
}

function ProbabilityBar({ label, value, tone = 'cyan' }) {
  const colorClass = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500',
    cyan: 'bg-brand-neonCyan',
  }[tone]

  const pct = typeof value === 'number' ? Math.max(0, Math.min(value * 100, 100)) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-semibold text-text-primary">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-cardHover">
        <motion.div
          className={cn('h-full rounded-full', colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

function AdvancedPanel({ title, children, defaultOpen = false }) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-border-soft bg-bg-cardHover/20 transition open:border-brand-neonCyan/30 open:bg-brand-neonCyan/5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        <span className="text-xs text-text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-border-soft px-4 py-4">
        {children}
      </div>
    </details>
  )
}

function SmartDecision() {
  const tr = useTranslate()
  const pageLoading = useAiLoading(820)
  const fileRef = useRef(null)

  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [cropHint, setCropHint] = useState('')
  const [enableEnhancement, setEnableEnhancement] = useState(false)
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
    const stepTimer = setInterval(() => setStep((s) => Math.min(s + 1, FULL_PIPELINE_NODES.length)), 1700)

    try {
      const data = await fetchSmartDecision(imageFile, cropHint, enableEnhancement)
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
  const keyReasons = result ? buildKeyReasons(result) : []
  const marketTrend = result ? getMarketTrend(result) : 'Contextual'
  const topFeatureContributions = result?.feature_contributions?.slice(0, 5) ?? []
  const enhancementMeta = result?.node_graph?.nodes?.[0]?.output?.enhancement ?? null

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={pageLoading} />

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('Image validation + CNN freshness + 9-feature price classification + why-based hold guidance')}</CardDescription>
            <CardTitle>{tr('Smart Crop Decision Engine')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1">
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
            </div>

            {/* Real-ESRGAN toggle */}
            <button
              type="button"
              onClick={() => setEnableEnhancement((v) => !v)}
              className={cn(
                'inline-flex h-10 w-fit items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition',
                enableEnhancement
                  ? 'border-brand-neonCyan/60 bg-brand-neonCyan/10 text-brand-neonCyan'
                  : 'border-border-soft bg-bg-cardHover text-text-muted hover:border-brand-neonCyan/40',
              )}
            >
              <span className={cn('relative inline-flex h-4 w-8 shrink-0 rounded-full transition-colors', enableEnhancement ? 'bg-brand-neonCyan' : 'bg-border-strong')}>
                <span className={cn('absolute top-0 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200', enableEnhancement ? 'translate-x-4' : 'translate-x-0')} />
              </span>
              Real-ESRGAN Enhancement
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', enableEnhancement ? 'border-brand-neonCyan/40 text-brand-neonCyan' : 'border-border-soft text-text-muted')}>
                {enableEnhancement ? 'ON' : 'OFF'}
              </span>
            </button>

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
                {FULL_STEPS.map((s) => (
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
                <section className="theme-panel overflow-hidden rounded-[28px] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
                  <SectionHeader
                    eyebrow="AI Decision Summary"
                    title={tr('Executive decision snapshot')}
                    description={tr('Fast read for operators: what the model saw, what it predicts, and how the market context shifts the recommendation.')}
                  />
                  {enhancementMeta && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'mb-4 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm',
                        enhancementMeta.enhanced
                          ? 'border-brand-neonCyan/30 bg-brand-neonCyan/8 text-brand-neonCyan'
                          : 'border-border-soft bg-bg-cardHover/30 text-text-muted',
                      )}
                    >
                      <span className="font-semibold">
                        {enhancementMeta.enhanced ? '✦ Real-ESRGAN Enhanced' : `Enhancement: ${enhancementMeta.reason ?? 'off'}`}
                      </span>
                      {enhancementMeta.original_size && (
                        <span className="text-xs opacity-70">
                          {enhancementMeta.original_size[0]}×{enhancementMeta.original_size[1]}
                          {enhancementMeta.enhanced && enhancementMeta.enhanced_size
                            ? ` → ${enhancementMeta.enhanced_size[0]}×${enhancementMeta.enhanced_size[1]}`
                            : ''}
                        </span>
                      )}
                    </motion.div>
                  )}

                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryStat label={tr('Fruit detected')} value={result.fruit_detected ? tr('Detected') : tr('Uncertain')} accent={result.fruit_detected ? 'success' : 'warning'} subvalue={`${fruitPct}% ${tr('vision confidence')}`} />
                      <SummaryStat label={tr('Freshness result')} value={fruitFailed ? tr('Stopped') : result.freshness} accent={fruitFailed ? 'warning' : result.freshness === 'Fresh' ? 'success' : 'danger'} subvalue={fruitFailed ? tr('Validation gate blocked downstream quality analysis.') : `${freshnessPct}% ${tr('CNN confidence')}`} />
                      <SummaryStat label={tr('Final recommendation')} value={result.recommendation} accent={result.recommendation === 'SELL' ? 'success' : result.recommendation === 'DO NOT SELL' || fruitFailed ? 'danger' : 'warning'} subvalue={result.should_hold ? `${result.hold_duration_days} ${tr('days hold window')}` : tr('Immediate action preferred')} />
                      <SummaryStat label={tr('Estimated market price')} value={fruitFailed ? tr('Unavailable') : formatCurrencyRange(result.estimated_min_price, result.estimated_max_price)} accent="cyan" subvalue={fruitFailed ? tr('Pricing skipped') : `${result.price_prediction_label} ${tr('band')} · ${marketTrend}`} />
                      <SummaryStat label={tr('Confidence score')} value={fruitFailed ? `${fruitPct}%` : `${freshnessPct}%`} subvalue={fruitFailed ? tr('Validation confidence') : tr('Freshness model confidence')} />
                      <SummaryStat label={tr('Price category')} value={fruitFailed ? tr('Skipped') : (result.price_prediction_label ?? tr('Unavailable'))} subvalue={fruitFailed ? tr('No ensemble price output') : (result.ml_model_used ?? tr('Model unspecified'))} />
                      <SummaryStat label={tr('Market trend')} value={fruitFailed ? tr('N/A') : marketTrend} subvalue={fruitFailed ? tr('Market enrichment skipped') : (result.price_source === 'web_search' ? tr('Live web context') : tr('Dataset fallback context'))} />
                      <SummaryStat label={tr('Hold horizon')} value={result.should_hold ? `${result.hold_duration_days} ${tr('days')}` : tr('Do not hold')} subvalue={result.should_hold ? tr('Hold strategy active') : tr('No waiting premium detected')} accent={result.should_hold ? 'warning' : 'default'} />
                    </div>

                    {preview && (
                      <div className="relative overflow-hidden rounded-[24px] border border-border-soft bg-bg-cardHover/50">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                          <span>{tr('AI Crop Analysis')}</span>
                          <span>{result.feature_context?.commodity ?? (cropHint || tr('Crop sample'))}</span>
                        </div>
                        <img src={preview} alt="analyzed" className="h-full min-h-[280px] w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-2 px-4 py-4">
                          <div className="rounded-2xl border border-border-soft bg-bg-elevated/85 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{tr('Decision')}</p>
                            <p className={cn('mt-1 text-sm font-semibold', rec.text)}>{result.recommendation}</p>
                          </div>
                          <div className="rounded-2xl border border-border-soft bg-bg-elevated/85 px-3 py-2 backdrop-blur-sm">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{tr('Market trend')}</p>
                            <p className="mt-1 text-sm font-semibold text-text-primary">{marketTrend}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] border border-border-soft bg-bg-cardHover/20 p-5">
                  <SectionHeader
                    eyebrow="Key Reasons"
                    title={tr('Why the recommendation moved this way')}
                    description={tr('A concise explanation layer for farmers and operators. Full technical traces stay below.')}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    {keyReasons.map((reason, index) => (
                      <div key={`${reason}-${index}`} className="flex gap-3 rounded-2xl border border-border-soft bg-bg-cardHover/30 px-4 py-3">
                        <span className="mt-0.5 text-brand-neonCyan">{index + 1}</span>
                        <p className="text-sm leading-6 text-text-secondary">{reason}</p>
                      </div>
                    ))}
                  </div>
                </section>
                  
                {/* {!fruitFailed && (
                  <section className="rounded-[24px] border border-border-soft bg-bg-cardHover/20 p-5">
                    <SectionHeader
                      eyebrow="Market + Price Analysis"
                      title={tr('Pricing evidence and market context')}
                      description={tr('Condensed analytical view of the ensemble output, market enrichment, and cluster behavior.')}
                    />
                    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoCard label={tr('Estimated Market Price')} value={formatCurrencyRange(result.estimated_min_price, result.estimated_max_price)} subvalue={result.price_source === 'web_search' ? tr('Live web search pricing context') : tr('Dataset fallback pricing context')} tone="default" />
                          <InfoCard label={tr('Cluster Insight')} value={result.cluster_id >= 0 ? `Cluster ${result.cluster_id}` : tr('Unavailable')} subvalue={result.cluster_id >= 0 ? `${tr('Distance')}: ${result.cluster_distance}` : tr('K-means model not available')} tone="default" />
                        </div>
                        <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Price confidence distribution')}</p>
                          <div className="mt-4 space-y-3">
                            <ProbabilityBar label="High" value={result.price_probabilities?.High ?? 0} tone="green" />
                            <ProbabilityBar label="Medium" value={result.price_probabilities?.Medium ?? 0} tone="yellow" />
                            <ProbabilityBar label="Low" value={result.price_probabilities?.Low ?? 0} tone="red" />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Market signal')}</p>
                          <p className="mt-2 text-lg font-semibold text-text-primary">{marketTrend}</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{summarizeText(result.market_insight) ?? tr('Market enrichment returned a stable context signal.')}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Price model interpretation')}</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{summarizeText(result.price_reason) ?? tr('The ensemble price model generated the current recommendation band.')}</p>
                          <p className="mt-3 text-xs leading-5 text-text-muted">{result.price_range_analysis}</p>
                        </div>

                        {topFeatureContributions.length > 0 && (
                          <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Top feature contributions')}</p>
                            <div className="mt-4 space-y-3">
                              {topFeatureContributions.map((fc, i) => {
                                const barColor = fc.direction === 'positive' ? 'bg-green-500' : fc.direction === 'negative' ? 'bg-red-500' : 'bg-yellow-400'
                                const textColor = fc.direction === 'positive' ? 'text-green-400' : fc.direction === 'negative' ? 'text-red-400' : 'text-yellow-300'
                                return (
                                  <div key={i} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-text-primary">{fc.feature}</p>
                                        <p className="text-xs text-text-muted">{fc.value}</p>
                                      </div>
                                      <span className={cn('text-xs font-bold', textColor)}>{(fc.impact * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-cardHover">
                                      <motion.div
                                        className={cn('h-full rounded-full', barColor)}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round(fc.impact * 100)}%` }}
                                        transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                      />
                                    </div>
                                    <p className="text-xs leading-5 text-text-muted">{summarizeText(fc.explanation)}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )} */}

                {!fruitFailed && result.node_graph?.nodes?.length > 0 && (
                  <section className="rounded-[24px] border border-border-soft bg-bg-cardHover/20 p-5">
                    <SectionHeader
                      eyebrow="Technical Pipeline"
                      title={tr('n8n-style workflow execution')}
                      description={tr('Each node shows only its local responsibility: model, inputs, outputs, confidence, dependencies, and concise why-notes.')}
                    />
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
                      {['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED'].map((s) => {
                        const count = result.node_graph.nodes.filter((node) => node.status === s).length
                        if (!count) return null
                        const color = s === 'SUCCESS' ? 'text-green-400 border-green-500/30 bg-green-500/10' : s === 'FAILED' ? 'text-red-400 border-red-500/30 bg-red-500/10' : s === 'PARTIAL' ? 'text-yellow-300 border-yellow-400/30 bg-yellow-400/10' : 'text-text-muted border-border-soft bg-bg-cardHover/30'
                        return <span key={s} className={cn('rounded-full border px-2.5 py-1 font-semibold', color)}>{count} {s}</span>
                      })}
                      <span className="rounded-full border border-border-soft bg-bg-cardHover/30 px-2.5 py-1 text-text-muted">
                        {result.node_graph.edges?.length ?? 0} edges
                      </span>
                    </div>
                    <div className="pl-1">
                      {result.node_graph.nodes.map((node, i) => (
                        <WorkflowNode
                          key={node.id}
                          node={{
                            ...node,
                            why: buildNodeWhy(node, result) ?? summarizeText(node.why),
                            output: {
                              ...node.output,
                              ...(getNodeConfidence(node) ? { confidence: getNodeConfidence(node) } : {}),
                            },
                          }}
                          index={i}
                          isLast={i === result.node_graph.nodes.length - 1}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <section className={cn('rounded-[24px] border p-5', rec.border, rec.bg)}>
                  <SectionHeader
                    eyebrow="Decision Engine"
                    title={tr('Final recommendation logic')}
                    description={tr('This is the single place where the full hold / sell reasoning is assembled.')}
                  />
                  <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                    <div className="space-y-3">
                      <InfoCard
                        label={tr('Decision')}
                        value={result.recommendation}
                        subvalue={fruitFailed ? tr('Validation gate halted the rest of the decision path.') : `${tr('Price class')}: ${result.price_prediction_label} · ${tr('Trend')}: ${marketTrend}`}
                        tone={result.recommendation === 'SELL' ? 'success' : result.recommendation === 'DO NOT SELL' || fruitFailed ? 'danger' : 'warning'}
                      />
                      <InfoCard
                        label={tr('Quality impact')}
                        value={fruitFailed ? tr('Validation blocked') : result.freshness}
                        subvalue={fruitFailed ? result.image_reason : summarizeText(result.image_reason)}
                        tone={fruitFailed ? 'warning' : result.freshness === 'Fresh' ? 'success' : 'danger'}
                      />
                      <InfoCard
                        label={tr('Time-to-hold logic')}
                        value={result.should_hold ? `${result.hold_duration_days} ${tr('days')}` : tr('Do not hold')}
                        subvalue={result.should_hold ? summarizeText(result.hold_reason) : summarizeText(result.not_hold_reason || result.hold_reason)}
                        tone={result.should_hold ? 'warning' : 'default'}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Final weighted reasoning')}</p>
                        <p className="mt-3 text-sm leading-7 text-text-secondary">{result.decision_reason}</p>
                      </div>
                      {!fruitFailed && (
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Price impact')}</p>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{summarizeText(result.price_reason)}</p>
                          </div>
                          <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Market impact')}</p>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{summarizeText(result.market_insight)}</p>
                          </div>
                          <div className="rounded-2xl border border-border-soft bg-bg-cardHover/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Storage / hold guidance')}</p>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{result.hold_instructions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-border-soft bg-bg-cardHover/20 p-5">
                  <SectionHeader
                    eyebrow="Advanced Explainability"
                    title={tr('Developer and evaluator details')}
                    description={tr('Verbose traces and full model outputs are collapsed by default to keep the main experience clean.')}
                  />
                  <div className="space-y-3">
                    <AdvancedPanel title={tr('Stage explainability')}>
                      <ExplainabilityPanel bullets={result.stage_explanations} />
                    </AdvancedPanel>

                    <AdvancedPanel title={tr('Model context and feature metadata')}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4 text-sm text-text-secondary">
                          <div className="grid gap-2 md:grid-cols-2">
                            <p>{tr('State')}: {result.feature_context?.state ?? 'N/A'}</p>
                            <p>{tr('District')}: {result.feature_context?.district ?? 'N/A'}</p>
                            <p>{tr('Market')}: {result.feature_context?.market ?? 'N/A'}</p>
                            <p>{tr('Commodity')}: {result.feature_context?.commodity ?? 'N/A'}</p>
                            <p>{tr('Variety')}: {result.feature_context?.variety ?? 'N/A'}</p>
                            <p>{tr('Grade')}: {result.feature_context?.grade ?? 'N/A'}</p>
                          </div>
                          <p className="mt-3 text-xs text-text-muted">{tr('Web Query')}: {result.web_query ?? 'N/A'}</p>
                        </div>
                        <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4 text-sm text-text-secondary">
                          <p>{tr('Model')}: {result.ml_model_used ?? 'N/A'}</p>
                          <p className="mt-2">{tr('Price source')}: {result.price_source ?? 'N/A'}</p>
                          <p className="mt-2">{tr('Price probabilities')}: High {formatPercent(result.price_probabilities?.High ?? 0)} | Medium {formatPercent(result.price_probabilities?.Medium ?? 0)} | Low {formatPercent(result.price_probabilities?.Low ?? 0)}</p>
                          <p className="mt-2">{tr('Cluster distance')}: {result.cluster_distance ?? 'N/A'}</p>
                        </div>
                      </div>
                    </AdvancedPanel>

                    <AdvancedPanel title={tr('Raw reasoning and backend traces')}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Image + price reasoning')}</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{result.image_price_reason}</p>
                        </div>
                        <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{tr('Full analysis')}</p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{result.generated_analysis}</p>
                        </div>
                      </div>
                    </AdvancedPanel>
                  </div>
                </section>
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

      {false && result && (
        <ExplainabilityPanel
          bullets={result.stage_explanations}
        />
      )}

      {false && result && !fruitFailed && result.node_graph?.nodes?.length > 0 && (
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
