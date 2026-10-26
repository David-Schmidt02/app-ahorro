"""Configuration loader from config.yaml with dynamic reload support."""
import os
import threading
import yaml
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env si existe en el entorno local
load_dotenv()


# Thread lock for atomic settings replacement
_settings_lock = threading.Lock()
_settings_instance: Optional['Settings'] = None
_last_modified: Optional[float] = None


class AppConfig(BaseModel):
    """Application configuration."""
    name: str
    version: str
    api_prefix: str = "/api/v1"


class DatabaseConfig(BaseModel):
    """Database configuration."""
    url: str
    echo: bool = False


class JWTConfig(BaseModel):
    """JWT authentication configuration."""
    enabled: bool = True
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

class RateLimitConfig(BaseModel):
    """Rate limiting configuration."""
    enabled: bool = False
    requests_per_minute: int = 60


class TasaCambioConfig(BaseModel):
    """Exchange rate configuration."""
    tipo_cotizacion_default: str = "blue"
    horas_vigencia: int = 24
    api_url: str = "https://dolarapi.com/v1/dolares"


class LoggingConsoleConfig(BaseModel):
    """Console logging configuration."""
    enabled: bool = True


class LoggingFileConfig(BaseModel):
    """File logging configuration."""
    enabled: bool = False
    path: str = "logs/app.log"
    max_bytes: int = 10485760
    backup_count: int = 7
    rotation: str = "daily"


class LoggingConfig(BaseModel):
    """Logging configuration."""
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    console: LoggingConsoleConfig = Field(default_factory=LoggingConsoleConfig)
    file: LoggingFileConfig = Field(default_factory=LoggingFileConfig)
    suppress_uvicorn: bool = True


class ConfigReloadConfig(BaseModel):
    """Dynamic configuration reload settings."""
    enabled: bool = True
    check_interval_seconds: int = 30


class TestUserConfig(BaseModel):
    """Test user settings for testing purposes."""
    email: str
    password: str


class DevelopmentConfig(BaseModel):
    """Development settings (local testing without login)."""
    bypass_auth: bool = False
    default_user_id: int = 1
    default_user_email: str = "dev@local.com"
    default_user_name: str = "Dev User"


class Settings(BaseModel):
    """Root settings model."""
    app: AppConfig
    database: DatabaseConfig
    jwt: JWTConfig
    rate_limit: RateLimitConfig
    tasa_cambio: TasaCambioConfig
    logging: LoggingConfig
    config_reload: ConfigReloadConfig
    test_user: TestUserConfig
    development: DevelopmentConfig = Field(default_factory=DevelopmentConfig)
    registration_enabled: bool = False


def _get_config_path() -> Path:
    """Get path to config.yaml in project root (backend/)."""
    # __file__ is in backend/src/config/settings.py
    # Go up to backend/config.yaml
    current_dir = Path(__file__).parent  # backend/src/config
    project_root = current_dir.parent.parent  # backend/
    config_path = project_root / "config.yaml"

    if not config_path.exists():
        raise FileNotFoundError(f"config.yaml not found at {config_path}")

    return config_path


def load_config() -> Settings:
    """
    Load configuration from config.yaml, with environment variable overrides.
    Environment variables take precedence (used in production / Railway).

    Returns:
        Settings: Validated settings object
    """
    config_path = _get_config_path()

    with open(config_path, 'r', encoding='utf-8') as f:
        config_dict = yaml.safe_load(f)

    # DATABASE_URL override (en Railway apunta al archivo dentro del volumen)
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        config_dict["database"]["url"] = db_url

    # SECRET_KEY override
    secret_key = os.environ.get("SECRET_KEY")
    if secret_key:
        config_dict["jwt"]["secret_key"] = secret_key

    # REGISTRATION_ENABLED override
    reg_enabled = os.environ.get("REGISTRATION_ENABLED")
    if reg_enabled is not None:
        config_dict["registration_enabled"] = reg_enabled.lower() == "true"

    return Settings(**config_dict)


def get_settings() -> Settings:
    """
    Get current settings instance (singleton pattern).

    Returns:
        Settings: Current settings instance
    """
    global _settings_instance

    if _settings_instance is None:
        with _settings_lock:
            if _settings_instance is None:
                _settings_instance = load_config()
                _update_last_modified()

    return _settings_instance


def reload_config() -> Settings:
    """
    Reload configuration from config.yaml atomically.

    Returns:
        Settings: Newly loaded settings
    """
    global _settings_instance

    new_settings = load_config()

    with _settings_lock:
        _settings_instance = new_settings
        _update_last_modified()

    return new_settings


def _update_last_modified():
    """Update last modified timestamp of config file."""
    global _last_modified
    config_path = _get_config_path()
    _last_modified = os.path.getmtime(config_path)


def check_and_reload_if_changed() -> bool:
    """
    Check if config.yaml has been modified and reload if needed.

    Returns:
        bool: True if config was reloaded, False otherwise
    """
    global _last_modified

    config_path = _get_config_path()
    current_mtime = os.path.getmtime(config_path)

    if _last_modified is None or current_mtime > _last_modified:
        reload_config()
        return True

    return False


# Initialize settings on module import
settings = get_settings()
