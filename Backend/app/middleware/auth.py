"""
auth.py — API-key authentication middleware.

Every request (except / and /healthz) must carry:
    X-API-Key: <SYNTRIX_API_KEY from .env>

Uses constant-time comparison to prevent timing attacks.
"""

import hmac
import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger("syntrix.auth")

# Endpoints that are public (no key required)
PUBLIC_PATHS = {"/", "/healthz", "/docs", "/openapi.json", "/redoc"}


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        key = request.headers.get("X-API-Key", "")

        # hmac.compare_digest prevents timing-oracle attacks
        valid = hmac.compare_digest(
            key.encode("utf-8"),
            settings.syntrix_api_key.encode("utf-8"),
        )

        if not valid:
            logger.warning(
                "Rejected request — bad API key | path=%s ip=%s",
                request.url.path,
                request.client.host if request.client else "unknown",
            )
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "detail": "Invalid or missing X-API-Key header"},
            )

        return await call_next(request)
