from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.services.cost_service import (
    get_aws_cost,
    get_cost_by_service,
    stop_ec2_instance,
    find_idle_instances,
    analyze_account
)

app = FastAPI(title="Syntrix API", version="3.0")


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Syntrix running", "status": "ok"}


@app.get("/healthz")
def health():
    return {"status": "ok"}


@app.get("/cost")
def cost():
    return get_aws_cost()


@app.get("/cost-by-service")
def cost_service():
    return get_cost_by_service()


@app.get("/fix/stop-ec2")
def stop_ec2(instance_id: str = Query(...)):
    return stop_ec2_instance(instance_id)


@app.get("/waste/idle-ec2")
def idle():
    data = find_idle_instances()
    return {"count": len(data), "instances": data}


@app.get("/analyze")
def analyze():
    return analyze_account()