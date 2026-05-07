import logging
import sys

from pythonjsonlogger.json import JsonFormatter

from app.config import settings


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(settings.log_level.upper())
    logger.propagate = False
    return logger
