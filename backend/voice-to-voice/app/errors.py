class VoiceAssistantError(Exception):
    def __init__(self, message: str, code: str = "voice_assistant_error", status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class ProviderConfigError(VoiceAssistantError):
    def __init__(self, message: str):
        super().__init__(message=message, code="missing_provider_config", status_code=503)


class ProviderRequestError(VoiceAssistantError):
    def __init__(self, message: str, status_code: int = 502, code: str = "provider_failure"):
        super().__init__(message=message, code=code, status_code=status_code)
