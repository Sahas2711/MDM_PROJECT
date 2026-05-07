# Voice-to-Voice Farmer Assistant

This backend provides a Marathi-first farmer support pipeline for Maharashtra. It accepts farmer audio in Marathi or mixed Marathi/Hindi, transcribes it, generates a short agriculture-oriented Marathi reply, converts the reply to speech, and returns both text and audio.

## Current Backend Structure

```text
backend/voice-to-voice/
  app/
    config.py
    errors.py
    logger.py
    main.py
    prompts.py
    schemas.py
    providers/
      base.py
      stt.py
      llm.py
      tts.py
    services/
      orchestrator.py
    utils/
      audio.py
  .env.example
  requirements.txt
  README.md
```

## Architecture

Pipeline:

1. `POST /voice-chat` or `WS /ws/voice-chat` receives audio.
2. STT provider transcribes mixed Marathi/Hindi speech.
3. LLM provider generates a concise Marathi answer.
4. TTS provider synthesizes Marathi speech.
5. API returns transcription, Marathi reply text, provider metadata, warnings, and base64 audio.

Modules:

- `app/providers/stt.py`: Groq Whisper primary, OpenAI-compatible STT fallback.
- `app/providers/llm.py`: OpenRouter primary, OpenAI-compatible LLM fallback.
- `app/providers/tts.py`: Hugging Face Marathi TTS primary, generic HTTP TTS fallback.
- `app/services/orchestrator.py`: stage orchestration, fallback routing, warnings.
- `app/prompts.py`: Marathi-first farmer assistant system prompt.

## Why These Providers

### STT: Groq Whisper

Why:

- Good multilingual transcription quality.
- Works well for Marathi + Hindi + English farm terms.
- Simple API and fast hosted inference.

Free-tier limitations:

- Rate limits can be hit during repeated testing.
- Accent, background noise, and low-quality recordings still reduce accuracy.

Fallback:

- OpenAI-compatible STT endpoint if you have another hosted Whisper-style provider.

### LLM: OpenRouter Free Open-Source Model

Recommended default:

- `meta-llama/llama-3.3-70b-instruct:free`

Why:

- Open-source model family.
- Easy free API-key access.
- Simple model swapping through `.env`.

Free-tier limitations:

- Free models may queue, rotate, or rate limit.
- Marathi quality is decent but not perfect.

Fallback:

- Any OpenAI-compatible hosted open-source chat endpoint.

### TTS: Hugging Face Hosted Marathi TTS

Recommended default:

- `facebook/mms-tts-mar`

Why:

- Marathi-capable open-source model.
- No need to host a TTS stack locally.
- Fits a low-cost prototype.

Free-tier limitations:

- Basic voice quality.
- Cold starts and quota limits are common.
- Some hosted models return audio slowly.

Fallback:

- Generic HTTP TTS endpoint, so you can later plug in a self-hosted or alternate Marathi TTS provider without changing API routes.

## Production Replacements Later

- Replace free OpenRouter models with a dedicated hosted open-source endpoint.
- Replace hosted Hugging Face TTS with a more stable Marathi TTS service or self-hosted voice model.
- Add conversation memory only if the product actually needs it.
- Add retries with backoff, metrics, and circuit breaking.
- Move from chunk-upload WebSocket to true low-latency streaming STT/TTS.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
APP_NAME=Farmer Voice Assistant API
APP_VERSION=0.1.0
LOG_LEVEL=INFO

REQUEST_TIMEOUT_SECONDS=45
MAX_AUDIO_SIZE_BYTES=15728640

STT_PROVIDER=groq
STT_FALLBACK_PROVIDER=openai_compatible
STT_MODEL=whisper-large-v3
GROQ_API_KEY=
GROQ_BASE_URL=https://api.groq.com/openai/v1
STT_OPENAI_COMPATIBLE_API_KEY=
STT_OPENAI_COMPATIBLE_BASE_URL=
STT_OPENAI_COMPATIBLE_MODEL=

LLM_PROVIDER=openrouter
LLM_FALLBACK_PROVIDER=openai_compatible
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=320
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_REFERER=http://localhost:8001
OPENROUTER_TITLE=Farmer Voice Assistant
OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_MODEL=

