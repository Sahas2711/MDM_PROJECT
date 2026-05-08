import base64
from dataclasses import dataclass

from app.config import settings
from app.errors import ProviderConfigError, ProviderRequestError, VoiceAssistantError
from app.logger import get_logger
from app.providers.base import BaseLLMProvider, BaseSTTProvider, BaseTTSProvider
from app.providers.llm import GroqLLMProvider, OpenAICompatibleLLMProvider, OpenRouterLLMProvider
from app.providers.stt import GroqWhisperSTTProvider, OpenAICompatibleSTTProvider
from app.providers.tts import HttpTTSProvider, HuggingFaceTTSProvider
from app.providers.simple_tts import SimpleTTSProvider

log = get_logger(__name__)


@dataclass
class VoiceChatResult:
    transcription: str
    response_text: str
    response_audio_base64: str
    response_audio_mime_type: str
    stt_provider: str
    llm_provider: str
    tts_provider: str
    llm_model: str
    warnings: list[str]


class ProviderFactory:
    @staticmethod
    def create_stt(provider_name: str) -> BaseSTTProvider:
        if provider_name == "groq":
            return GroqWhisperSTTProvider()
        if provider_name == "openai_compatible":
            return OpenAICompatibleSTTProvider()
        raise ProviderConfigError(f"Unsupported STT provider '{provider_name}'.")

    @staticmethod
    def create_llm(provider_name: str) -> BaseLLMProvider:
        if provider_name == "groq":
            return GroqLLMProvider()
        if provider_name == "openrouter":
            return OpenRouterLLMProvider()
        if provider_name == "openai_compatible":
            return OpenAICompatibleLLMProvider()
        raise ProviderConfigError(f"Unsupported LLM provider '{provider_name}'.")

    @staticmethod
    def create_tts(provider_name: str) -> BaseTTSProvider:
        if provider_name == "huggingface":
            return HuggingFaceTTSProvider()
        if provider_name == "http":
            return HttpTTSProvider()
        if provider_name == "simple_tts":
            return SimpleTTSProvider()
        raise ProviderConfigError(f"Unsupported TTS provider '{provider_name}'.")


class VoiceAssistantOrchestrator:
    async def transcribe(self, audio_bytes: bytes, filename: str, content_type: str) -> tuple[str, str, list[str]]:
        warnings: list[str] = []
        try:
            provider = ProviderFactory.create_stt(settings.stt_provider)
            log.info("Starting transcription", extra={"provider": provider.provider_name, "audio_file": filename})
            text = await provider.transcribe(audio_bytes=audio_bytes, filename=filename, content_type=content_type)
            log.info("Transcription complete", extra={"provider": provider.provider_name, "text_length": len(text)})
            return text, provider.provider_name, warnings
        except ProviderRequestError as exc:
            if exc.code != "provider_rate_limit" or settings.stt_fallback_provider == "none":
                raise
            warnings.append("Primary STT limit hit. Fallback transcription provider was used.")
            fallback = ProviderFactory.create_stt(settings.stt_fallback_provider)
            log.warning(
                "Primary STT failed, using fallback",
                extra={"primary": settings.stt_provider, "fallback": fallback.provider_name},
            )
            text = await fallback.transcribe(audio_bytes=audio_bytes, filename=filename, content_type=content_type)
            return text, fallback.provider_name, warnings

    async def generate_reply(self, text: str) -> tuple[str, str, str, list[str]]:
        warnings: list[str] = []
        try:
            provider = ProviderFactory.create_llm(settings.llm_provider)
            log.info("Starting LLM generation", extra={"provider": provider.provider_name, "model": provider.model_name})
            reply, safety_note = await provider.generate(text)
            if safety_note:
                warnings.append(safety_note)
            return reply, provider.provider_name, provider.model_name, warnings
        except ProviderRequestError as exc:
            if exc.code != "provider_rate_limit" or settings.llm_fallback_provider == "none":
                raise
            warnings.append("Primary LLM limit hit. Fallback model was used.")
            fallback = ProviderFactory.create_llm(settings.llm_fallback_provider)
            log.warning(
                "Primary LLM failed, using fallback",
                extra={"primary": settings.llm_provider, "fallback": fallback.provider_name},
            )
            reply, safety_note = await fallback.generate(text)
            if safety_note:
                warnings.append(safety_note)
            return reply, fallback.provider_name, fallback.model_name, warnings

    async def synthesize(self, text: str) -> tuple[bytes, str, str, str, list[str]]:
        warnings: list[str] = []
        try:
            provider = ProviderFactory.create_tts(settings.tts_provider)
            log.info("Starting speech synthesis", extra={"provider": provider.provider_name, "model": provider.model_name})
            audio_bytes, mime_type = await provider.synthesize(text)
            return audio_bytes, mime_type, provider.provider_name, provider.model_name, warnings
        except ProviderRequestError as exc:
            if settings.tts_fallback_provider == "none":
                warnings.append("Speech generation failed. Text reply is still available.")
                return b"", "audio/wav", "none", "text-only", warnings
            warning_message = (
                "Primary TTS limit hit. Fallback speech provider was used."
                if exc.code == "provider_rate_limit"
                else "Primary TTS provider failed. Fallback speech provider was used."
            )
            warnings.append(warning_message)
            fallback = ProviderFactory.create_tts(settings.tts_fallback_provider)
            log.warning(
                "Primary TTS failed, using fallback",
                extra={"primary": settings.tts_provider, "fallback": fallback.provider_name, "error_code": exc.code},
            )
            try:
                audio_bytes, mime_type = await fallback.synthesize(text)
                return audio_bytes, mime_type, fallback.provider_name, fallback.model_name, warnings
            except ProviderRequestError:
                warnings.append("Fallback TTS also failed. Returning text-only response.")
                return b"", "audio/wav", "none", "text-only", warnings

    async def voice_chat(self, audio_bytes: bytes, filename: str, content_type: str) -> VoiceChatResult:
        warnings: list[str] = []

        transcription, stt_provider, stt_warnings = await self.transcribe(audio_bytes, filename, content_type)
        warnings.extend(stt_warnings)
        if not transcription.strip():
            raise VoiceAssistantError("Transcription is empty. Please record the question again.", code="empty_transcription", status_code=422)

        reply, llm_provider, llm_model, llm_warnings = await self.generate_reply(transcription)
        warnings.extend(llm_warnings)
        output_audio, audio_mime_type, tts_provider, _, tts_warnings = await self.synthesize(reply)
        warnings.extend(tts_warnings)

        return VoiceChatResult(
            transcription=transcription,
            response_text=reply,
            response_audio_base64=base64.b64encode(output_audio).decode("utf-8"),
            response_audio_mime_type=audio_mime_type,
            stt_provider=stt_provider,
            llm_provider=llm_provider,
            tts_provider=tts_provider,
            llm_model=llm_model,
            warnings=warnings,
        )
