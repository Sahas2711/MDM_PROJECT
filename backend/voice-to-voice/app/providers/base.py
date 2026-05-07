from abc import ABC, abstractmethod


class BaseSTTProvider(ABC):
    provider_name: str

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, filename: str, content_type: str) -> str:
        raise NotImplementedError


class BaseLLMProvider(ABC):
    provider_name: str
    model_name: str

    @abstractmethod
    async def generate(self, user_text: str) -> tuple[str, str | None]:
        raise NotImplementedError


class BaseTTSProvider(ABC):
    provider_name: str
    model_name: str

    @abstractmethod
    async def synthesize(self, text: str) -> tuple[bytes, str]:
        raise NotImplementedError
