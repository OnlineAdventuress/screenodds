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
