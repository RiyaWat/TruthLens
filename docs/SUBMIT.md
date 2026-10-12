# Chrome Web Store — TruthLens Submission Checklist

> **Why I can't click "Submit" for you**: The Chrome Web Store requires *your* logged-in
> Google Developer account and *your* payment of the one-time **$5** registration fee.
> Everything below is ready — you just need to upload it from your browser.

---

## 1 · Pre-flight (one-time, ~5 min)

1. Go to **https://chrome.google.com/webstore/devconsole** and sign in with the Google
   account that should own the listing.
2. If you don't have a developer account yet, click **"Pay registration fee"** ($5,
   one-time) and follow the prompts.
3. Verify your email if prompted.

---

## 2 · Open the dashboard and start a new item

1. In the dev console, click **"Add new item"** (top right).
2. Drop **`dist/truthlens-extension.zip`** into the upload box.
   - Same zip is also live at: `GET /api/extension/download` on the deployed app.
   - Manifest V3, signed nothing, MV3-compliant icons (16/32/48/128/256), full source.
3. Wait for upload + automated checks to finish (10–20 s).

---

## 3 · Fill the **Store listing** tab

| Field | Value (copy-paste) |
| --- | --- |
| **Item name** | TruthLens — Deepfake & AI Detector |
| **Summary (132 chars)** | `Forensic counter-deepfake. Right-click any image, text, or page to get an instant verdict — HUMAN / AI / DEEPFAKE / UNCERTAIN.` |
| **Detailed description** | Paste the **"Detailed description"** section from `docs/store-listing.md` (already formatted). |
| **Category** | Productivity (primary) · Tools (secondary) |
| **Language** | English (United States) |

---

## 4 · Upload images

Upload these from `docs/screenshots/`. The dashboard accepts PNG up to 10 MB
each — none of yours exceed 1 MB.

**Required**
- **Screenshots (1–5 of these are required, you have 8)** — 1280×800 PNG:
  - `01-hero.png`
  - `02-analyze.png`
  - `03-verdict.png`
  - `04-compare.png`
  - `05-bulk.png`
  - `06-history.png`
  - `07-extension-popup.png`
  - `08-extension-overlay.png`

**Recommended (boosts conversion in store search)**
- **Small promo tile** — `promo-440x280.png` (440×280)
- **Marquee** — `marquee-1400x560.png` (1400×560)

---

## 5 · Privacy practices tab

1. **Single purpose** — paste:
   ```
   TruthLens detects AI-generated and deepfake content the user encounters on the web
   and presents a forensic verdict (HUMAN / AI / DEEPFAKE / UNCERTAIN) with reasoning.
   ```

2. **Permissions justification** (the dev console asks one box per permission). Use the
   strings already in `docs/store-listing.md` ▸ "Permissions justification":
   - `contextMenus` — adds "Scan this image / selected text / page" right-click items
   - `activeTab` — read the URL of the current tab when the user clicks "Scan this page"
   - `storage` — persist user settings (API base, anonymous session id)
   - `scripting` — inject the verdict overlay content script when the user invokes a scan
   - `<all_urls>` host permission — the extension must work on any site the user visits

3. **Privacy policy URL** — paste:
   ```
   https://YOUR-TRUTHLENS-DOMAIN/privacy
   ```
   This serves the policy from `docs/privacy.md` rendered by `PrivacyPage.jsx`.
   It already publicly resolves — verify in any browser before submitting.

4. **Data usage disclosures** — tick:
   - Personally identifiable information: **No**
   - Health information: **No**
   - Financial info: **No**
   - Authentication info: **No**
   - Personal communications: **No**
   - Location: **No**
   - Web history: **No**
   - User activity: **Yes** — "Submitted content for analysis (text/image/video/URL) and the resulting verdict"
   - Website content: **Yes** — "Page text/URL submitted to the analysis backend when the user invokes a scan"
5. **Use of data** — tick the boxes that match your actual flow:
   - "I do not use or transfer user data for purposes unrelated to my item's single purpose" ✅
   - "I do not use or transfer user data to determine creditworthiness" ✅
   - "I do not sell user data to third parties" ✅

---

## 6 · Distribution

- **Visibility**: Public
- **Regions**: All regions (default)
- **Pricing**: Free

---

## 7 · Submit for review

Click **"Submit for review"**. Initial reviews typically land within **2–7 days**.
Common reasons for rejection (already addressed in this build):
- ✅ Manifest V3 (you're on MV3)
- ✅ Single purpose declared and matches code (forensic content detection)
- ✅ Permissions justified one-by-one
- ✅ Public privacy policy URL works
- ✅ No remote code execution (all logic in extension or your backend)

---

## Files in this submission bundle

```
dist/
  truthlens-extension.zip                 ← upload to "Item ZIP" box
  truthlens-store-bundle.zip              ← convenience: everything below in a single zip

docs/
  store-listing.md                        ← all the copy
  privacy.md                              ← source of /privacy page

docs/screenshots/
  01-hero.png ... 08-extension-overlay.png   ← 8 × 1280×800
  promo-440x280.png
  marquee-1400x560.png
```

---

## Privacy policy URL — sanity check

Before clicking "Submit for review", open this in an incognito window:

> **https://YOUR-TRUTHLENS-DOMAIN/privacy**

You should see the full 9-section TruthLens privacy policy. If you intend to migrate to
a custom domain (e.g., `truthlens.app`), update the URL in the dev console to
`https://truthlens.app/privacy` and update the `mailto:` addresses in
`docs/privacy.md`.
