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
