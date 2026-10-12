# TruthLens Privacy Policy

_Last updated: 2026-02-05_

## 1. What TruthLens does
TruthLens is a forensic counter-deepfake browser tool. It analyses **text, images, video, and URLs** you submit and returns a verdict (HUMAN / AI / DEEPFAKE / UNCERTAIN) with reasoning and forensic markers.

## 2. What we collect
- **Anonymous session id** (UUID) generated locally in your browser.
- **Content you submit** for scanning: text bodies, image bytes, page URLs, sampled video frames. This data is sent to our backend and to the chosen LLM provider for analysis.
- **Scan results** (score, classification, reasoning, markers, language) tied to your session id.
- **Aggregate counters** (total scans, deepfakes flagged) for the public stats bar — no per-user data is exposed.

## 3. What we do NOT collect
- Names, contact info, IP-based profiles, third-party advertising cookies, or marketing data.
- The Chrome extension never auto-fires — it only runs when **you** explicitly trigger it (popup click or right-click context menu).

## 4. Where data goes
- **Google (Gemini API)** — text, URL, image and video-frame forensic analysis.
- **The TruthLens database** — original image/video bytes are stored server-side (MongoDB) for the duration of your session, so reports can be re-rendered.
- **Your webhook URL** (optional) — if you configure one in Settings, we POST a JSON payload there when a DEEPFAKE is detected. You control that endpoint.

## 5. Retention & deletion
- Scans are retained while your session id remains in your browser's `localStorage`.
- Clearing site data severs the link between you and stored scans.
- To request hard deletion of stored bytes, email **privacy@truthlens.example** with your session id.

## 6. Security
- All traffic uses HTTPS.
- Object storage access goes only through our authenticated backend (no presigned public URLs).
- No passwords are stored. Optional email magic-link login is opt-in and does not require a password.

## 7. Children
TruthLens is not intended for children under 13.

## 8. Changes
We may update this policy. Material changes will be reflected on the `/privacy` page with a new "Last updated" date.

## 9. Contact
- Privacy questions: **privacy@truthlens.example**
- Security disclosures: **security@truthlens.example**
