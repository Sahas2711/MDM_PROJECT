from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Farmer Voice Assistant API"
    app_version: str = "0.1.0"
    log_level: str = "INFO"

    request_timeout_seconds: float = 45.0
    max_audio_size_bytes: int = 15 * 1024 * 1024
    audio_storage_format: str = "wav"
    default_response_audio_format: str = "wav"

    stt_provider: str = "groq"
    stt_fallback_provider: str = "openai_compatible"
    stt_model: str = "whisper-large-v3"
    groq_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    stt_openai_compatible_api_key: str | None = None
    stt_openai_compatible_base_url: str | None = None
    stt_openai_compatible_model: str | None = None

    llm_provider: str = "openrouter"
    llm_fallback_provider: str = "openai_compatible"
    llm_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 320
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_referer: str | None = None
    openrouter_title: str = "Farmer Voice Assistant"

    openai_compatible_api_key: str | None = None
    openai_compatible_base_url: str | None = None
    openai_compatible_model: str | None = None

    tts_provider: str = "huggingface"
    tts_fallback_provider: str = "http"
    huggingface_api_key: str | None = None
    huggingface_tts_model: str = "facebook/mms-tts-mar"
    huggingface_base_url: str = "https://api-inference.huggingface.co/models"
    fallback_tts_url: str | None = None
    fallback_tts_api_key: str | None = None
    fallback_tts_voice: str | None = None

    assistant_scope: str = "Maharashtra agriculture support"
    allowed_audio_content_types: set[str] = Field(
        default_factory=lambda: {
            "audio/wav",
            "audio/x-wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/webm",
            "audio/ogg",
            "audio/mp4",
            "audio/x-m4a",
        }
    )


settings = Settings()
