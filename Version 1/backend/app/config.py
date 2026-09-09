"""
Centralized application settings, loaded from environment variables (.env).
Never hardcode secrets here -- this file only defines *how* settings are read.
"""
import os

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchor .env to this backend/ directory rather than the process's launch
# directory. A relative "./.env" path depends on the current working
# directory of whatever process starts the app -- running the server from
# a different shell/IDE config than you ran a script from can silently
# make it miss the file with no error. Anchoring removes that failure mode.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ENV_FILE_PATH = os.path.join(_BACKEND_DIR, ".env")


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./routesense.db"

    # Auth
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60          # short-lived, standard session
    jwt_remember_me_expire_minutes: int = 60 * 24 * 14  # 14 days, when "remember me" is checked

    # CORS -- both loopback host names, since browsers treat them as
    # different origins, and any port (Vite auto-bumps if 5173 is busy).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=_ENV_FILE_PATH, extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
print(f"[RouteSense] Loaded env file: {_ENV_FILE_PATH} (exists={os.path.exists(_ENV_FILE_PATH)})")
