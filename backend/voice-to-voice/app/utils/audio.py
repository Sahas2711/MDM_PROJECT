from pathlib import Path

from fastapi import UploadFile

from app.config import settings
from app.errors import VoiceAssistantError


def validate_audio_input(content_type: str | None, audio_bytes: bytes) -> None:
    normalized_content_type = content_type or "audio/wav"
    if normalized_content_type not in settings.allowed_audio_content_types:
        raise VoiceAssistantError(
            message=f"Unsupported audio format '{normalized_content_type}'.",
            code="unsupported_audio_format",
            status_code=415,
        )
    if not audio_bytes:
        raise VoiceAssistantError(
            message="Uploaded audio is empty.",
            code="empty_audio",
            status_code=422,
        )
    if len(audio_bytes) > settings.max_audio_size_bytes:
        raise VoiceAssistantError(
            message=f"Audio exceeds {settings.max_audio_size_bytes // (1024 * 1024)} MB limit.",
            code="audio_too_large",
            status_code=413,
        )


def validate_audio_upload(file, audio_bytes: bytes) -> None:
    validate_audio_input(getattr(file, "content_type", None), audio_bytes)


def safe_audio_filename(file: UploadFile) -> str:
    original = file.filename or f"input.{settings.audio_storage_format}"
    return Path(original).name
