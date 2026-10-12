"""Capture 8 marketing screenshots for the Chrome Web Store listing.

Sizes:
  01-08 main promo: 1280x800 PNG (Chrome Web Store spec)
  07 popup:        320x460 PNG  (extension popup is small)
"""
import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TRUTHLENS_URL", "http://localhost:3000")
SID = "screenshot-seed"
OUT = Path("/app/docs/screenshots")
OUT.mkdir(parents=True, exist_ok=True)

# Chrome Web Store standard size
W, H = 1280, 800

# A "sample article" page that we'll render the in-page overlay onto
SAMPLE_ARTICLE = """
<!doctype html><html><head><meta charset="utf-8"><title>Tribune Daily — Manipulated celebrity photo goes viral</title>
<style>
  body{margin:0;background:#fff;color:#222;font:16px/1.55 Georgia,serif}
  header{background:#0c1320;color:#fff;padding:14px 32px;display:flex;align-items:center;gap:18px;font-family:'Helvetica Neue',sans-serif}
  header b{font-size:22px;letter-spacing:.04em}
  header nav{font-size:13px;color:#aab;display:flex;gap:18px;margin-left:auto}
  main{max-width:780px;margin:36px auto;padding:0 32px}
  h1{font-family:'Helvetica Neue',sans-serif;font-size:38px;line-height:1.1;letter-spacing:-0.01em;color:#101824}
  .meta{color:#778;font-size:13px;font-family:'Helvetica Neue',sans-serif;margin:10px 0 24px}
  img{width:100%;height:380px;object-fit:cover;background:#222;display:block;border-radius:2px}
  figcaption{font-size:13px;color:#888;font-style:italic;margin-top:8px}
  p{margin:18px 0}
</style></head><body>
<header><b>TRIBUNE DAILY</b> <nav><span>Politics</span><span>Tech</span><span>Culture</span><span>Opinion</span></nav></header>
<main>
  <h1>Manipulated celebrity photo goes viral overnight — experts say it's a deepfake</h1>
  <p class="meta">By Maya Costa  ·  Tech Desk  ·  4 min read</p>
  <figure>
    <img src="https://images.unsplash.com/photo-1545987796-200677ee1011?w=1200&amp;q=70" alt="">
    <figcaption>An image circulating widely on social media is now drawing scrutiny.</figcaption>
  </figure>
  <p>An image purporting to show a major public figure at a political rally has racked up over twelve million views in the past 36 hours. Multiple forensic investigators contacted the publication to flag inconsistencies in the lighting and skin texture.</p>
  <p>"The hands and the periphery of the jawline are showing classic diffusion-model artifacts," said one analyst. The original poster has not responded to a request for comment.</p>
</main></body></html>
"""

# A standalone HTML preview of the in-page overlay (matches /app/extension/content.css)
OVERLAY_HTML = """
<style>
  /* Basic re-implementation of the actual extension content.css for screenshot fidelity. */
  .root{position:fixed;top:16px;right:16px;z-index:9}
  .card{width:340px;background:#0E0E0E;color:#fff;border:1px solid rgba(255,59,48,.34);padding:16px;
        box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 30px rgba(0,229,255,.18);
        font-family:'IBM Plex Sans',system-ui,sans-serif}
  .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:#fff}
  .x{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.2);width:22px;height:22px;line-height:1;font-size:14px}
  .grid{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;margin-top:6px}
  .tag{display:inline-block;border:1px solid #FF3B30;color:#FF3B30;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.25em;font-weight:700;margin:0 0 6px}
  .summary{font-size:12px;color:rgba(255,255,255,.85);line-height:1.45;margin:0}
  .num-wrap{text-align:right;min-width:100px}
  .label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.4);margin:0}
  .num{font-family:'Chivo','Inter',sans-serif;font-weight:900;font-size:38px;line-height:1;margin:4px 0 6px;letter-spacing:-.04em;color:#FF3B30}
  .num span{font-size:14px;color:rgba(255,255,255,.4);margin-left:2px}
  .bar{width:100px;height:4px;background:rgba(255,255,255,.1);margin-left:auto}
  .bar>div{height:100%;background:#FF3B30}
  .reason{font-size:12px;color:rgba(255,255,255,.7);margin:12px 0 0;line-height:1.5;border-top:1px solid rgba(255,255,255,.08);padding-top:10px}
</style>
<div class="root">
<div class="card">
  <div class="row">
    <span class="mono">TRUTHLENS · IMAGE</span>
    <button class="x">×</button>
  </div>
  <div class="grid">
    <div>
      <p class="tag">DEEPFAKE</p>
      <p class="summary">Strong diffusion fingerprints in skin texture; right-hand fingers show characteristic warping.</p>
    </div>
    <div class="num-wrap">
      <p class="label">SYNTHETIC</p>
      <p class="num">87<span>%</span></p>
      <div class="bar"><div style="width:87%"></div></div>
      <p class="label" style="margin-top:6px">CONFIDENCE · 92%</p>
    </div>
  </div>
  <p class="reason">Frequency analysis reveals checkerboard artifacts consistent with diffusion-model upsampling. Lighting on the subject does not match the background light source. Iris reflections are inconsistent between eyes.</p>
</div></div>
"""


