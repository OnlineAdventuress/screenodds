# Daily News Cron Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a daily ScreenOdds news automation that updates the site only when a candidate post is source-backed, useful, and low risk.

**Architecture:** Keep the Jina scan and daily news generator, but extract the publish decision into a tested `news-quality-gate` module. A GitHub Actions workflow runs daily, executes the routine in publish mode, verifies the app, and commits only when content/report files change.

**Tech Stack:** Node.js scripts, Vitest, GitHub Actions, Next.js, Netlify Git-triggered deploys.

---

### Task 1: Quality Gate

**Files:**
- Create: `scripts/news-quality-gate.mjs`
- Create: `scripts/news-quality-gate.test.mjs`

- [ ] Write tests for publish, draft, and discard decisions.
- [ ] Implement `evaluateNewsCandidate()` with source confidence, trusted source count, risk flag, market context, source, and usefulness checks.
- [ ] Export thresholds so future cron tuning is explicit.

### Task 2: Daily Routine Integration

**Files:**
- Modify: `scripts/daily-news-routine.mjs`

- [ ] Replace inline publish logic with `evaluateNewsCandidate()`.
- [ ] Write a daily decision report under `reports/news-research/`.
- [ ] Keep draft behavior for weak but reviewable posts.
- [ ] Do not write a post when the gate returns `discard`.

### Task 3: Scheduled Workflow

**Files:**
- Create: `.github/workflows/daily-screenodds-news.yml`

- [ ] Run daily around US entertainment-news hours.
- [ ] Run `npm ci`, `npm run news:daily -- --publish`, `npm run lint`, `npm run test`, and `npm run build`.
- [ ] Commit and push only when content/report files changed.
- [ ] Document required GitHub secrets in workflow comments.

### Task 4: Verification

**Files:**
- Modify: `.Codex/learnings.md`

- [ ] Run focused gate tests.
- [ ] Run full lint/test/build.
- [ ] Commit, push, and deploy or confirm Netlify picks up the Git commit.
