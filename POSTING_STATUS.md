# LedgerFlow — Posting Status Tracker (Live)
Main app: https://getledgerflow.vercel.app (Vercel — keep live)
Repo: https://github.com/sayandaswebdesigner/ca-flow-ai

> Marketplaces block bots — all require account + email/phone verify + human review (2-3 days). No API auto-post. Content is ready in `MARKETPLACE_LISTINGS.md` — 1 paste per site. This file tracks where posted + live URLs.

| # | Platform | Submission URL | Status | Live URL (after approval) | Notes |
|---|----------|----------------|--------|---------------------------|-------|
| 1 | **Vercel (main)** | — | ✅ LIVE | https://getledgerflow.vercel.app | SSO 302 — need to disable Deployment Protection for bot verification |
| 2 | **Render mirror** | https://dashboard.render.com/blueprint/new?repo=https://github.com/sayandaswebdesigner/ca-flow-ai | ⏳ Ready — 1 click free | `https://ca-flow-ai.onrender.com` (after click) | Free plan, uses `render.yaml:1`, auto-deploy on push |
| 3 | **Netlify mirror** | https://app.netlify.com/start/deploy?repository=https://github.com/sayandaswebdesigner/ca-flow-ai | ⏳ Ready — 1 click free | `https://getledgerflow.netlify.app` (after click) | Free 100GB, uses `netlify.toml:1` |
| 4 | **Cloudflare Pages mirror** | https://dash.cloudflare.com → Pages → Connect Git → `ca-flow-ai` | ⏳ Ready — 1 click free | `https://ca-flow-ai.pages.dev` (after click) | Free unlimited bandwidth |
| 5 | **SoftwareSuggest** | https://www.softwaresuggest.com/list-software | ⏳ Content ready — paste `MARKETPLACE_LISTINGS.md:5` | Will be `https://www.softwaresuggest.com/ledgerflow` (after 24h review) | Fastest win — Indian CAs search here first |
| 6 | **Capterra** | https://www.capterra.com/vendors/sign-up | ⏳ Content ready — paste `MARKETPLACE_LISTINGS.md:3` | Will be `https://www.capterra.com/p/ledgerflow` (after 2-3 day call verify) | They will call you — keep phone ready |
| 7 | **G2** | https://www.g2.com/products/new | ⏳ Content ready — paste `MARKETPLACE_LISTINGS.md:4` | Will be `https://www.g2.com/products/ledgerflow` (after review) | Needs 5 user reviews to rank |
| 8 | **CAclubindia.com Forum** | https://www.caclubindia.com/forum/ | ⏳ Content ready — paste `MARKETPLACE_LISTINGS.md:2` | Will be `https://www.caclubindia.com/forum/display.asp?cat_id=...` (instant) | Post title: `[Tool] LedgerFlow — Bank-to-Ledger...` |
| 9 | **CAclubindia.com Files** | https://www.caclubindia.com/share_files/ | ⏳ Content ready — upload 1-pager PDF | Will be `https://www.caclubindia.com/share_files/...` (instant) | Upload `LedgerFlow_Reconciliation_OS_for_CAs.pdf` |
| 10 | **Product Hunt** | https://www.producthunt.com/posts/new | ⏳ Content ready — paste `MARKETPLACE_LISTINGS.md:6` | Will be `https://www.producthunt.com/posts/ledgerflow` (after schedule) | Launch Tue-Thu 12:01 AM PST for max visibility |
| 11 | **Google Workspace Marketplace** | https://console.cloud.google.com | ⏳ Draft — needs Sheets Add-on wrapper | — | High value for CAs (Sheets) — phase 2 |
| 12 | **Microsoft AppSource** | https://partner.microsoft.com | ⏳ Draft — needs Excel Add-in wrapper | — | Phase 2 |

## How to post (30s per site, free)
1. Click Submission URL above
2. Create free vendor account (email verify)
3. Copy-paste from `MARKETPLACE_LISTINGS.md` section number shown in Notes
4. Upload 5 screenshots from `https://getledgerflow.vercel.app/dashboard` (1280x720) + 30s demo video
5. Submit → status updates here to ✅ + Live URL added after approval email

## Blocker
- Vercel SSO `302` blocks Capterra/G2/SoftwareSuggest bots. Fix: Vercel Dashboard → `ca-flow-ai` → Settings → Deployment Protection → Disable or `Only preview deployments`. Then `curl -I https://getledgerflow.vercel.app/` = `200`.

Last updated: 2026-09-08 — commit `3a1e78e` pushed to `main`. Mirrors auto-deploy on that commit once you click Render/Netlify/CF.

