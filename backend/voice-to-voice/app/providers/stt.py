from io import BytesIO

import httpx

from app.config import settings
from app.errors import ProviderConfigError, ProviderRequestError
from app.providers.base import BaseSTTProvider


class GroqWhisperSTTProvider(BaseSTTProvider):
    provider_name = "groq"

    def __init__(self) -> None:
        if not settings.groq_api_key:
            raise ProviderConfigError("GROQ_API_KEY is missing for Groq Whisper transcription.")

    async def transcribe(self, audio_bytes: bytes, filename: str, content_type: str) -> str:
        data = {
            "model": settings.stt_model,
            "temperature": "0",
            "response_format": "verbose_json",
            "prompt": "The speaker is a farmer from Maharashtra. Expect Marathi, Hindi, and mixed farm vocabulary.",
        }
        files = {"file": (filename, BytesIO(audio_bytes), content_type)}
        headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.groq_base_url}/audio/transcriptions",
                    headers=headers,
                    data=data,
                    files=files,
                )
            response.raise_for_status()
            payload = response.json()
            text = (payload.get("text") or "").strip()
            if not text:
                raise ProviderRequestError("Transcription returned empty text.", status_code=422, code="empty_transcription")
            return text
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("Transcription provider timed out.", status_code=504, code="provider_timeout") from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            code = "provider_rate_limit" if exc.response.status_code == 429 else "provider_failure"
            raise ProviderRequestError(
                f"Groq transcription failed with status {exc.response.status_code}.",
                status_code=status_code,
                code=code,
            ) from exc
        except ProviderRequestError:
            raise
        except Exception as exc:
            raise ProviderRequestError("Unexpected transcription provider error.") from exc


class OpenAICompatibleSTTProvider(BaseSTTProvider):
    provider_name = "openai_compatible"

    def __init__(self) -> None:
        if (
            not settings.stt_openai_compatible_api_key
            or not settings.stt_openai_compatible_base_url
            or not settings.stt_openai_compatible_model
        ):
            raise ProviderConfigError("STT_OPENAI_COMPATIBLE_* settings are incomplete for fallback STT usage.")

    async def transcribe(self, audio_bytes: bytes, filename: str, content_type: str) -> str:
        data = {
            "model": settings.stt_openai_compatible_model,
            "temperature": "0",
            "response_format": "verbose_json",
            "prompt": "The speaker is a farmer from Maharashtra. Expect Marathi, Hindi, and mixed farm vocabulary.",
        }
        files = {"file": (filename, BytesIO(audio_bytes), content_type)}
        headers = {"Authorization": f"Bearer {settings.stt_openai_compatible_api_key}"}

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.stt_openai_compatible_base_url.rstrip('/')}/audio/transcriptions",
                    headers=headers,
                    data=data,
                    files=files,
                )
            response.raise_for_status()
            payload = response.json()
            text = (payload.get("text") or "").strip()
            if not text:
                raise ProviderRequestError("Fallback transcription returned empty text.", status_code=422, code="empty_transcription")
            return text
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("Fallback transcription provider timed out.", status_code=504, code="provider_timeout") from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            code = "provider_rate_limit" if exc.response.status_code == 429 else "provider_failure"
            raise ProviderRequestError(
                f"Fallback transcription failed with status {exc.response.status_code}.",
                status_code=status_code,
                code=code,
            ) from exc
        except ProviderRequestError:
            raise
        except Exception as exc:
            raise ProviderRequestError("Unexpected fallback transcription provider error.") from exc
