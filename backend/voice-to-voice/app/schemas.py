from typing import Literal

from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    providers: dict[str, str]


class TranscriptionResponse(BaseModel):
    text: str
    language_hint: str = "mr"
    provider: str
    warnings: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Farmer question in Marathi, Hindi, or mixed speech text")
    session_id: str | None = None

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text must not be blank.")
        return value


class ChatResponse(BaseModel):
    text: str
    provider: str
    model: str
    warnings: list[str] = Field(default_factory=list)


class SynthesisRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Marathi response to synthesize")

    @field_validator("text")
    @classmethod
    def synthesis_text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text must not be blank.")
        return value


class SynthesisResponse(BaseModel):
    audio_base64: str
    audio_mime_type: str
    provider: str
    model: str
    warnings: list[str] = Field(default_factory=list)


class VoiceChatResponse(BaseModel):
    transcription: str
    response_text: str
    response_audio_base64: str
    response_audio_mime_type: str
    stt_provider: str
    llm_provider: str
    tts_provider: str
    llm_model: str
    warnings: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    detail: str
    code: str


class ProviderStatusResponse(BaseModel):
    stage: Literal["stt", "llm", "tts"]
    active_provider: str
    fallback_provider: str | None = None
