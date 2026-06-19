# Project Learnings

This file records what worked, what broke, and patterns to remember.

Read this before starting each task.

---

## 2026-06-08 - Project Setup

- What worked: Created ScreenOdds as a separate repo so `aimodelodds` remains intact.
- What broke: No breakage yet.
- Files touched: `AGENTS.md`, `CLAUDE.md`, `.Codex/learnings.md`, design and plan docs.
- Pattern to remember: For entertainment SEO, target specific awards/reality/Polymarket pages; avoid generic `movie odds`.

## 2026-06-08 - Launch Build and Deployment

- What worked: Kie.ai `gpt-image-2-text-to-image` generated strong editorial entertainment visuals when prompts banned logos, text, recognizable faces, and brand symbols.
- What broke: One Kie job exceeded the initial 240s timeout. The launch script now uses a 420s timeout and skips existing images on rerun.
- What worked: Vercel REST project creation and `/v13/deployments` with `gitSource` deployed the GitHub repo successfully.
- What broke: `GET /v13/deployments/<id>` returned `not_found` for status polling. Listing deployments with `/v6/deployments?projectId=<project>` returned the correct `READY` state.
- What broke: New Vercel deployments were protected by Vercel Authentication until `ssoProtection` was patched to `null`.
- Pattern to remember: Domain attachment can be verified in Vercel while public DNS still does not resolve; use `/v6/domains/<domain>/config` for the required DNS records.

## 2026-06-08 - Netlify Correction

- What worked: `screenodds.com` already existed as a Netlify DNS zone under account `thevinylbyte`, so the correct canonical host is Netlify, not Vercel.
- What worked: Created Netlify site `screenodds`, attached `screenodds.com` and `www.screenodds.com`, and deployed with `netlify deploy --prod --site 5700712b-37ac-4967-b3a4-9231d35efeda`.
- What broke: The first Netlify deploy failed in `@netlify/plugin-nextjs` with `Failed publishing static content` because a local ScreenOdds `next dev` process was still running and locking `.next` on Windows.
- Pattern to remember: Before Netlify deploys from Windows, stop local dev servers for the same repo, then run the deploy. Keep `netlify.toml` and `@netlify/plugin-nextjs` committed for reproducible Next.js runtime behavior.

## 2026-06-09 - Authority Content Implementation

- What worked: Migrated launch guides into JSON-backed content files and added `/news`, `/oscars`, DataForSEO keyword coverage, Jina scan reports, TMDb media tooling, and Kie infographic tooling without breaking the existing blog/market pages.
- What worked: `npm run lint`, `npm run test`, and `npm run build` all pass. Local production checks confirmed `/news`, `/blog`, `/oscars`, and the June 9 awards article render expected titles/content.
- What broke: Netlify production deploy is blocked because both stored shared-env Netlify tokens return 404 for site `5700712b-37ac-4967-b3a4-9231d35efeda` and account slug `thevinylbyte`; live `/news` remains 404 until a token with access to the ScreenOdds Netlify site is added.
- Pattern to remember: Verify Netlify token access with `GET /api/v1/sites/<siteId>` before running deploys. If it returns 404, the token cannot deploy this site regardless of local `.netlify/state.json`.

## 2026-06-10 - Entertainment Provider API Signals

- What worked: TMDb and TVmaze keys in `C:\Users\longl\Desktop\Shared-Sync\.env` verified live and now power market-page external signal panels with deterministic fallbacks.
- What broke: The supplied OMDb key returns HTTP 401 over both HTTP and HTTPS; keep OMDb optional and let movie/box-office pages fall back until the key is activated or replaced.
- Pattern to remember: Clear `.next` before rendered verification when changing SSG provider logic; a clean rebuild showed live TMDb/TVmaze labels after stale static output initially masked the change.
- What worked: Netlify deploy access now works with the `THEVINYLBYTE` token, and production deploy `6a2960300294f2411b524353` went live after stopping the lingering ScreenOdds `next start -p 3002` process.
- Pattern to remember: Before Netlify deploys, search Node command lines for `screenodds` as well as checking the intended preview port; a hidden Next process on another port can still lock `.next` and trigger `Failed publishing static content`.

## 2026-06-11 - Keyword Cluster Article Batch

