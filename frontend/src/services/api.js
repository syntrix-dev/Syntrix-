const API_BASE = process.env.REACT_APP_API_BASE;
const API_KEY  = process.env.REACT_APP_API_KEY;

if (!API_BASE || !API_KEY) {
  console.error(
    "[Syntrix] REACT_APP_API_BASE or REACT_APP_API_KEY is not set.\n" +
    "Copy .env.example to .env.local and fill in the values."
  );
}

const REQUEST_TIMEOUT_MS = 15_000;

export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        ...(options.headers || {}),
      },
      credentials: "omit",
    });

    clearTimeout(timer);

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body.detail || body.error || "";
      } catch (_) {}

      const err = new Error(detail || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      const timeout = new Error("Request timed out after 15 s");
      timeout.status = 408;
      throw timeout;
    }
    throw err;
  }
}

export const getCost          = () => apiFetch("/cost");
export const getCostByService = () => apiFetch("/cost-by-service");
export const getIdleEc2       = () => apiFetch("/waste/idle-ec2");
export const getAnalysis      = () => apiFetch("/analyze");
export const stopEc2Instance  = (instanceId) =>
  apiFetch(`/fix/stop-ec2?instance_id=${encodeURIComponent(instanceId)}`);

export const USD_TO_INR = 83;