TTS_PROVIDER=huggingface
TTS_FALLBACK_PROVIDER=http
HUGGINGFACE_API_KEY=
HUGGINGFACE_TTS_MODEL=facebook/mms-tts-mar
HUGGINGFACE_BASE_URL=https://api-inference.huggingface.co/models
FALLBACK_TTS_URL=
FALLBACK_TTS_API_KEY=
FALLBACK_TTS_VOICE=
```

Minimum keys for the default path:

- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `HUGGINGFACE_API_KEY`

## Behavior Rules Implemented

- Farmer-facing replies are Marathi-first.
- Mixed Marathi/Hindi/English agriculture speech is expected.
- Answers are short and practical by prompt design.
- Unclear input should trigger one short Marathi follow-up question.
- Risky advice must avoid false certainty.
- Pesticide dosage, medical treatment, and legal guarantees must not be invented.

## API Endpoints

### `GET /health`

Response:

```json
{
  "status": "ok",
  "app_name": "Farmer Voice Assistant API",
  "version": "0.1.0",
  "providers": {
    "stt": "groq",
    "llm": "openrouter",
    "tts": "huggingface"
  }
}
```

### `GET /providers/{stage}`

Example:

`GET /providers/stt`

Response:

```json
{
  "stage": "stt",
  "active_provider": "groq",
  "fallback_provider": "openai_compatible"
}
```

### `POST /transcribe`

Multipart form:

- field: `file`

Response:

```json
{
  "text": "माझ्या कांद्याच्या पिकात पानं पिवळी पडत आहेत, काय करू?",
  "language_hint": "mr",
  "provider": "groq",
  "warnings": []
}
```

### `POST /generate`

Request:

```json
{
  "text": "माझ्या कांद्याच्या पिकात पानं पिवळी पडत आहेत, काय करू?"
}
```

Response:

```json
{
  "text": "पहिले पानांवर डाग, किडीची चिन्हे आणि पाण्याचा ताण आहे का ते पाहा. खात्री नसेल तर जवळच्या कृषी केंद्रात नमुना दाखवा. औषध फवारणीपूर्वी स्थानिक कृषी अधिकाऱ्यांचा सल्ला घ्या.",
  "provider": "openrouter",
  "model": "meta-llama/llama-3.3-70b-instruct:free",
  "warnings": []
}
```

### `POST /synthesize`

Request:

```json
{
  "text": "उद्या पाऊस असेल तर आज हलके पाणी द्या."
}
```

Response:

```json
{
  "audio_base64": "<base64-audio>",
  "audio_mime_type": "audio/wav",
  "provider": "huggingface",
  "model": "facebook/mms-tts-mar",
  "warnings": []
}
```

### `POST /voice-chat`

Multipart form:

- field: `file`

Response:

```json
{
  "transcription": "गहूला आता पाणी द्यायचं का?",
  "response_text": "माती कोरडी असेल तर हलके पाणी द्या. पण तुमच्या भागात पाऊस अपेक्षित असेल तर थोडे थांबा. खात्रीसाठी स्थानिक हवामान आणि कृषी सल्ला पाहा.",
  "response_audio_base64": "<base64-audio>",
  "response_audio_mime_type": "audio/wav",
  "stt_provider": "groq",
  "llm_provider": "openrouter",
  "tts_provider": "huggingface",
  "llm_model": "meta-llama/llama-3.3-70b-instruct:free",
  "warnings": []
}
```

### `WS /ws/voice-chat`

Protocol:

- Send binary audio chunks.
- Optional text frame: `content-type:audio/webm`
- Optional text frame: `filename:farmer-query.webm`
- Final text frame: `EOF`

Server response:

- Same JSON shape as `POST /voice-chat`
- On handled errors, a JSON error object with `detail` and `code`

## Error Handling

Handled cases:

- Missing API keys
- Unsupported audio format
- Empty audio upload
- Empty transcription
- Provider failure
- Timeout
- Rate limit

Example error:

```json
{
  "detail": "Unsupported audio format 'application/octet-stream'.",
  "code": "unsupported_audio_format"
}
```

## Local Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env`.
4. Fill the provider keys.
5. Run the API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Local Testing With Marathi Audio

Health check:

```bash
curl http://localhost:8001/health
```

Transcription:

```bash
curl -X POST "http://localhost:8001/transcribe" ^
  -H "accept: application/json" ^
  -F "file=@sample-marathi-audio.wav;type=audio/wav"
```

Text generation:

```bash
curl -X POST "http://localhost:8001/generate" ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"माझ्या टोमॅटोच्या पानांवर डाग आहेत, काय करावे?\"}"
```

End-to-end voice chat:

```bash
curl -X POST "http://localhost:8001/voice-chat" ^
  -H "accept: application/json" ^
  -F "file=@sample-marathi-audio.wav;type=audio/wav"
```

Recommended sample Marathi prompts:

- `माझ्या टोमॅटोच्या पानांवर डाग आहेत, काय करावे?`
- `उद्या पाऊस असेल तर कापसाला पाणी द्यायचे का?`
- `कांद्याला आता खत द्यायची वेळ आहे का?`
- `पिकात किड दिसते आहे, आधी काय तपासू?`

## Notes

- The API returns both text and audio for frontend use.
- Provider selection is environment-driven and swappable.
- The WebSocket route currently supports chunk upload, not true live streaming transcription.
