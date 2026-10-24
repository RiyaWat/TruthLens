const $ = (s) => document.querySelector(s);

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".pane").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    document.querySelector(`[data-pane="${t.dataset.tab}"]`).classList.add("active");
  });
});

function colorFor(c) {
  return ({ HUMAN: "#00FF66", AI: "#FFB800", DEEPFAKE: "#FF3B30", UNCERTAIN: "#A1A1AA" })[c] || "#A1A1AA";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function renderResult({ ok, data, error }) {
  const r = $("#result");
  if (!ok) {
    r.innerHTML = `<div class="r-card" style="border-color:#FF3B3055"><div class="r-row"><span class="r-tag" style="color:#FF3B30;border-color:#FF3B30">ERROR</span></div><p class="r-reason">${escapeHtml((data && data.detail) || error || "Failed")}</p></div>`;
    return;
  }
  const c = colorFor(data.classification);
  r.innerHTML = `
    <div class="r-card" style="border-color:${c}55">
      <div class="r-row">
        <div>
          <span class="r-tag" style="color:${c};border-color:${c}">${data.classification}</span>
          <p class="r-summary">${escapeHtml(data.summary || "")}</p>
        </div>
        <div>
          <p class="r-num" style="color:${c}">${data.score}<span>%</span></p>
        </div>
      </div>
      <div class="r-bar"><div style="width:${data.score}%;background:${c}"></div></div>
      <p class="r-reason">${escapeHtml(data.reasoning || "")}</p>
    </div>`;
}

async function run(type, payloadKey, value, btn) {
  if (!value || (type === "tl-popup-text" && value.length < 20)) {
    renderResult({ ok: false, error: "Need at least 20 characters" });
    return;
  }
  if (type === "tl-popup-url" && !/^https?:\/\//.test(value)) {
    renderResult({ ok: false, error: "Need full URL with http(s)://" });
    return;
  }
  btn.disabled = true;
  btn.textContent = "ANALYZING…";
  const msg = { type, [payloadKey]: value };
  chrome.runtime.sendMessage(msg, (resp) => {
    btn.disabled = false;
    btn.textContent = "ANALYZE";
    if (chrome.runtime.lastError) {
      renderResult({ ok: false, error: chrome.runtime.lastError.message });
      return;
    }
    renderResult(resp || { ok: false, error: "No response" });
  });
}

$("#run-text").addEventListener("click", () => run("tl-popup-text", "content", $("#text").value.trim(), $("#run-text")));
$("#run-url").addEventListener("click", () => run("tl-popup-url", "url", $("#url").value.trim(), $("#run-url")));
$("#open-options").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