def shoot(page, name, w=W, h=H, wait=1500):
    page.set_viewport_size({"width": w, "height": h})
    page.wait_for_timeout(wait)
    out = OUT / name
    page.screenshot(path=str(out), full_page=False, type="png")
    print(f"  ✓ {name} ({w}x{h}) -> {out}")


def shoot_with_session(page, sid):
    """Inject the seeded session id into localStorage so /history shows scans."""
    page.add_init_script(f"""
        try {{
          localStorage.setItem('tl_session', '{sid}');
        }} catch(e) {{}}
    """)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        ctx = browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=2,  # retina-quality screenshots
        )
        # Seed session id so /history is non-empty
        ctx.add_init_script(f"try {{ localStorage.setItem('tl_session', '{SID}'); }} catch(e) {{}}")

        page = ctx.new_page()

        # 01 — Hero
        page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
        shoot(page, "01-hero.png", wait=3000)

        # 02 — Live Analysis dashboard mid-scan (laser visible)
        page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        # Fill some text and click analyze, then capture during the scanning state
        try:
            page.fill('[data-testid="text-input"]',
                      "As an AI language model, I am unable to provide real-time data, but I can leverage cutting-edge technologies to unlock unprecedented opportunities across various sectors.")
            page.evaluate("document.querySelector('#analyze').scrollIntoView({block:'start'})")
            page.wait_for_timeout(500)
            page.click('[data-testid="text-analyze-btn"]')
            # capture during loading (laser appears almost immediately)
            page.wait_for_selector('[data-testid="verdict-scanning"]', timeout=8000)
            page.wait_for_timeout(700)
            shoot(page, "02-analyze.png", wait=200)
        except Exception as e:
            print(f"  ! 02 fallback: {e}")
            shoot(page, "02-analyze.png", wait=200)

        # 03 — Verdict card
        try:
            page.wait_for_selector('[data-testid="verdict-card"]', timeout=45000)
            page.wait_for_timeout(1500)
            page.evaluate("document.querySelector('[data-testid=verdict-card]').scrollIntoView({block:'center'})")
            shoot(page, "03-verdict.png", wait=600)
        except Exception as e:
            print(f"  ! 03 failed: {e}")

        # 04 — Compare side-by-side. Run a real comparison so the result panel is shown.
        page.goto(f"{BASE}/compare", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        try:
            page.fill('[data-testid="compare-text-a"]',
                      "As an AI language model, I cannot provide real-time data, but I can help with general information. Furthermore, leveraging emerging paradigms enables stakeholders to unlock unprecedented opportunities across the digital landscape.")
            page.fill('[data-testid="compare-text-b"]',
                      "Got home late last night and the cat had absolutely destroyed the kitchen — flour bomb everywhere. Love him but seriously, who teaches a cat to open cabinets? Anyway, coffee time and laughing about it.")
            page.click('[data-testid="compare-run-btn"]')
            page.wait_for_selector('[data-testid="compare-result"]', timeout=90000)
            page.wait_for_timeout(1500)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight - 800)")
            shoot(page, "04-compare.png", wait=800)
        except Exception as e:
            print(f"  ! 04 failed: {e}")
            shoot(page, "04-compare.png", wait=400)

        # 05 — Bulk scan with results
        page.goto(f"{BASE}/bulk", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        try:
            # add 3 URL rows + 1 text row
            page.click('[data-testid="bulk-add-url"]')
            page.click('[data-testid="bulk-add-url"]')
            page.click('[data-testid="bulk-add-text"]')
            urls = page.query_selector_all('[data-testid^="bulk-item-"] input')
            if len(urls) >= 2:
                urls[0].fill("https://en.wikipedia.org/wiki/Deepfake")
                urls[1].fill("https://en.wikipedia.org/wiki/Photograph")
            ta = page.query_selector_all('[data-testid^="bulk-item-"] textarea')
            if ta:
                ta[0].fill("As an AI language model, I am unable to provide real-time data. In conclusion, leveraging cutting-edge technologies enables us to unlock unprecedented growth.")
            page.click('[data-testid="bulk-run-btn"]')
            page.wait_for_selector('[data-testid="bulk-results"]', timeout=120000)
            page.wait_for_timeout(2000)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight - 800)")
            shoot(page, "05-bulk.png", wait=800)
        except Exception as e:
            print(f"  ! 05 failed: {e}")
            shoot(page, "05-bulk.png", wait=400)

        # 06 — History page
        page.goto(f"{BASE}/history", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        shoot(page, "06-history.png", wait=600)

        # 07 — Extension popup (smaller viewport, file URL)
        popup_ctx = browser.new_context(viewport={"width": 360, "height": 480}, device_scale_factor=2)
        popup_page = popup_ctx.new_page()
        popup_page.goto("file:///app/extension/popup.html", wait_until="domcontentloaded")
        popup_page.wait_for_timeout(500)
        # populate the textarea with sample text and render a fake result for the screenshot
        popup_page.evaluate("""
        () => {
          document.querySelector('#text').value = 'As an AI language model, I am unable to provide real-time data...';
          const r = document.querySelector('#result');
          r.innerHTML = `
            <div class="r-card" style="border-color:#FFB800AA">
              <div class="r-row">
                <div>
                  <span class="r-tag" style="color:#FFB800;border-color:#FFB800">AI-GENERATED</span>
                  <p class="r-summary">Strong AI fingerprints — repetitive structure and cliché openings.</p>
                </div>
                <div><p class="r-num" style="color:#FFB800">94<span>%</span></p></div>
              </div>
              <div class="r-bar"><div style="width:94%;background:#FFB800"></div></div>
              <p class="r-reason">Cadence is metronomic, vocabulary heavy on phrases like "leveraging cutting-edge". Repetitive sentence-length pattern matches GPT-class output.</p>
            </div>`;
        }
        """)
        popup_page.set_viewport_size({"width": 360, "height": 480})
        popup_page.wait_for_timeout(500)
        out = OUT / "07-extension-popup.png"
        popup_page.screenshot(path=str(out), full_page=False, type="png")
        print(f"  ✓ 07-extension-popup.png (360x480) -> {out}")
        popup_ctx.close()

        # 08 — In-page verdict overlay on a sample news article
        article_ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=2)
        article_page = article_ctx.new_page()
        article_page.set_content(SAMPLE_ARTICLE, wait_until="domcontentloaded")
        article_page.wait_for_timeout(1200)  # give the unsplash image time
        article_page.evaluate(f"""
        () => {{
          const wrapper = document.createElement('div');
          wrapper.innerHTML = `{OVERLAY_HTML}`;
          document.body.appendChild(wrapper);
        }}
        """)
        article_page.wait_for_timeout(800)
        out = OUT / "08-extension-overlay.png"
        article_page.screenshot(path=str(out), full_page=False, type="png")
        print(f"  ✓ 08-extension-overlay.png (1280x800) -> {out}")
        article_ctx.close()

        ctx.close()
        browser.close()
        print("\nAll screenshots saved to /app/docs/screenshots/")


if __name__ == "__main__":
    main()
