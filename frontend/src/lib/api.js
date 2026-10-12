import axios from "axios";

const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
export const API = `${BACKEND}/api`;

export const sessionId = () => {
  let s = localStorage.getItem("tl_session");
  if (!s) {
    s = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("tl_session", s);
  }
  return s;
};

const cx = axios.create({ baseURL: API, timeout: 120000 });

// ---- Free-tier wake-up handling ----
// The free backend sleeps after ~15 min idle; the first request then takes ~30 s
// (or fails while it boots). We show a banner and quietly retry.
let waking = false;
const setWaking = (v) => {
  if (waking === v) return;
  waking = v;
  window.dispatchEvent(new Event(v ? "truthlens:waking" : "truthlens:awake"));
};
export const isServerWaking = () => waking;

const SLOW_MS = 4000;
const MAX_RETRIES = 8; // ~60 s total
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A "waking" failure = no response at all (connection refused / CORS-less proxy
// page while booting) or a gateway error. Our own friendly 503s carry a JSON
// `detail`, so they are NOT retried; timeouts on long analyses are not retried either.
const isWakeError = (err) => {
  if (err?.code === "ECONNABORTED") return false;
  const res = err?.response;
  if (!res) return true;
  if (res.status === 502 || res.status === 504) return true;
  if (res.status === 503 && !(res.data && res.data.detail)) return true;
  return false;
};

// Only suspect a sleeping server if we haven't heard from it recently, so a
// normal (slow-ish) AI analysis doesn't trigger the banner.
let lastOk = 0;
const IDLE_MS = 10 * 60 * 1000;

cx.interceptors.request.use((config) => {
  if (!config._slowTimer && Date.now() - lastOk > IDLE_MS) {
    config._slowTimer = setTimeout(() => setWaking(true), SLOW_MS);
  }
  return config;
});

cx.interceptors.response.use(
  (r) => {
    lastOk = Date.now();
    clearTimeout(r.config._slowTimer);
    setWaking(false);
    return r;
  },
  async (err) => {
    const config = err?.config;
    if (config && isWakeError(err) && (config._retries || 0) < MAX_RETRIES) {
      config._retries = (config._retries || 0) + 1;
      setWaking(true);
      await sleep(Math.min(2000 + config._retries * 1000, 8000));
      return cx(config);
    }
    if (config) clearTimeout(config._slowTimer);
    if (err?.response) lastOk = Date.now();
    setWaking(false);

    // Make errors human-friendly for the toasts (they read response.data.detail).
    const res = err?.response;
    const d = res?.data?.detail;
    if (res?.status === 429 && d && typeof d === "object" && d.message) {
      res.data.detail = d.message;
      err.rateLimitInfo = d;
    } else if (res && d && typeof d === "object") {
      res.data.detail = d.message || "Something went wrong. Please try again.";
    } else if (res && !d) {
      res.data = { detail: "Analysis is temporarily unavailable. Please try again in a few minutes." };
    } else if (!res) {
      err.response = {
        status: 0,
        data: {
          detail: err?.code === "ECONNABORTED"
            ? "That took too long. Please try again with a smaller file."
            : "Can't reach the TruthLens server right now. Please try again in a minute.",
        },
      };
    }
    return Promise.reject(err);
  }
);

// Ping the backend as soon as the app loads so a sleeping server starts waking
// while the visitor reads the landing page.
export const warmUp = () => cx.get("/health").then((r) => r.data).catch(() => null);

export const fetchUsage = () =>
  cx.get(`/usage?session_id=${sessionId()}`).then(r => r.data);

export const analyzeText = (content) =>
  cx.post("/analyze/text", { session_id: sessionId(), content }).then(r => r.data);

export const analyzeImage = (image_base64, filename) =>
  cx.post("/analyze/image", { session_id: sessionId(), image_base64, filename }).then(r => r.data);

export const analyzeVideo = (video_base64, filename) =>
  cx.post("/analyze/video", { session_id: sessionId(), video_base64, filename }).then(r => r.data);

export const analyzeUrl = (url) =>
  cx.post("/analyze/url", { session_id: sessionId(), url }).then(r => r.data);

export const fetchScans = (limit = 12) =>
  cx.get(`/scans?session_id=${sessionId()}&limit=${limit}`).then(r => r.data);

export const fetchScan = (id) =>
  cx.get(`/scans/${id}`).then(r => r.data);

export const fetchStats = () => cx.get("/stats").then(r => r.data);

export const compareScan = (items) =>
  cx.post("/analyze/compare", { session_id: sessionId(), items }).then(r => r.data);

export const bulkScan = (items) =>
  cx.post("/analyze/bulk", { session_id: sessionId(), items }).then(r => r.data);

export const getSettings = () =>
  cx.get(`/settings/${sessionId()}`).then(r => r.data);

export const saveSettings = (webhook_url) =>
  cx.post("/settings", { session_id: sessionId(), webhook_url: webhook_url || null }).then(r => r.data);

export const testWebhook = () =>
  cx.post(`/settings/${sessionId()}/test-webhook`).then(r => r.data);

export const pdfUrl = (id) => `${API}/scans/${id}/pdf`;
export const ogUrl = (id) => `${API}/scans/${id}/og.png`;
export const fileUrl = (path) => `${API}/files/${path}`;

export const extensionUrl = `${API}/extension/download`;

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
