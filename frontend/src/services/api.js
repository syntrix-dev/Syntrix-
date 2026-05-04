export const API_BASE = 'http://localhost:8000';
export const USD_TO_INR = 83;

// ─── Demo data (used when DEMO_MODE = true) ───────────────────────────────────
export const DEMO_MODE = true; // Set to false when your backend is running

const DEMO_COST = {
  summary: { total_cost_usd: 142.38, average_daily_cost: 20.34 },
  daily: [
    { date: '2025-04-28', cost_usd: 18.2 },
    { date: '2025-04-29', cost_usd: 21.5 },
    { date: '2025-04-30', cost_usd: 19.8 },
    { date: '2025-05-01', cost_usd: 23.1 },
    { date: '2025-05-02', cost_usd: 20.0 },
    { date: '2025-05-03', cost_usd: 22.4 },
    { date: '2025-05-04', cost_usd: 17.38 },
  ],
};

const DEMO_SERVICES = {
  services: [
    { service: 'Amazon EC2', cost_usd: 62.4 },
    { service: 'Amazon RDS', cost_usd: 28.1 },
    { service: 'Amazon S3', cost_usd: 14.7 },
    { service: 'EC2 - Other', cost_usd: 11.2 },
    { service: 'Amazon CloudFront', cost_usd: 8.9 },
    { service: 'AWS Lambda', cost_usd: 5.3 },
    { service: 'Amazon CloudWatch', cost_usd: 4.2 },
    { service: 'Other Services', cost_usd: 7.58 },
  ],
};

const DEMO_ANALYZE = {
  summary: { total_cost_usd: 142.38, average_daily_cost: 20.34 },
  issues_found: 3,
  potential_savings_usd_per_month: 28.5,
  potential_savings_inr_per_month: 2365.5,
  your_fee_inr: 473.1,
  demo_mode: true,
  issues: [
    { type: 'idle_ec2', resource_id: 'i-0abc123def456', estimated_waste_usd_per_month: 7.5 },
    { type: 'idle_ec2', resource_id: 'i-0xyz789ghi012', estimated_waste_usd_per_month: 7.5 },
    { type: 'hidden_cost', service: 'EC2 - Other', estimated_waste_usd_per_month: 13.5 },
  ],
};

const DEMO_IDLE = {
  count: 2,
  instances: [
    { instance_id: 'i-0abc123def456', instance_type: 't3.medium', cpu: 1.2 },
    { instance_id: 'i-0xyz789ghi012', instance_type: 't2.small', cpu: 0.8 },
  ],
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────
async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function apiFetch(path) {
  if (DEMO_MODE) {
    await delay(500 + Math.random() * 400);
    if (path === '/cost') return DEMO_COST;
    if (path === '/cost-by-service') return DEMO_SERVICES;
    if (path === '/analyze') return DEMO_ANALYZE;
    if (path === '/waste/idle-ec2') return DEMO_IDLE;
    throw new Error('Unknown demo path');
  }
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function stopInstance(instanceId) {
  if (DEMO_MODE) {
    await delay(1200);
    return { status: 'success', instance_id: instanceId, message: 'Instance stopping' };
  }
  const res = await fetch(`${API_BASE}/fix/stop-ec2?instance_id=${instanceId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
