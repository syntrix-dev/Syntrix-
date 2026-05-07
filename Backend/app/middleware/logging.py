"""
logging.py — Structured request/response logging middleware.

Logs: method, path, status code, duration, and client IP.
Never logs request bodies (which could contain credentials).
"""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("syntrix.http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())[:8]
        start  = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        ip = request.client.host if request.client else "unknown"

        logger.info(
            "req_id=%s method=%s path=%s status=%s duration_ms=%s ip=%s",
            req_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            ip,
        )

        # Add request-id header so frontend/logs can correlate
        response.headers["X-Request-Id"] = req_id
        return response
