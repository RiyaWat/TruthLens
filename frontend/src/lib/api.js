import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const sessionId = () => {
  let s = localStorage.getItem("tl_session");
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem("tl_session", s);
  }
  return s;
};

const cx = axios.create({ baseURL: API, timeout: 120000 });

// Make rate-limit errors human-friendly. The backend returns
// detail = { error, scope, window, limit, used, retry_after_sec, message }
cx.interceptors.response.use(
  (r) => r,
  (err) => {
    const d = err?.response?.data?.detail;
    if (err?.response?.status === 429 && d && typeof d === "object" && d.message) {
      err.response.data.detail = d.message;
      err.rateLimitInfo = d;
    }
    return Promise.reject(err);
  }
);

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
