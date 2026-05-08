import { motion, AnimatePresence } from 'framer-motion'
import { Bot, CornerDownLeft, LoaderCircle, MessageSquareText, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import useTranslate from '../hooks/useTranslate'
import {
  fetchVoiceHealth,
  fetchVoiceReply,
  fetchSmartDecision,
  fetchPrediction,
  fetchPredictImage,
  fetchModelMetrics,
} from '../services/api'
import { cn } from '../lib/utils'

// ── Intent detection ──────────────────────────────────────────────────────────
const INTENTS = [
  {
    id: 'smart_decision',
    label: 'Smart Crop Decision',
    route: '/smart-decision',
    keywords: ['predict fruit price', 'fruit price', 'analyze crop', 'crop decision', 'sell or hold', 'should i sell', 'crop image', 'freshness', 'smart decision', 'upload image', 'crop quality price'],
    description: 'Upload a crop image → get freshness + price + sell/hold decision',
    icon: '🌾',
    requiresImage: true,
  },
  {
    id: 'price_predict',
    label: 'Price Prediction',
    route: '/sell-timing',
    keywords: ['predict price', 'price prediction', 'min price', 'max price', 'sell timing', 'price range', 'crop price', 'market price', 'price category'],
    description: 'Enter min/max price → get SELL/HOLD recommendation',
    icon: '💰',
    requiresPrice: true,
  },
  {
    id: 'model_performance',
    label: 'Model Performance',
    route: '/model-performance',
    keywords: ['model accuracy', 'model performance', 'which model', 'best model', 'random forest', 'ann accuracy', 'dnn accuracy', 'benchmark'],
    description: 'View model accuracy benchmarks',
    icon: '📊',
    action: 'fetch_metrics',
  },
  {
    id: 'market_intelligence',
    label: 'Market Intelligence',
    route: '/market-intelligence',
    keywords: ['market cluster', 'market intelligence', 'cluster analysis', 'market segment', 'price cluster'],
    description: 'Explore market clustering and price patterns',
    icon: '🔵',
  },
  {
    id: 'crop_recommendation',
    label: 'Crop Recommendation',
    route: '/crop-recommendation',
    keywords: ['recommend crop', 'which crop', 'crop recommendation', 'what to grow', 'best crop', 'season crop'],
    description: 'Get crop recommendations based on season and soil',
    icon: '🌱',
  },
]

function detectIntent(text) {
  const lower = text.toLowerCase()
  for (const intent of INTENTS) {
    if (intent.keywords.some(kw => lower.includes(kw))) return intent
  }
  return null
}

function extractPrices(text) {
  const nums = [...text.matchAll(/\d[\d,]*/g)].map(m => parseFloat(m[0].replace(/,/g, '')))
  if (nums.length >= 2) return { min: Math.min(...nums), max: Math.max(...nums) }
  if (nums.length === 1) return { min: nums[0] * 0.8, max: nums[0] * 1.2 }
  return null
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { text: 'Predict fruit price from image', intent: 'smart_decision' },
  { text: 'Price prediction for min 1200 max 1800', intent: 'price_predict' },
  { text: 'Which model has the best accuracy?', intent: 'model_performance' },
  { text: 'What is the best time to sell onions?', intent: null },
  { text: 'Show me market clusters', intent: 'market_intelligence' },
  { text: 'Recommend a crop for this season', intent: 'crop_recommendation' },
]

// ── Inline result renderers ───────────────────────────────────────────────────
function PriceResult({ data }) {
  const tone = data.recommendation === 'SELL' ? 'text-green-400' : 'text-yellow-300'
  return (
    <div className="mt-3 rounded-2xl border border-border-soft bg-bg-cardHover/40 p-4 space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={cn('text-lg font-bold', tone)}>{data.recommendation}</span>
        <span className="text-text-muted text-xs">· {data.prediction_label} price class</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
        <span>Model: <span className="text-text-secondary">{data.model_used}</span></span>
        <span>Confidence: <span className="text-brand-neonCyan font-semibold">{(data.confidence * 100).toFixed(1)}%</span></span>
        <span>P(High): <span className="text-green-400">{((data.probabilities?.High ?? 0) * 100).toFixed(0)}%</span></span>
        <span>P(Low): <span className="text-red-400">{((data.probabilities?.Low ?? 0) * 100).toFixed(0)}%</span></span>
      </div>
      <p className="text-xs text-text-muted">{data.market_insight}</p>
    </div>
  )
}

function MetricsResult({ data }) {
  return (
    <div className="mt-3 rounded-2xl border border-border-soft bg-bg-cardHover/40 p-4 space-y-2">
      {(data.metrics || []).map(m => (
        <div key={m.model} className="flex items-center justify-between text-sm">
          <span className="text-text-secondary capitalize">{m.model.replace(/_/g, ' ')}</span>
          <span className="font-mono font-semibold text-brand-neonCyan">
            {m.cv_accuracy_mean != null ? `${(m.cv_accuracy_mean * 100).toFixed(2)}%` : m.macro_f1 != null ? `F1 ${(m.macro_f1 * 100).toFixed(2)}%` : 'N/A'}
          </span>
        </div>
      ))}
    </div>
  )
}

function RouteCard({ intent, onNavigate }) {
  return (
    <div className="mt-3 rounded-2xl border border-brand-neonCyan/20 bg-brand-neonCyan/5 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{intent.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{intent.label}</p>
          <p className="text-xs text-text-muted">{intent.description}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(intent.route)}
          className="shrink-0 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
        >
          Open →
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatAssistant() {
  const tr = useTranslate()
  const navigate = useNavigate()
  const bottomRef = useRef(null)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask me anything about crops, prices, or market timing. I can also run live predictions — try "predict fruit price from image" or "price prediction for min 1200 max 1800".',
      agentResult: null,
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [providerMeta, setProviderMeta] = useState({ provider: 'Checking...', model: 'Checking...' })

  useEffect(() => {
    fetchVoiceHealth()
      .then(d => setProviderMeta({ provider: d.providers?.llm || 'Configured', model: 'Live backend' }))
      .catch(() => setProviderMeta({ provider: 'Unavailable', model: 'Backend offline' }))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

  const addMessage = (msg) => setMessages(prev => [...prev, msg])

  const handleSend = async () => {
    const prompt = input.trim()
    if (!prompt) return

    addMessage({ role: 'user', text: prompt, agentResult: null })
    setInput('')
    setError(null)
    setLoading(true)

    const intent = detectIntent(prompt)

    try {
      // ── Agentic routing ──────────────────────────────────────────────────
      if (intent?.id === 'price_predict') {
        const prices = extractPrices(prompt)
        if (prices) {
          const data = await fetchPrediction(prices.min, prices.max)
          addMessage({
            role: 'assistant',
            text: `I ran a live price prediction for INR ${prices.min.toLocaleString()} – ${prices.max.toLocaleString()}.`,
            agentResult: { type: 'price', data },
          })
        } else {
          addMessage({
            role: 'assistant',
            text: 'I detected a price prediction intent but couldn\'t extract price values. Please include numbers like "min 1200 max 1800".',
            agentResult: { type: 'route', intent },
          })
        }
        return
      }

      if (intent?.id === 'model_performance' && intent.action === 'fetch_metrics') {
        const data = await fetchModelMetrics()
        addMessage({
          role: 'assistant',
          text: 'Here are the live model accuracy metrics from the backend:',
          agentResult: { type: 'metrics', data },
        })
        return
      }

      if (intent) {
        // Route-based intents — show a navigation card + LLM context
        const llmData = await fetchVoiceReply(prompt).catch(() => null)
        addMessage({
          role: 'assistant',
          text: llmData?.text || `This looks like a "${intent.label}" request. You can open the dedicated page below.`,
          agentResult: { type: 'route', intent },
        })
        if (llmData) setProviderMeta({ provider: llmData.provider || 'Configured', model: llmData.model || 'Live backend' })
        return
      }

      // ── General LLM fallback ─────────────────────────────────────────────
      const data = await fetchVoiceReply(prompt)
      addMessage({ role: 'assistant', text: data.text, agentResult: null })
      setProviderMeta({ provider: data.provider || 'Configured', model: data.model || 'Live backend' })
    } catch (err) {
      setError(err.message || 'Failed to get a response.')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('Agentic farming assistant — detects intent and routes to live APIs automatically')}</CardDescription>
            <CardTitle>{tr('Chat Assistant')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: 'LLM Provider', value: providerMeta.provider },
                { label: 'Model', value: providerMeta.model },
                { label: 'Mode', value: 'Agentic routing' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-border-soft bg-bg-cardHover/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Suggestions */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.03 }}>
          <Card className="min-h-full">
            <CardHeader>
              <CardDescription>{tr('Click to prefill — some trigger live API calls')}</CardDescription>
              <CardTitle>{tr('Quick Actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => setInput(s.text)}
                  className="w-full rounded-2xl border border-border-soft bg-bg-cardHover/50 p-3 text-left text-sm leading-6 text-text-secondary transition hover:border-brand-neonCyan/40 hover:bg-bg-elevated hover:text-text-primary"
                >
                  <span className="mr-2 text-base">
                    {INTENTS.find(i => i.id === s.intent)?.icon ?? '💬'}
                  </span>
                  {s.text}
                </button>
              ))}

              <div className="mt-4 rounded-2xl border border-brand-neonCyan/20 bg-brand-neonCyan/5 p-4">
                <div className="flex items-start gap-2">
                  <Zap size={15} className="mt-0.5 shrink-0 text-brand-neonCyan" />
                  <p className="text-xs leading-5 text-text-muted">
                    Detected intents trigger live API calls — price prediction, model metrics, and smart decision routing happen automatically without leaving this page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Conversation */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
          <Card className="min-h-full">
            <CardHeader>
              <CardDescription>{tr('Intent-aware conversation with live API routing')}</CardDescription>
              <CardTitle>{tr('Conversation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border-soft bg-bg-cardHover/35 p-4 max-h-[520px]">
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn('max-w-[90%]', msg.role === 'user' ? 'ml-auto' : 'mr-auto')}
                    >
                      <div className={cn(
                        'rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm',
                        msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai text-text-secondary',
                      )}>
                        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
                          {msg.role === 'user' ? <MessageSquareText size={12} /> : <Bot size={12} />}
                          <span>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
                          {msg.agentResult?.type === 'price' && (
                            <span className="rounded-full border border-brand-neonCyan/30 bg-brand-neonCyan/10 px-2 py-0.5 text-[9px] text-brand-neonCyan normal-case tracking-normal">
                              ⚡ Live API
                            </span>
                          )}
                          {msg.agentResult?.type === 'metrics' && (
                            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] text-green-400 normal-case tracking-normal">
                              📊 Live Metrics
                            </span>
                          )}
                          {msg.agentResult?.type === 'route' && (
                            <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] text-yellow-300 normal-case tracking-normal">
                              🔀 Routed
                            </span>
                          )}
                        </div>
                        <p>{msg.text}</p>
                      </div>

                      {/* Inline agentic results */}
                      {msg.agentResult?.type === 'price' && <PriceResult data={msg.agentResult.data} />}
                      {msg.agentResult?.type === 'metrics' && <MetricsResult data={msg.agentResult.data} />}
                      {msg.agentResult?.type === 'route' && (
                        <RouteCard intent={msg.agentResult.intent} onNavigate={navigate} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {loading && (
                  <div className="chat-bubble-ai mr-auto flex max-w-[85%] items-center gap-2 rounded-3xl px-4 py-3 text-sm text-text-secondary">
                    <LoaderCircle size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="rounded-2xl border border-border-soft bg-bg-elevated p-3">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  rows={3}
                  className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted"
                  placeholder="Ask about prices, crop care, market timing, or say 'predict fruit price'..."
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-muted">Enter to send · Shift+Enter for new line</p>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CornerDownLeft size={14} />
                    {tr('Send')}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  )
}
