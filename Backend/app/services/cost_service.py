"""
cost_service.py — All AWS cost + EC2 waste logic.

Security hardening vs original:
- instance_id validated against EC2-ID regex before any API call (prevents injection)
- No bare except — specific exceptions caught and re-raised/logged
- Structured logging throughout (no print statements)
- All monetary values rounded to 2dp to avoid float drift in downstream calcs
"""

import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Any

from botocore.exceptions import ClientError

from app.config import settings
from app.services.aws_client import get_client, AWSClientError

logger = logging.getLogger("syntrix.cost")

USD_TO_INR = 83
REGION     = settings.aws_region

# EC2 instance IDs always match this pattern — anything else is invalid input
_EC2_ID_RE = re.compile(r"^i-[0-9a-f]{8,17}$")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _date_range(days: int = 7) -> tuple[str, str]:
    """Return (start, end) date strings for the Cost Explorer API."""
    end   = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=days)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _validate_instance_id(instance_id: str) -> None:
    """
    Raise ValueError if the instance ID doesn't look like a real EC2 ID.
    This prevents callers from passing arbitrary strings into boto3 API calls.
    """
    if not _EC2_ID_RE.match(instance_id):
        raise ValueError(
            f"Invalid instance_id format: '{instance_id}'. "
            "Must match i-<8-17 hex chars>."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Total cost (7-day daily breakdown)
# ─────────────────────────────────────────────────────────────────────────────

def get_aws_cost() -> dict[str, Any]:
    """Fetch 7-day daily cost from Cost Explorer."""
    try:
        # Cost Explorer is always us-east-1 regardless of workload region
        client = get_client("ce", "us-east-1")
        start, end = _date_range(7)

        response = client.get_cost_and_usage(
            TimePeriod={"Start": start, "End": end},
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
        )

        daily: list[dict] = []
        total = 0.0

        for day in response.get("ResultsByTime", []):
            amount = float(day["Total"]["UnblendedCost"]["Amount"])
            total += amount
            daily.append({
                "date":     day["TimePeriod"]["Start"],
                "cost_usd": round(amount, 2),
            })

        avg = round(total / len(daily), 2) if daily else 0.0

        logger.info("Cost fetched: total=$%.2f days=%d", total, len(daily))
        return {
            "summary": {
                "total_cost_usd":    round(total, 2),
                "average_daily_cost": avg,
            },
            "daily": daily,
        }

    except AWSClientError as exc:
        logger.error("get_aws_cost — AWS client error: %s", exc)
        raise
    except ClientError as exc:
        logger.error("get_aws_cost — boto3 ClientError: %s", exc)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Cost by service (7-day aggregate)
# ─────────────────────────────────────────────────────────────────────────────

def get_cost_by_service() -> dict[str, Any]:
    """Fetch per-service costs for the last 7 days, sorted descending."""
    try:
        client = get_client("ce", "us-east-1")
        start, end = _date_range(7)

        response = client.get_cost_and_usage(
            TimePeriod={"Start": start, "End": end},
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )

        costs: dict[str, float] = {}

        for day in response.get("ResultsByTime", []):
            for group in day.get("Groups", []):
                service = group["Keys"][0]
                amount  = float(group["Metrics"]["UnblendedCost"]["Amount"])
                costs[service] = costs.get(service, 0.0) + amount

        services = [
            {"service": k, "cost_usd": round(v, 2)}
            for k, v in costs.items()
            if v > 0  # exclude zero-cost services from output
        ]
        services.sort(key=lambda x: x["cost_usd"], reverse=True)

        logger.info("Service cost fetched: %d services", len(services))
        return {"services": services}

    except (AWSClientError, ClientError) as exc:
        logger.error("get_cost_by_service error: %s", exc)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Stop EC2 instance
# ─────────────────────────────────────────────────────────────────────────────

def stop_ec2_instance(instance_id: str) -> dict[str, Any]:
    """
    Stop a single EC2 instance.

    Security: instance_id is validated against the EC2 ID regex before
    any API call is made. This prevents crafted inputs from causing
    unintended behaviour in the AWS API.
    """
    _validate_instance_id(instance_id)  # raises ValueError on bad input

    try:
        ec2 = get_client("ec2", REGION)
        response = ec2.stop_instances(InstanceIds=[instance_id])

        stopping = response.get("StoppingInstances", [{}])[0]
        prev_state = stopping.get("PreviousState", {}).get("Name", "unknown")
        curr_state = stopping.get("CurrentState",  {}).get("Name", "stopping")

        logger.info(
            "stop_ec2: instance_id=%s %s → %s",
            instance_id, prev_state, curr_state,
        )

        return {
            "status":      "success",
            "instance_id": instance_id,
            "previous_state": prev_state,
            "current_state":  curr_state,
            "message":     "Instance is stopping",
        }

    except ClientError as exc:
        error_code = exc.response["Error"]["Code"]
        logger.error("stop_ec2 ClientError: instance=%s code=%s", instance_id, error_code)

        # Surface meaningful error codes to the caller without leaking internals
        if error_code == "InvalidInstanceID.NotFound":
            raise ValueError(f"Instance {instance_id} not found in {REGION}") from exc
        if error_code == "UnauthorizedOperation":
            raise PermissionError(f"IAM policy does not allow ec2:StopInstances on {instance_id}") from exc
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Find idle EC2 instances
# ─────────────────────────────────────────────────────────────────────────────

def find_idle_instances(cpu_threshold: float = 5.0) -> list[dict]:
    """
    Return running EC2 instances whose 1-hour average CPU is below cpu_threshold%.

    CloudWatch is queried per-instance (not in batch) because the free-tier
    Metrics API doesn't support multi-dimension batch calls. For large fleets,
    consider switching to CloudWatch Metrics Insights.
    """
    try:
        ec2 = get_client("ec2", REGION)
        cw  = get_client("cloudwatch", REGION)

        paginator = ec2.get_paginator("describe_instances")
        pages     = paginator.paginate(
            Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
        )

        idle: list[dict] = []
        now   = datetime.now(tz=timezone.utc)
        start = now - timedelta(hours=1)

        for page in pages:
            for reservation in page.get("Reservations", []):
                for inst in reservation.get("Instances", []):
                    iid   = inst["InstanceId"]
                    itype = inst.get("InstanceType", "unknown")

                    # Pull name tag if present
                    tags  = {t["Key"]: t["Value"] for t in inst.get("Tags", [])}
                    name  = tags.get("Name", "")

                    metrics = cw.get_metric_statistics(
                        Namespace="AWS/EC2",
                        MetricName="CPUUtilization",
                        Dimensions=[{"Name": "InstanceId", "Value": iid}],
                        StartTime=start,
                        EndTime=now,
                        Period=3600,
                        Statistics=["Average"],
                    )

                    datapoints = metrics.get("Datapoints", [])
                    if not datapoints:
                        # No data → instance may be too new or CW agent absent; skip
                        logger.debug("No CW datapoints for instance %s — skipping", iid)
                        continue

                    avg_cpu = sorted(datapoints, key=lambda x: x["Timestamp"])[-1]["Average"]

                    if avg_cpu < cpu_threshold:
                        idle.append({
                            "instance_id":   iid,
                            "instance_type": itype,
                            "name":          name,
                            "cpu":           round(avg_cpu, 2),
                        })
                        logger.info("Idle instance found: %s (%.2f%% CPU)", iid, avg_cpu)

        logger.info("Idle scan complete: %d idle / region=%s", len(idle), REGION)
        return idle

    except (AWSClientError, ClientError) as exc:
        logger.error("find_idle_instances error: %s", exc)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Full account analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_account() -> dict[str, Any]:
    """
    Aggregate waste detection across all detection strategies.

    Strategies currently implemented:
      1. Idle EC2 (CPU < 5% for 1 hour)
      2. Hidden/unclassified EC2 costs ('EC2 - Other' line item > $5)
    """
    cost_data = get_aws_cost()
    services  = get_cost_by_service()["services"]
    idle      = find_idle_instances()

    issues: list[dict] = []

    # Strategy 1 — idle EC2
    for inst in idle:
        issues.append({
            "type":                           "idle_ec2",
            "resource_id":                    inst["instance_id"],
            "instance_type":                  inst["instance_type"],
            "cpu_percent":                    inst["cpu"],
            "estimated_waste_usd_per_month":  7.5,  # conservative t2.micro baseline
        })

    # Strategy 2 — hidden / unclassified EC2 costs
    for svc in services:
        if "EC2 - Other" in svc["service"] and svc["cost_usd"] > 5:
            issues.append({
                "type":                          "hidden_cost",
                "service":                       svc["service"],
                "7day_cost_usd":                 svc["cost_usd"],
                "estimated_waste_usd_per_month": round(svc["cost_usd"] * 4.3 * 0.3, 2),
            })

    total_waste = round(sum(i["estimated_waste_usd_per_month"] for i in issues), 2)
    your_fee    = round(total_waste * 0.20, 2)

    return {
        "summary":                         cost_data["summary"],
        "issues_found":                    len(issues),
        "potential_savings_usd_per_month": total_waste,
        "potential_savings_inr_per_month": round(total_waste * USD_TO_INR, 2),
        "your_fee_inr":                    round(your_fee * USD_TO_INR, 2),
        "demo_mode":                       False,
        "issues":                          issues,
    }
