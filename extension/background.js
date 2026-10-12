// TruthLens background service worker
const DEFAULT_API = "__BACKEND_URL__/api";

async function getApi() {
  const { apiBase } = await chrome.storage.sync.get(["apiBase"]);
  return apiBase || DEFAULT_API;
}

async function getSession() {
  let { sessionId } = await chrome.storage.sync.get(["sessionId"]);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    await chrome.storage.sync.set({ sessionId });
  }
  return sessionId;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "tl-scan-text",
    title: "TruthLens: Scan selected text",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "tl-scan-image",
    title: "TruthLens: Scan this image",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "tl-scan-page",
    title: "TruthLens: Scan this page (URL)",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const api = await getApi();
  const session = await getSession();
  const sendOverlay = (payload) =>
    chrome.tabs.sendMessage(tab.id, { type: "tl-overlay", ...payload });

  if (info.menuItemId === "tl-scan-text" && info.selectionText) {
    sendOverlay({ status: "scanning", kind: "text" });
    try {
      const res = await fetch(`${api}/analyze/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session, content: info.selectionText }),
      });
      const data = await res.json();
      sendOverlay({ status: res.ok ? "done" : "error", scan: data, kind: "text" });
    } catch (e) {
      sendOverlay({ status: "error", error: String(e), kind: "text" });
    }
  }

  if (info.menuItemId === "tl-scan-image" && info.srcUrl) {
    sendOverlay({ status: "scanning", kind: "image" });
    try {
      const r = await fetch(info.srcUrl);
      const blob = await r.blob();
      const b64 = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
          const s = fr.result;
          const c = s.indexOf(",");
          resolve(c >= 0 ? s.slice(c + 1) : s);
        };
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      const res = await fetch(`${api}/analyze/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session, image_base64: b64, filename: info.srcUrl.split("/").pop() }),
      });
      const data = await res.json();
      sendOverlay({ status: res.ok ? "done" : "error", scan: data, kind: "image" });
    } catch (e) {
      sendOverlay({ status: "error", error: String(e), kind: "image" });
    }
  }

  if (info.menuItemId === "tl-scan-page" && tab.url) {
    sendOverlay({ status: "scanning", kind: "url" });
    try {
      const res = await fetch(`${api}/analyze/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session, url: tab.url }),
      });
      const data = await res.json();
      sendOverlay({ status: res.ok ? "done" : "error", scan: data, kind: "url" });
    } catch (e) {
      sendOverlay({ status: "error", error: String(e), kind: "url" });
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "tl-popup-text") {
    (async () => {
      const api = await getApi();
      const session = await getSession();
      try {
        const res = await fetch(`${api}/analyze/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: session, content: msg.content }),
        });
        const data = await res.json();
        sendResponse({ ok: res.ok, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  if (msg.type === "tl-popup-url") {
    (async () => {
      const api = await getApi();
      const session = await getSession();
      try {
        const res = await fetch(`${api}/analyze/url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: session, url: msg.url }),
        });
        const data = await res.json();
        sendResponse({ ok: res.ok, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
});
