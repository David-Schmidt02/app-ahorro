"""Centralized logging configuration with 7-day rotation.

Requirements:
- Timestamp
- Logger name (class/module)
- Log level
- Rotating file handler (7 days)
- Console handler
- Suppress uvicorn noise
"""
import logging
import logging.handlers
from pathlib import Path
from typing import Set

from src.config.settings import get_settings


# Cache for configured loggers
_configured_loggers: Set[str] = set()


def setup_logging():
    """
    Initialize logging system based on config.yaml.

    Called on:
    - Application startup
    - After config reload
    """
    settings = get_settings()
    log_config = settings.logging

    # Get log level
    log_level = getattr(logging, log_config.level.upper(), logging.INFO)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Formatter with timestamp + logger name
    formatter = logging.Formatter(log_config.format)

    # Console handler
    if log_config.console.enabled:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    # Rotating file handler (7 days retention)
    if log_config.file.enabled:
        log_path = Path(log_config.file.path)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.handlers.RotatingFileHandler(
            filename=log_path,
            maxBytes=log_config.file.max_bytes,
            backupCount=log_config.file.backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    # Suppress uvicorn noise
    if log_config.suppress_uvicorn:
        logging.getLogger("uvicorn").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.error").setLevel(logging.WARNING)

    # Suppress other noisy loggers
    logging.getLogger("multipart").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module.

    Usage:
        from src.log.logging_config import get_logger
        logger = get_logger(__name__)

    Args:
        name: Module name (use __name__)

    Returns:
        logging.Logger: Configured logger
    """
    logger = logging.getLogger(name)
    _configured_loggers.add(name)
    return logger


def reload_logging_config():
    """
    Reload logging configuration after config.yaml changes.

    Updates:
    - Log level for all loggers
    - Handlers
    - Formatters
    """
    setup_logging()

    # Update level for all previously created loggers
    settings = get_settings()
    log_level = getattr(logging, settings.logging.level.upper(), logging.INFO)

    for logger_name in _configured_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(log_level)
