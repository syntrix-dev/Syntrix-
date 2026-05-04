import boto3
from datetime import datetime, timedelta

REGION = "ap-south-1"
USD_TO_INR = 83


# ---------------------------
# AWS CLIENT
# ---------------------------
def get_client(service, region):
    try:
        return boto3.client(service, region_name=region)
    except Exception as e:
        print(f"[ERROR] {service} client:", e)
        return None


# ---------------------------
# TOTAL COST
# ---------------------------
def get_aws_cost():
    try:
        client = get_client("ce", "us-east-1")
        if not client:
            return {"summary": {}, "daily": []}

        end = datetime.utcnow()
        start = end - timedelta(days=7)

        response = client.get_cost_and_usage(
            TimePeriod={
                "Start": start.strftime("%Y-%m-%d"),
                "End": end.strftime("%Y-%m-%d")
            },
            Granularity="DAILY",
            Metrics=["UnblendedCost"]
        )

        total = 0
        daily = []

        for day in response.get("ResultsByTime", []):
            amount = float(day["Total"]["UnblendedCost"]["Amount"])
            total += amount

            daily.append({
                "date": day["TimePeriod"]["Start"],
                "cost_usd": round(amount, 2)
            })

        avg = round(total / len(daily), 2) if daily else 0

        return {
            "summary": {
                "total_cost_usd": round(total, 2),
                "average_daily_cost": avg
            },
            "daily": daily
        }

    except Exception as e:
        print("[ERROR] Cost:", e)
        return {"summary": {}, "daily": []}


# ---------------------------
# COST BY SERVICE
# ---------------------------
def get_cost_by_service():
    try:
        client = get_client("ce", "us-east-1")
        if not client:
            return {"services": []}

        end = datetime.utcnow()
        start = end - timedelta(days=7)

        response = client.get_cost_and_usage(
            TimePeriod={
                "Start": start.strftime("%Y-%m-%d"),
                "End": end.strftime("%Y-%m-%d")
            },
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
        )

        costs = {}

        for day in response.get("ResultsByTime", []):
            for group in day.get("Groups", []):
                service = group["Keys"][0]
                amount = float(group["Metrics"]["UnblendedCost"]["Amount"])

                costs[service] = costs.get(service, 0) + amount

        services = [
            {"service": k, "cost_usd": round(v, 2)}
            for k, v in costs.items()
        ]

        services.sort(key=lambda x: x["cost_usd"], reverse=True)

        return {"services": services}

    except Exception as e:
        print("[ERROR] Service cost:", e)
        return {"services": []}


# ---------------------------
# STOP EC2
# ---------------------------
def stop_ec2_instance(instance_id: str):
    try:
        ec2 = get_client("ec2", REGION)
        if not ec2:
            return {"status": "error", "message": "EC2 client failed"}

        ec2.stop_instances(InstanceIds=[instance_id])

        return {
            "status": "success",
            "instance_id": instance_id,
            "message": "Instance stopping"
        }

    except Exception as e:
        return {
            "status": "error",
            "instance_id": instance_id,
            "message": str(e)
        }


# ---------------------------
# FIND IDLE EC2
# ---------------------------
def find_idle_instances():
    try:
        ec2 = get_client("ec2", REGION)
        cw = get_client("cloudwatch", REGION)

        if not ec2 or not cw:
            return []

        response = ec2.describe_instances()
        idle = []

        for res in response.get("Reservations", []):
            for inst in res.get("Instances", []):

                if inst["State"]["Name"] != "running":
                    continue

                iid = inst["InstanceId"]
                itype = inst["InstanceType"]

                metrics = cw.get_metric_statistics(
                    Namespace="AWS/EC2",
                    MetricName="CPUUtilization",
                    Dimensions=[{"Name": "InstanceId", "Value": iid}],
                    StartTime=datetime.utcnow() - timedelta(hours=1),
                    EndTime=datetime.utcnow(),
                    Period=3600,
                    Statistics=["Average"]
                )

                if not metrics.get("Datapoints"):
                    continue

                cpu = sorted(metrics["Datapoints"], key=lambda x: x["Timestamp"])[-1]["Average"]

                if cpu < 5:
                    idle.append({
                        "instance_id": iid,
                        "instance_type": itype,
                        "cpu": round(cpu, 2)
                    })

        return idle

    except Exception as e:
        print("[ERROR] Idle EC2:", e)
        return []


# ---------------------------
# ANALYZE (MAIN LOGIC)
# ---------------------------
def analyze_account():
    try:
        cost_data = get_aws_cost()
        services = get_cost_by_service()["services"]
        idle = find_idle_instances()

        issues = []

        # Simple waste detection
        for s in services:
            if "EC2 - Other" in s["service"]:
                issues.append({
                    "type": "hidden_cost",
                    "service": s["service"],
                    "estimated_waste_usd_per_month": round(s["cost_usd"] * 0.3, 2)
                })

        # Idle EC2
        for inst in idle:
            issues.append({
                "type": "idle_ec2",
                "resource_id": inst["instance_id"],
                "estimated_waste_usd_per_month": 7.5
            })

        total = round(sum(i["estimated_waste_usd_per_month"] for i in issues), 2)

        demo_mode = False

        # DEMO MODE
        if total == 0:
            demo_mode = True
            issues = [
                {
                    "type": "idle_ec2",
                    "resource_id": "i-demo123",
                    "estimated_waste_usd_per_month": 7.5
                },
                {
                    "type": "hidden_cost",
                    "service": "EBS",
                    "estimated_waste_usd_per_month": 3.0
                }
            ]
            total = 10

        your_fee = round(total * 0.2, 2)

        return {
            "summary": cost_data["summary"],
            "issues_found": len(issues),
            "potential_savings_usd_per_month": total,
            "potential_savings_inr_per_month": round(total * USD_TO_INR, 2),
            "your_fee_inr": round(your_fee * USD_TO_INR, 2),
            "demo_mode": demo_mode,
            "issues": issues
        }

    except Exception as e:
        print("[ERROR] Analyze:", e)
        return {
            "summary": {},
            "issues_found": 0,
            "potential_savings_usd_per_month": 0,
            "potential_savings_inr_per_month": 0,
            "your_fee_inr": 0,
            "demo_mode": True,
            "issues": []
        }