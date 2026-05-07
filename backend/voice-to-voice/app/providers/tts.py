import httpx

from app.config import settings
from app.errors import ProviderConfigError, ProviderRequestError
from app.providers.base import BaseTTSProvider


class HuggingFaceTTSProvider(BaseTTSProvider):
    provider_name = "huggingface"

    def __init__(self) -> None:
        if not settings.huggingface_api_key:
            raise ProviderConfigError("HUGGINGFACE_API_KEY is missing for TTS synthesis.")
        self.model_name = settings.huggingface_tts_model

    async def synthesize(self, text: str) -> tuple[bytes, str]:
        headers = {
            "Authorization": f"Bearer {settings.huggingface_api_key}",
            "Content-Type": "application/json",
        }
        payload = {"inputs": text}

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.huggingface_base_url.rstrip('/')}/{self.model_name}",
                    headers=headers,
                    json=payload,
                )
            response.raise_for_status()
            audio_bytes = response.content
            if not audio_bytes:
                raise ProviderRequestError("TTS provider returned empty audio.", status_code=502)
            audio_mime_type = response.headers.get("content-type", "audio/wav")
            return audio_bytes, audio_mime_type
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("TTS provider timed out.", status_code=504, code="provider_timeout") from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            code = "provider_rate_limit" if exc.response.status_code == 429 else "provider_failure"
            raise ProviderRequestError(
                f"Hugging Face TTS failed with status {exc.response.status_code}.",
                status_code=status_code,
                code=code,
            ) from exc
        except ProviderRequestError:
            raise
        except Exception as exc:
            raise ProviderRequestError("Unexpected TTS provider error.") from exc


class HttpTTSProvider(BaseTTSProvider):
    provider_name = "http"

    def __init__(self) -> None:
        if not settings.fallback_tts_url:
            raise ProviderConfigError("FALLBACK_TTS_URL is missing for fallback TTS usage.")
        self.model_name = "custom-http-tts"

    async def synthesize(self, text: str) -> tuple[bytes, str]:
        headers = {"Content-Type": "application/json"}
        if settings.fallback_tts_api_key:
            headers["Authorization"] = f"Bearer {settings.fallback_tts_api_key}"
        payload = {"text": text, "language": "mr"}
        if settings.fallback_tts_voice:
            payload["voice"] = settings.fallback_tts_voice

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(settings.fallback_tts_url, headers=headers, json=payload)
            response.raise_for_status()
            audio_bytes = response.content
            if not audio_bytes:
                raise ProviderRequestError("Fallback TTS provider returned empty audio.", status_code=502)
            return audio_bytes, response.headers.get("content-type", "audio/wav")
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("Fallback TTS provider timed out.", status_code=504, code="provider_timeout") from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            code = "provider_rate_limit" if exc.response.status_code == 429 else "provider_failure"
            raise ProviderRequestError(
                f"Fallback TTS failed with status {exc.response.status_code}.",
                status_code=status_code,
                code=code,
            ) from exc
        except ProviderRequestError:
            raise
        except Exception as exc:
            raise ProviderRequestError("Unexpected fallback TTS provider error.") from exc
