import { motion } from 'framer-motion'
import { Headphones, Mic, Play, Radio, Volume2, Waves } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { fetchVoiceChat, fetchVoiceHealth, fetchVoiceReply, fetchVoiceSynthesis } from '../services/api'
import { cn } from '../lib/utils'

const AUDIO_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]

function toAudioUrl(base64, mimeType) {
  if (!base64) return null
  return `data:${mimeType || 'audio/wav'};base64,${base64}`
}

function StatusPill({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'border-border-soft bg-bg-cardHover/30 text-text-secondary',
    success: 'border-green-500/40 bg-green-500/10 text-green-400',
    warning: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300',
    danger: 'border-red-500/40 bg-red-500/10 text-red-400',
  }[tone]

  return (
    <div className={cn('rounded-xl border px-3 py-2', toneClass)}>
      <p className="text-[11px] uppercase tracking-[0.08em]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

export default function VoiceAssistant() {
  const tr = useTranslate()
  const pageLoading = useAiLoading(700)
  const audioRef = useRef(null)

  const [serviceStatus, setServiceStatus] = useState('Checking...')
  const [serviceError, setServiceError] = useState(null)
  const [textInput, setTextInput] = useState('माझ्या कांद्याच्या पिकात पानं पिवळी पडत आहेत, काय करू?')
  const [audioFile, setAudioFile] = useState(null)
  const [audioName, setAudioName] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [replyResult, setReplyResult] = useState(null)
  const [voiceResult, setVoiceResult] = useState(null)
  const [ttsResult, setTtsResult] = useState(null)

  useEffect(() => {
    let active = true

    async function loadHealth() {
      try {
        const data = await fetchVoiceHealth()
        if (!active) return
        setServiceStatus(`Online - STT ${data.providers.stt} / LLM ${data.providers.llm} / TTS ${data.providers.tts}`)
        setServiceError(null)
      } catch (err) {
        if (!active) return
        setServiceStatus('Unavailable')
        setServiceError(err.message || 'Voice service is not reachable.')
      }
    }

    loadHealth()
    return () => {
      active = false
    }
  }, [])

  const replyAudioUrl = useMemo(
    () => toAudioUrl(ttsResult?.audio_base64, ttsResult?.audio_mime_type),
    [ttsResult],
  )

  const voiceAudioUrl = useMemo(
    () => toAudioUrl(voiceResult?.response_audio_base64, voiceResult?.response_audio_mime_type),
    [voiceResult],
  )

  const handleAudioFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!AUDIO_TYPES.includes(file.type)) {
      setError('Use WAV, MP3, WEBM, OGG, MP4, or M4A audio.')
      return
    }
    setError(null)
    setVoiceResult(null)
    setAudioFile(file)
    setAudioName(file.name)
  }

  const handleGenerateReply = async () => {
    if (!textInput.trim()) {
      setError('Enter the farmer question first.')
      return
    }

    setError(null)
    setReplyLoading(true)
    setReplyResult(null)
    try {
      const data = await fetchVoiceReply(textInput.trim())
      setReplyResult(data)
    } catch (err) {
      setError(err.message || 'Failed to generate Marathi reply.')
    } finally {
      setReplyLoading(false)
    }
  }

  const handleSynthesize = async () => {
    const sourceText = replyResult?.text || textInput.trim()
    if (!sourceText) {
      setError('Generate or enter Marathi text first.')
      return
    }

    setError(null)
    setTtsLoading(true)
    setTtsResult(null)
    try {
      const data = await fetchVoiceSynthesis(sourceText)
      setTtsResult(data)
    } catch (err) {
      setError(err.message || 'Failed to generate audio.')
    } finally {
      setTtsLoading(false)
    }
  }

  const handleVoiceChat = async () => {
    if (!audioFile) {
      setError('Upload a farmer audio file first.')
      return
    }

    setError(null)
    setVoiceLoading(true)
    setVoiceResult(null)
    try {
      const data = await fetchVoiceChat(audioFile)
      setVoiceResult(data)
    } catch (err) {
      setError(err.message || 'Voice pipeline failed.')
    } finally {
      setVoiceLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={pageLoading || replyLoading || ttsLoading || voiceLoading} />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Marathi-first speech pipeline for farmer support')}</CardDescription>
            <CardTitle>{tr('Voice Assistant')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <StatusPill
                label={tr('Voice Service')}
                value={serviceStatus}
                tone={serviceError ? 'danger' : 'success'}
              />
              <StatusPill label={tr('Primary Mode')} value={tr('Marathi replies')} tone="default" />
              <StatusPill label={tr('Input Support')} value={tr('Marathi + Hindi + mixed speech')} tone="warning" />
            </div>

            <div className="rounded-2xl border border-brand-neonCyan/25 bg-brand-neonCyan/10 p-4">
              <div className="flex items-start gap-3">
                <Radio className="mt-0.5 text-brand-neonCyan" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-primary">{tr('Farmer-safe response behavior')}</p>
                  <p className="text-sm leading-6 text-text-secondary">
                    {tr('Replies stay short, Marathi-first, and practical. Risky pesticide, medical, or legal certainty should be avoided and confirmed locally.')}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {serviceError && (
              <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
                <p className="text-sm text-yellow-300">{serviceError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="min-h-full">
            <CardHeader>
              <CardDescription>{tr('Text prompt to Marathi answer and speech')}</CardDescription>
              <CardTitle>{tr('Reply Studio')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Farmer Question')}</span>
                <textarea
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-border-soft bg-bg-cardHover px-4 py-3 text-sm leading-6 text-text-primary outline-none transition focus:border-brand-neonCyan"
                  placeholder="उदा. माझ्या टोमॅटोच्या पानांवर डाग आहेत, काय करावे?"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerateReply}
                  disabled={replyLoading}
                  className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {replyLoading ? tr('Generating...') : tr('Generate Marathi Reply')}
                </button>
                <button
                  type="button"
                  onClick={handleSynthesize}
                  disabled={ttsLoading}
                  className="h-11 rounded-xl border border-border-strong bg-bg-cardHover px-5 text-sm font-semibold text-text-primary transition hover:border-brand-neonCyan disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {ttsLoading ? tr('Synthesizing...') : tr('Generate Speech')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Headphones size={16} className="text-brand-neonCyan" />
                    <p className="text-sm font-semibold text-text-primary">{tr('LLM Reply')}</p>
                  </div>
                  {replyResult ? (
                    <div className="space-y-3">
                      <p className="text-sm leading-6 text-text-secondary">{replyResult.text}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                        <span>{tr('Provider')}: {replyResult.provider}</span>
                        <span>{tr('Model')}: {replyResult.model}</span>
                      </div>
                      {!!replyResult.warnings?.length && (
                        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2">
                          <p className="text-xs text-yellow-300">{replyResult.warnings.join(' ')}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">{tr('The Marathi response will appear here.')}</p>
                  )}
                </div>

                <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Volume2 size={16} className="text-green-400" />
                    <p className="text-sm font-semibold text-text-primary">{tr('Speech Output')}</p>
                  </div>
                  {ttsResult ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                        <span>{tr('Provider')}: {ttsResult.provider}</span>
                        <span>{tr('Model')}: {ttsResult.model}</span>
                      </div>
                      <audio ref={audioRef} controls src={replyAudioUrl} className="w-full" />
                      {!!ttsResult.warnings?.length && (
                        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-2">
                          <p className="text-xs text-yellow-300">{ttsResult.warnings.join(' ')}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">{tr('Generate Marathi speech to preview audio here.')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="min-h-full border-border-strong">
            <CardHeader>
              <CardDescription>{tr('Upload farmer audio for end-to-end STT, LLM, and TTS')}</CardDescription>
              <CardTitle>{tr('Voice Pipeline')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{tr('Farmer Audio')}</span>
                <label className="flex h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border-soft bg-bg-cardHover px-4 text-sm text-text-secondary transition hover:border-brand-neonCyan">
                  <Mic size={16} className="text-brand-neonCyan" />
                  <span className="truncate">{audioName || tr('Upload WAV, MP3, WEBM, OGG, MP4, or M4A')}</span>
                  <input
                    type="file"
                    accept={AUDIO_TYPES.join(',')}
                    onChange={handleAudioFile}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleVoiceChat}
                disabled={voiceLoading}
                className="h-11 rounded-xl bg-brand-gradient px-5 text-sm font-semibold text-text-primary shadow-card-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {voiceLoading ? tr('Running Voice Pipeline...') : tr('Process Voice Query')}
              </button>

              {voiceResult ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Waves size={16} className="text-brand-neonCyan" />
                      <p className="text-sm font-semibold text-text-primary">{tr('Transcription')}</p>
                    </div>
                    <p className="text-sm leading-6 text-text-secondary">{voiceResult.transcription}</p>
                  </div>

                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.08em] text-green-400">{tr('Marathi Response')}</p>
                    <p className="mt-2 text-sm leading-6 text-text-primary">{voiceResult.response_text}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatusPill label={tr('STT')} value={voiceResult.stt_provider} tone="default" />
                    <StatusPill label={tr('LLM')} value={`${voiceResult.llm_provider} / ${voiceResult.llm_model}`} tone="default" />
                    <StatusPill label={tr('TTS')} value={voiceResult.tts_provider} tone="default" />
                  </div>

                  <div className="rounded-xl border border-border-soft bg-bg-cardHover/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Play size={16} className="text-green-400" />
                      <p className="text-sm font-semibold text-text-primary">{tr('Returned Audio')}</p>
                    </div>
                    <audio controls src={voiceAudioUrl} className="w-full" />
                  </div>

                  {!!voiceResult.warnings?.length && (
                    <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3">
                      <p className="text-sm text-yellow-300">{voiceResult.warnings.join(' ')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border-soft bg-bg-cardHover/20">
                  <div className="space-y-2 text-center">
                    <Mic className="mx-auto text-text-muted/40" size={34} />
                    <p className="text-sm text-text-muted">{tr('Upload a farmer audio sample to test the full speech pipeline.')}</p>
                    <p className="text-xs text-text-muted">{tr('You will get transcription, Marathi response text, and playable response audio.')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  )
}
