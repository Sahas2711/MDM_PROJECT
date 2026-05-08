import httpx
from app.config import settings
from app.errors import ProviderConfigError, ProviderRequestError
from app.providers.base import BaseTTSProvider

class SimpleTTSProvider(BaseTTSProvider):
    provider_name = "simple_tts"

    def __init__(self) -> None:
        self.model_name = "simple-tts"

    async def synthesize(self, text: str) -> tuple[bytes, str]:
        # Use a simple, reliable TTS service
        try:
            # Try Google Translate TTS first (free, no API key needed)
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    "https://translate.google.com/translate_tts",
                    params={
                        "ie": "UTF-8",
                        "q": text[:200],  # Limit text length
                        "tl": "mr",  # Marathi
                        "client": "tw-ob"
                    },
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                )
                
                if response.status_code == 200 and len(response.content) > 1000:
                    return response.content, "audio/mpeg"
                
                # Fallback to English if Marathi fails
                response = await client.get(
                    "https://translate.google.com/translate_tts",
                    params={
                        "ie": "UTF-8",
                        "q": text[:200],
                        "tl": "en",
                        "client": "tw-ob"
                    },
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                )
                
                if response.status_code == 200 and len(response.content) > 1000:
                    return response.content, "audio/mpeg"
                
                raise ProviderRequestError("TTS service returned invalid audio", status_code=502)
                
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("TTS service timed out", status_code=504, code="provider_timeout") from exc
        except Exception as exc:
            raise ProviderRequestError("TTS service failed", status_code=502) from exc