"""
config.py — Centralised, typed settings.

All values come from environment variables (or .env in dev).
Nothing is hardcoded. Import `settings` everywhere instead of os.getenv().
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── AWS ───────────────────────────────────────────────────────────────────
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_session_token: str = ""
    aws_region: str = "ap-south-1"

    # ── Auth ──────────────────────────────────────────────────────────────────
    syntrix_api_key: str  # required — no default, app won't start without it

    # ── CORS ──────────────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000"

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ── Rate limits ───────────────────────────────────────────────────────────
    rate_limit_read: int = 60
    rate_limit_write: int = 10

    # ── Misc ──────────────────────────────────────────────────────────────────
    log_level: str = "INFO"
    env: str = "production"

    @property
    def is_dev(self) -> bool:
        return self.env.lower() == "development"

    @field_validator("syntrix_api_key")
    @classmethod
    def key_must_not_be_placeholder(cls, v: str) -> str:
        if not v or "CHANGE_ME" in v or len(v) < 20:
            raise ValueError(
                "SYNTRIX_API_KEY is missing or still the placeholder. "
                "Generate a real secret before starting in production."
            )
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
