// TruthLens content script — injected overlay for in-page verdict
(function () {
  const ID = "tl-overlay-root";

  function ensureRoot() {
    let r = document.getElementById(ID);
    if (r) return r;
    r = document.createElement("div");
    r.id = ID;
    document.documentElement.appendChild(r);
    return r;
  }

  function colorFor(cls) {
    return ({ HUMAN: "#00FF66", AI: "#FFB800", DEEPFAKE: "#FF3B30", UNCERTAIN: "#A1A1AA" })[cls] || "#A1A1AA";
  }

  function close() {
    const r = document.getElementById(ID);
    if (r) r.innerHTML = "";
  }

  function render({ status, scan, error, kind }) {
    const r = ensureRoot();
    if (status === "scanning") {
      r.innerHTML = `
        <div class="tl-card tl-anim-in">
          <div class="tl-row">
            <span class="tl-dot tl-pulse"></span>
            <span class="tl-mono">TRUTHLENS · SCANNING ${kind.toUpperCase()}</span>
            <button class="tl-x" aria-label="close">×</button>
          </div>
          <div class="tl-laser-wrap"><div class="tl-laser"></div></div>
          <p class="tl-muted">Examining forensic markers…</p>
        </div>`;
    } else if (status === "error") {
      r.innerHTML = `
        <div class="tl-card tl-anim-in" style="border-color:#FF3B3055">
          <div class="tl-row">
            <span class="tl-mono" style="color:#FF3B30">// ERROR</span>
            <button class="tl-x" aria-label="close">×</button>
          </div>
          <p class="tl-muted">${(scan && scan.detail) || error || "Analysis failed"}</p>
        </div>`;
    } else {
      const c = colorFor(scan.classification);
      r.innerHTML = `
        <div class="tl-card tl-anim-in" style="border-color:${c}55">
          <div class="tl-row">
            <span class="tl-mono">TRUTHLENS · ${kind.toUpperCase()}</span>
            <button class="tl-x" aria-label="close">×</button>
          </div>
          <div class="tl-grid">
            <div>
              <p class="tl-tag" style="border-color:${c};color:${c}">${scan.classification}</p>
              <p class="tl-summary">${escapeHtml(scan.summary || "")}</p>
            </div>
            <div class="tl-num-wrap">
              <p class="tl-label">SYNTHETIC</p>
              <p class="tl-num" style="color:${c}">${scan.score}<span>%</span></p>
              <div class="tl-bar"><div style="width:${scan.score}%;background:${c}"></div></div>
              <p class="tl-label" style="margin-top:6px">CONFIDENCE · ${scan.confidence}%</p>
            </div>
          </div>
          <p class="tl-reason">${escapeHtml(scan.reasoning || "")}</p>
        </div>`;
    }
    const x = r.querySelector(".tl-x");
    if (x) x.addEventListener("click", close);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "tl-overlay") {
      render(msg);
    }
  });
})();
