"""
main.py — Syntrix FastAPI application (production-grade).

Security layers (in order of execution):
  1. RequestLoggingMiddleware  — structured access log, never logs bodies
  2. CORSMiddleware            — strict origin whitelist from env
  3. APIKeyMiddleware          — constant-time X-API-Key check on all routes
  4. SlowAPI rate limiter      — per-IP, separate limits for read vs write
  5. Input validation          — Pydantic + regex on all route params
  6. Error handlers            — never leak stack traces to clients
"""

import logging
import logging.config
import sys

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.middleware.auth import APIKeyMiddleware
from app.middleware.logging import RequestLoggingMiddleware
from app.services.cost_service import (
    get_aws_cost,
    get_cost_by_service,
    stop_ec2_instance,
    find_idle_instances,
    analyze_account,
)
from app.services.aws_client import AWSClientError

# ─────────────────────────────────────────────────────────────────────────────
# Logging setup
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("syntrix.main")

# ─────────────────────────────────────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=[])

# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Syntrix API",
    version="3.0.0",
    description="AWS Cost Intelligence — production API",
    # Disable interactive docs in production (avoids leaking API surface)
    docs_url="/docs" if settings.is_dev else None,
    redoc_url="/redoc" if settings.is_dev else None,
    openapi_url="/openapi.json" if settings.is_dev else None,
)

# State required by slowapi
app.state.limiter = limiter

# ─────────────────────────────────────────────────────────────────────────────
# Middleware stack  (executed bottom → top on request, top → bottom on response)
# ─────────────────────────────────────────────────────────────────────────────

# 1. Request logging (outermost — logs every request including rejected ones)
app.add_middleware(RequestLoggingMiddleware)

# 2. CORS — strict origin whitelist
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,   # never "*" in production
    allow_credentials=False,               # we use API key, not cookies
    allow_methods=["GET"],                 # Syntrix is read-only except stop-ec2
    allow_headers=["X-API-Key", "Content-Type"],
)

# 3. API key auth (after CORS so OPTIONS pre-flight passes unauthenticated)
app.add_middleware(APIKeyMiddleware)

# ─────────────────────────────────────────────────────────────────────────────
# Exception handlers
# ─────────────────────────────────────────────────────────────────────────────

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(AWSClientError)
async def aws_client_error_handler(request: Request, exc: AWSClientError):
    logger.error("AWSClientError on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=502,
        content={"error": "AWS service unavailable", "detail": "Check credentials and IAM permissions"},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.warning("Validation error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=400,
        content={"error": "Bad request", "detail": str(exc)},
    )


@app.exception_handler(PermissionError)
async def permission_error_handler(request: Request, exc: PermissionError):
    logger.error("IAM permission error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=403,
        content={"error": "Forbidden", "detail": str(exc)},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    # Log the full traceback internally but NEVER send it to the client
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

READ_LIMIT  = f"{settings.rate_limit_read}/minute"
WRITE_LIMIT = f"{settings.rate_limit_write}/minute"


@app.get("/", include_in_schema=False)
def root():
    return {"message": "Syntrix running", "status": "ok", "version": "3.0.0"}


@app.get("/healthz", include_in_schema=False)
def health():
    """Liveness probe — used by load balancers / k8s. No auth required."""
    return {"status": "ok"}


@app.get("/cost")
@limiter.limit(READ_LIMIT)
def cost(request: Request):
    """7-day daily cost breakdown."""
    return get_aws_cost()


@app.get("/cost-by-service")
@limiter.limit(READ_LIMIT)
def cost_by_service(request: Request):
    """7-day cost aggregated per AWS service."""
    return get_cost_by_service()


@app.get("/waste/idle-ec2")
@limiter.limit(READ_LIMIT)
def idle_ec2(request: Request):
    """List running EC2 instances with < 5% CPU over the past hour."""
    instances = find_idle_instances()
    return {"count": len(instances), "instances": instances}


@app.get("/analyze")
@limiter.limit(READ_LIMIT)
def analyze(request: Request):
    """Full waste analysis with savings projection."""
    return analyze_account()


@app.get("/fix/stop-ec2")
@limiter.limit(WRITE_LIMIT)
def stop_ec2(
    request: Request,
    instance_id: str = Query(
        ...,
        description="EC2 instance ID to stop (e.g. i-0abc123def456789a)",
        pattern=r"^i-[0-9a-f]{8,17}$",   # Pydantic validates before handler runs
        min_length=10,
        max_length=22,
    ),
):
    """
    Stop an EC2 instance.

    - Requires X-API-Key header (like all routes)
    - Rate limited to {RATE_LIMIT_WRITE}/min per IP
    - instance_id validated by regex (Pydantic) AND inside the service layer
    """
    return stop_ec2_instance(instance_id)
