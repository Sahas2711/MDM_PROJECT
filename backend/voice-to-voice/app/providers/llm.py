import httpx

from app.config import settings
from app.errors import ProviderConfigError, ProviderRequestError
from app.prompts import SYSTEM_PROMPT
from app.providers.base import BaseLLMProvider


def extract_chat_content(payload: dict) -> str:
    choices = payload.get("choices") or []
    if not choices:
        raise ProviderRequestError("LLM returned no choices.", status_code=502)
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [part.get("text", "") for part in content if isinstance(part, dict)]
        return "".join(parts).strip()
    return ""


class OpenRouterLLMProvider(BaseLLMProvider):
    provider_name = "openrouter"

    def __init__(self) -> None:
        if not settings.openrouter_api_key:
            raise ProviderConfigError("OPENROUTER_API_KEY is missing for LLM generation.")
        self.model_name = settings.llm_model

    async def generate(self, user_text: str) -> tuple[str, str | None]:
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        if settings.openrouter_referer:
            headers["HTTP-Referer"] = settings.openrouter_referer
        if settings.openrouter_title:
            headers["X-Title"] = settings.openrouter_title

        payload = {
            "model": self.model_name,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_text},
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.openrouter_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
            response.raise_for_status()
            content = extract_chat_content(response.json())
            if not content:
                raise ProviderRequestError("LLM returned an empty answer.", status_code=502)
            return content, None
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("LLM provider timed out.", status_code=504, code="provider_timeout") from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            code = "provider_rate_limit" if exc.response.status_code == 429 else "provider_failure"
            raise ProviderRequestError(
                f"OpenRouter generation failed with status {exc.response.status_code}.",
                status_code=status_code,
                code=code,
            ) from exc
        except ProviderRequestError:
            raise
        except Exception as exc:
            raise ProviderRequestError("Unexpected LLM provider error.") from exc


class OpenAICompatibleLLMProvider(BaseLLMProvider):
    provider_name = "openai_compatible"

    def __init__(self) -> None:
        if not settings.openai_compatible_api_key or not settings.openai_compatible_base_url or not settings.openai_compatible_model:
            raise ProviderConfigError("OPENAI_COMPATIBLE_* settings are incomplete for fallback LLM usage.")
        self.model_name = settings.openai_compatible_model

    async def generate(self, user_text: str) -> tuple[str, str | None]:
        headers = {
            "Authorization": f"Bearer {settings.openai_compatible_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_text},
            ],
        }
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.openai_compatible_base_url.rstrip('/')}/chat/completions",
                    headers=headers,
                    json=payload,
                )
            response.raise_for_status()
            content = extract_chat_content(response.json())
            if not content:
                raise ProviderRequestError("Fallback LLM returned an empty answer.", status_code=502)
            return content, None
        except httpx.TimeoutException as exc:
            raise ProviderRequestError("Fallback LLM provider timed out.", status_code=504, code="provider_timeout") from exc
        except httpx.HTTPStatusError as exc:
            status_code = 429 if exc.response.status_code == 429 else 502
            code = "provider_rate_limit" if exc.response.status_code == 429 else "provider_failure"
            raise ProviderRequestError(
                f"Fallback LLM generation failed with status {exc.response.status_code}.",
                status_code=status_code,
                code=code,
            ) from exc
        except ProviderRequestError:
            raise
        except Exception as exc:
            raise ProviderRequestError("Unexpected fallback LLM provider error.") from exc
