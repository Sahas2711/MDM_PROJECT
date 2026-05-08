import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Mic, MicOff, Volume2, Waves } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import useTranslate from '../hooks/useTranslate'
import { fetchVoiceHealth } from '../services/api'
import { cn } from '../lib/utils'

const VOICE_BASE_URL = import.meta.env.VITE_VOICE_API_URL ?? 'http://localhost:8001'

function toAudioUrl(base64, mimeType) {
  if (!base64) return null
  return `data:${mimeType || 'audio/wav'};base64,${base64}`
}

const PHASES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
}

const PHASE_LABEL = {
  idle: 'Ready',
  recording: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
}

export default function VoiceAssistant() {
  const tr = useTranslate()
  const [phase, setPhase] = useState(PHASES.IDLE)
  const [serviceOnline, setServiceOnline] = useState(null)
  const [providers, setProviders] = useState(null)
  const [error, setError] = useState(null)
  const [turns, setTurns] = useState([])

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const audioRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    fetchVoiceHealth()
      .then((d) => {
        setServiceOnline(true)
        setProviders(d.providers)
      })
      .catch(() => setServiceOnline(false))
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start()
      mediaRecorderRef.current = mr
      setPhase(PHASES.RECORDING)
    } catch {
      setError('Microphone access denied. Please allow microphone permission.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') return

    mr.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await sendAudio(blob)
    }
    mr.stop()
    setPhase(PHASES.PROCESSING)
  }, [])

  async function sendAudio(blob) {
    setPhase(PHASES.PROCESSING)
    const form = new FormData()
    form.append('file', blob, 'recording.webm')

    try {
      const res = await fetch(`${VOICE_BASE_URL}/voice-chat`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()

      setTurns((prev) => [
        ...prev,
        {
          id: Date.now(),
          transcription: data.transcription,
          response: data.response_text,
          audioUrl: toAudioUrl(data.response_audio_base64, data.response_audio_mime_type),
          llm: data.llm_model,
          warnings: data.warnings,
        },
      ])

      const audioUrl = toAudioUrl(data.response_audio_base64, data.response_audio_mime_type)
      if (audioUrl && audioRef.current) {
        setPhase(PHASES.SPEAKING)
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => setPhase(PHASES.IDLE)
        audioRef.current.onerror = () => setPhase(PHASES.IDLE)
        audioRef.current.play().catch(() => setPhase(PHASES.IDLE))
      } else {
        setPhase(PHASES.IDLE)
      }
    } catch (err) {
      setError(err.message || 'Voice pipeline failed.')
      setPhase(PHASES.IDLE)
    }
  }

  const handleMicToggle = () => {
    if (phase === PHASES.IDLE) startRecording()
    else if (phase === PHASES.RECORDING) stopRecording()
  }

  const isActive = phase !== PHASES.IDLE
  const canPress = phase === PHASES.IDLE || phase === PHASES.RECORDING

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <CardHeader>
            <CardDescription>{tr('Multilingual live voice-to-voice farming assistant')}</CardDescription>
            <CardTitle>{tr('Voice Assistant')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Service', value: serviceOnline === null ? 'Checking...' : serviceOnline ? 'Online' : 'Offline', tone: serviceOnline ? 'success' : serviceOnline === false ? 'danger' : 'default' },
                { label: 'STT', value: providers?.stt ?? '—' },
                { label: 'LLM', value: providers?.llm ?? '—' },
                { label: 'TTS', value: providers?.tts ?? '—' },
              ].map(({ label, value, tone = 'default' }) => (
                <div key={label} className={cn('rounded-xl border px-3 py-2 text-sm', {
                  'border-border-soft bg-bg-cardHover/30 text-text-secondary': tone === 'default',
                  'border-green-500/40 bg-green-500/10 text-green-400': tone === 'success',
                  'border-red-500/40 bg-red-500/10 text-red-400': tone === 'danger',
                })}>
                  <span className="text-[11px] uppercase tracking-widest opacity-60">{label} </span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Mic panel */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}>
          <Card className="flex min-h-[480px] flex-col items-center justify-center">
            <CardContent className="flex flex-col items-center gap-8 py-10">
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-[0.1em] text-text-muted">{tr('Status')}</p>
                <p className={cn('text-lg font-semibold transition-colors', {
                  'text-text-muted': phase === PHASES.IDLE,
                  'text-red-400': phase === PHASES.RECORDING,
                  'text-brand-neonCyan': phase === PHASES.PROCESSING,
                  'text-green-400': phase === PHASES.SPEAKING,
                })}>
                  {tr(PHASE_LABEL[phase])}
                </p>
              </div>

              {/* Mic button */}
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={!canPress || serviceOnline === false}
                className={cn(
                  'relative flex h-28 w-28 items-center justify-center rounded-full transition-all duration-200 shadow-lg',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  phase === PHASES.RECORDING
                    ? 'bg-red-500 hover:bg-red-600 scale-110'
                    : 'bg-brand-gradient hover:brightness-110',
                )}
              >
                {/* Pulse ring when recording */}
                {phase === PHASES.RECORDING && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
                )}
                {phase === PHASES.RECORDING
                  ? <MicOff size={36} className="text-white" />
                  : <Mic size={36} className="text-white" />
                }
              </button>

              <p className="text-sm text-text-muted text-center max-w-[200px]">
                {phase === PHASES.IDLE && tr('Tap to start speaking')}
                {phase === PHASES.RECORDING && tr('Tap again to stop')}
                {phase === PHASES.PROCESSING && tr('Processing your voice...')}
                {phase === PHASES.SPEAKING && tr('Playing response...')}
              </p>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center max-w-xs">
                  {error}
                </div>
              )}

              <audio ref={audioRef} className="hidden" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversation log */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
          <Card className="min-h-[480px]">
            <CardHeader>
              <CardDescription>{tr('Live conversation history')}</CardDescription>
              <CardTitle>{tr('Conversation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto pr-1">
                {turns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 text-center">
                    <Waves size={36} className="text-text-muted/30" />
                    <p className="text-sm text-text-muted">{tr('Your conversation will appear here.')}</p>
                    <p className="text-xs text-text-muted">{tr('Speak in any language — Marathi, Hindi, or English.')}</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {turns.map((turn) => (
                      <motion.div
                        key={turn.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className="space-y-2"
                      >
                        {/* User */}
                        <div className="ml-auto max-w-[85%] rounded-3xl rounded-br-md bg-bg-elevated border border-border-soft px-4 py-3">
                          <p className="text-[11px] uppercase tracking-widest text-text-muted mb-1">You</p>
                          <p className="text-sm text-text-primary">{turn.transcription}</p>
                        </div>

                        {/* Assistant */}
                        <div className="mr-auto max-w-[85%] rounded-3xl rounded-bl-md bg-brand-neonCyan/10 border border-brand-neonCyan/20 px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot size={12} className="text-brand-neonCyan" />
                            <p className="text-[11px] uppercase tracking-widest text-brand-neonCyan">Assistant</p>
                          </div>
                          <p className="text-sm text-text-primary">{turn.response}</p>
                          {turn.audioUrl && (
                            <div className="mt-2 flex items-center gap-2">
                              <Volume2 size={13} className="text-green-400" />
                              <audio controls src={turn.audioUrl} className="h-8 w-full" />
                            </div>
                          )}
                          {!!turn.warnings?.length && (
                            <p className="mt-1 text-xs text-yellow-400">{turn.warnings.join(' ')}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
