from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_version: str = "1.0.0"
    default_model: str = "random_forest"
    log_level: str = "INFO"

    # Input validation bounds
    min_price_floor: float = 1.0
    min_price_ceiling: float = 1_000_000.0
    max_price_floor: float = 1.0
    max_price_ceiling: float = 1_000_000.0


settings = Settings()
