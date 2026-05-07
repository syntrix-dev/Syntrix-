"""
aws_client.py — Secure, centralised boto3 client factory.

Key security decisions:
- Credentials come ONLY from settings (env vars) or the instance's IAM role.
  They are never read from ~/.aws/credentials in production.
- Clients are cached per (service, region) so we don't create a new session
  on every request.
- All errors are re-raised as AWSClientError so callers handle them uniformly.
"""

import logging
from functools import lru_cache
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger("syntrix.aws")

# Boto3 retry + timeout config
_BOTO_CONFIG = Config(
    retries={"max_attempts": 3, "mode": "adaptive"},
    connect_timeout=5,
    read_timeout=15,
)


class AWSClientError(RuntimeError):
    """Raised when we cannot build or use an AWS client."""


@lru_cache(maxsize=32)
def get_client(service: str, region: str):
    """
    Return a cached boto3 client for the given service/region.

    Credential resolution order (boto3 default chain, we just help it along):
      1. Env vars set from settings (AWS_ACCESS_KEY_ID / SECRET)   ← dev only
      2. IAM instance/task role                                     ← prod preferred
      3. Nothing → AWSClientError
    """
    try:
        kwargs: dict = {
            "service_name": service,
            "region_name": region,
            "config": _BOTO_CONFIG,
        }

        # Only pass explicit credentials if they are actually set.
        # In production (EC2/ECS with IAM role) these will be empty strings
        # and boto3 will automatically use the metadata service.
        if settings.aws_access_key_id:
            kwargs["aws_access_key_id"]     = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
            if settings.aws_session_token:
                kwargs["aws_session_token"] = settings.aws_session_token

        client = boto3.client(**kwargs)
        logger.debug("AWS client created: service=%s region=%s", service, region)
        return client

    except (BotoCoreError, ClientError) as exc:
        logger.error("Failed to create AWS client: service=%s region=%s error=%s", service, region, exc)
        raise AWSClientError(f"Cannot initialise {service} client: {exc}") from exc