- What worked: Adding new evergreen guides as JSON files under `content/guides/` automatically generated the new `/blog/*` routes, sitemap entries, metadata, and article pages without routing changes.
- What broke: `src/lib/articles.test.ts` was pinned to the original five launch article slugs, so new published guides require updating that registry expectation.
- Pattern to remember: Netlify deploys for this site need `NETLIFY_PERSONAL_ACCESS_TOKEN_THEVINYLBYTE`; the generic Netlify token returns `Unauthorized: could not retrieve project`.

## 2026-06-11 - Parlay and xAI Provider Setup

- What worked: Parlay `/v1/event-markets/search` can discover relevant entertainment markets for `love island`, `box office`, `academy awards`, and `highest grossing movie` with `X-API-Key` auth; keep the key out of URLs.
- What worked: xAI docs confirm X Search can access real-time X posts, but it is billed as a server-side tool invocation, so do not call it during page builds.
- Pattern to remember: Treat Parlay and xAI as optional signal layers. They should enrich pages/scripts when keys are present but never block static builds or replace deterministic ScreenOdds fallbacks.

## 2026-06-11 - Full Page Crawl Fix

- What worked: A production crawl that strips scripts before checking visible error text avoids false positives from Next.js serialized `notFound` payloads.
- What broke: Live Polymarket cards from hub/home pages linked to local `/markets/*` routes that are not generated for non-seeded markets, creating internal 404s.
- Pattern to remember: Seeded fallback markets can link to local detail pages; live Polymarket-derived cards need to link to their external source URL unless a local detail page is explicitly generated.

## 2026-06-13 - Owned Network Cross-Linking

- What worked: A typed `site-network` registry plus a reusable component keeps owned-site links topical instead of adding a sitewide footer block.
- What broke: Stale `.next` HTML initially hid that `gridodds.com` was missing from the generated homepage.
- Pattern to remember: After changing static registry data used by SSG pages, remove `.next` and run a clean build before checking generated HTML.

## 2026-06-13 - Daily News Cron Gate

- What worked: A separate `news-quality-gate` module makes daily publish/draft/discard decisions testable instead of burying SEO rules in the cron script.
- What broke: GitHub Actions `git diff` would miss newly generated JSON files because untracked files are ignored.
- Pattern to remember: Use `git status --porcelain -- content/news reports/news-research` when a workflow needs to detect newly generated content files.

## 2026-06-14 - GitHub Actions Locale Formatting

- What worked: Manually triggering the daily cron exposed CI-only behavior before the scheduled run.
- What broke: `Intl.NumberFormat` compact currency rendered `$37` on Windows but `$37.0` on Ubuntu for a sub-$1K Kalshi volume label.
- Pattern to remember: For display strings asserted in tests, avoid compact `Intl.NumberFormat` for small currency values or force a deterministic formatting branch.

## 2026-06-19 - Niche Keyword Article Planning

- What worked: A fresh DataForSEO topical pass plus an exact keyword overview pass surfaced low-KD ScreenOdds opportunities such as `polymarket best actor`, `survivor winner odds`, and `dancing with the stars odds`.
- What broke: The topical script's static target map marked several already-published guides as `build`, including Polymarket Golden Globes, Grammys, Love Island, and Oscars 2026.
- Pattern to remember: Before creating new article files from DataForSEO output, compare target URLs against `content/guides/` and convert already-covered intents into refresh/internal-link tasks to avoid cannibalization.

## 2026-06-19 - Guide Media Rendering

- What worked: New guide JSON files can reference Jina screenshots and Kie-generated infographics under `public/blog/{slug}/...`, and the existing sitemap/static route generation picks them up automatically.
- What broke: The blog article page previously rendered only the hero image and ignored `inlineImages` and `infographics`, so adding media metadata alone would not show the assets.
- Pattern to remember: When adding content visuals, verify both sides: local files exist above minimum size and the rendered `.next` route contains the screenshot/infographic paths.

## 2026-06-19 - ScreenOdds GSC Setup

- What worked: The shared GSC submitter can generate a Google verification token and IndexNow key for ScreenOdds once the site is live on Netlify.
- What broke: ScreenOdds was not in the verified GSC property list, so the global submit run skipped it even though the production sitemap was valid.
- Pattern to remember: For new Netlify SEO sites, add `metadata.verification.google`, deploy it, run `submit.py verify`, and only then expect `submit.py submit` to include the domain.
