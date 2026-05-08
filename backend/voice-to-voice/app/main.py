import base64
import time
import uuid

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.errors import VoiceAssistantError
from app.logger import get_logger
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ErrorResponse,
    HealthResponse,
    ProviderStatusResponse,
    SynthesisRequest,
    SynthesisResponse,
    TranscriptionResponse,
    VoiceChatResponse,
)
from app.services.orchestrator import VoiceAssistantOrchestrator
from app.utils.audio import safe_audio_filename, validate_audio_input, validate_audio_upload

log = get_logger(__name__)
orchestrator = VoiceAssistantOrchestrator()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Voice-to-voice farmer assistant with Marathi-first responses.",
)

# CORS must be added last so it wraps everything (add_middleware stacks in reverse)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    t0 = time.perf_counter()
    log.info("Request started", extra={"request_id": request_id, "method": request.method, "path": request.url.path})
    response = await call_next(request)
    elapsed = round((time.perf_counter() - t0) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(elapsed)
    log.info("Request finished", extra={"request_id": request_id, "status_code": response.status_code, "duration_ms": elapsed})
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.exception_handler(VoiceAssistantError)
async def voice_assistant_exception_handler(_: Request, exc: VoiceAssistantError):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(detail=exc.message, code=exc.code).model_dump(),
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(_: Request, exc: Exception):
    log.exception("Unhandled error in voice assistant")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(detail="Internal server error.", code="internal_error").model_dump(),
    )


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        providers={
            "stt": settings.stt_provider,
            "llm": settings.llm_provider,
            "tts": settings.tts_provider,
        },
    )


@app.get("/providers/{stage}", response_model=ProviderStatusResponse)
async def provider_status(stage: str) -> ProviderStatusResponse:
    provider_map = {
        "stt": (settings.stt_provider, settings.stt_fallback_provider),
        "llm": (settings.llm_provider, settings.llm_fallback_provider),
        "tts": (settings.tts_provider, settings.tts_fallback_provider),
    }
    if stage not in provider_map:
        raise HTTPException(status_code=404, detail="Unknown provider stage.")
    active, fallback = provider_map[stage]
    return ProviderStatusResponse(stage=stage, active_provider=active, fallback_provider=fallback)


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(..., description="Farmer audio file")) -> TranscriptionResponse:
    audio_bytes = await file.read()
    validate_audio_upload(file, audio_bytes)
    filename = safe_audio_filename(file)
    text, provider, warnings = await orchestrator.transcribe(audio_bytes, filename, file.content_type or "audio/wav")
    return TranscriptionResponse(text=text, provider=provider, warnings=warnings)


@app.post("/generate", response_model=ChatResponse)
async def generate_reply(payload: ChatRequest) -> ChatResponse:
    reply, provider, model, warnings = await orchestrator.generate_reply(payload.text.strip())
    return ChatResponse(text=reply, provider=provider, model=model, warnings=warnings)


@app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_speech(payload: SynthesisRequest) -> SynthesisResponse:
    audio_bytes, audio_mime_type, provider, model, warnings = await orchestrator.synthesize(payload.text.strip())
    return SynthesisResponse(
        audio_base64=base64.b64encode(audio_bytes).decode("utf-8"),
        audio_mime_type=audio_mime_type,
        provider=provider,
        model=model,
        warnings=warnings,
    )


@app.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat(file: UploadFile = File(..., description="Farmer audio file")) -> VoiceChatResponse:
    audio_bytes = await file.read()
    validate_audio_upload(file, audio_bytes)
    filename = safe_audio_filename(file)
    result = await orchestrator.voice_chat(audio_bytes, filename, file.content_type or "audio/wav")
    return VoiceChatResponse(**result.__dict__)


@app.websocket("/ws/voice-chat")
async def voice_chat_websocket(websocket: WebSocket):
    await websocket.accept()
    chunks = bytearray()
    content_type = "audio/wav"
    filename = f"stream-input.{settings.audio_storage_format}"

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"] is not None:
                chunks.extend(message["bytes"])
                continue

            if "text" in message and message["text"]:
                text = message["text"].strip()
                if text.upper() == "EOF":
                    break
                if text.startswith("content-type:"):
                    content_type = text.split(":", 1)[1].strip() or content_type
                    continue
                if text.startswith("filename:"):
                    filename = text.split(":", 1)[1].strip() or filename
                    continue
    except WebSocketDisconnect:
        log.info("WebSocket disconnected before completion")
        return

    try:
        audio_bytes = bytes(chunks)
        validate_audio_input(content_type, audio_bytes)
        result = await orchestrator.voice_chat(audio_bytes, filename, content_type)
        await websocket.send_json(VoiceChatResponse(**result.__dict__).model_dump())
    except VoiceAssistantError as exc:
        await websocket.send_json(ErrorResponse(detail=exc.message, code=exc.code).model_dump())
    finally:
        await websocket.close()
