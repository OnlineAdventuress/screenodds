# ScreenOdds Niche Article Plan - 2026-06-19

## Data Sources

- `npm run keywords:topical` refreshed the DataForSEO topical authority report and returned 47 prioritized opportunities across six clusters.
- A second DataForSEO keyword overview pass checked exact niche candidates for Oscars categories, box office, streaming, and reality TV winner odds.
- Existing guide registry was checked against `content/guides/` to avoid building duplicate pages for already-covered search intent.

## Cannibalization Rules

- Do not build `/blog/oscars-polymarket`; fold that term into `/blog/polymarket-oscars-odds`.
- Do not build a generic `/blog/polymarket-oscars-best-picture`; use `/markets/polymarket-oscars-best-picture` and `/blog/best-picture-odds`.
- Do not build `/blog/polymarket-oscars-2025`; the query is stale and should only be handled as historical context inside active Oscars content.
- Do not build typo pages for `pollymarket` unless future DataForSEO volume proves demand. Mention only the correct `Polymarket` spelling in public copy.
- Do not create separate generic Grammy or Golden Globes pages yet. Refresh existing `/blog/polymarket-grammys` and `/blog/polymarket-golden-globes` first because they can capture the broader low-KD terms without splitting authority.
- Do not target generic `movie odds`; prior research found the SERP is polluted by the film title *Against All Odds*.

## Batch 1: Build Next

| Priority | Article | Primary Keyword | Volume | KD | Secondary Targets | Why This Page |
|---:|---|---|---:|---:|---|---|
| 1 | Best Actor Oscars Odds | `best actor oscars odds` | 1300 | 12 | `polymarket best actor` 210/KD 0, `polymarket oscars best actor` 30/KD 0 | High-volume category page that does not duplicate Best Picture or the Oscars hub. |
| 2 | Survivor Odds | `survivor odds` | 210 | 0 | `survivor winner odds` 170/KD 2 | Reality TV authority page with clear winner-market intent and low difficulty. |
| 3 | Dancing With the Stars Odds | `dancing with the stars odds` | 210 | 0 | `dancing with the stars winner odds` 20/KD 0 | Low-KD reality TV page with recurring seasonal demand. |
| 4 | Polymarket Netflix Odds | `polymarket netflix` | 70 | 0 | `netflix odds`, `streaming odds`, TV hub terms | Owns the streaming prediction-market angle without overloading `/tv`. |
| 5 | Tony Awards Odds | `tony awards odds` | 70 | 0 | Broadway awards odds, Tonys prediction markets | Low-KD awards expansion that broadens authority beyond Oscars/Grammys. |
| 6 | Weekend Box Office Predictions | `weekend box office predictions` | 2400 | 32 | `movie box office predictions` 20/KD 23, opening weekend predictions | Higher KD, but essential for box office authority and weekly news linking. |

## Batch 2: Build After Batch 1

| Priority | Article | Primary Keyword | Volume | KD | Secondary Targets | Notes |
|---:|---|---|---:|---:|---|---|
| 7 | Emmy Awards Odds | `emmy odds` | 210 | 13 | `emmy awards odds` 20/KD 12, `polymarket emmys` 10/KD n/a | Good awards bridge between Oscars and TV. |
| 8 | I'm a Celebrity Odds | `i'm a celebrity odds` | 20 | 0 | winner odds, public vote odds | Small but clean reality TV long tail. |
| 9 | The Voice Odds | `the voice odds` | 20 | 0 | `the voice winner odds` 10/KD 0 | Useful reality TV supporting page. |
| 10 | America's Got Talent Odds | `america's got talent odds` | 20 | 0 | AGT winner odds, finale odds | Small but very low competition. |
| 11 | Best Actress Oscars Odds | `polymarket best actress` | 30 | 6 | `best actress oscars odds` 10/KD 6 | Category-specific Oscars support page. |
| 12 | Best Director Oscars Odds | `best director odds` | 40 | 19 | `polymarket best director` 10/KD n/a | Lower volume, but useful for Oscars category depth. |
| 13 | BAFTA Odds | `bafta odds` | 10 | 11 | BAFTA prediction markets, BAFTA Oscar signals | Awards authority support page; publish closer to season. |

## Existing Pages to Refresh Instead of Rebuilding

| Page | Add/Strengthen Targets | Action |
|---|---|---|
| `/blog/polymarket-oscars-odds` | `polymarket oscars` 720/KD 0, `oscars polymarket` 140/KD 0 | Add current market modules, category-page links, and a short "Oscars Polymarket" wording section. |
| `/blog/polymarket-golden-globes` | `polymarket golden globes` 210/KD 1, `golden globes odds` 110/KD 0 | Expand generic Golden Globes odds copy before considering a separate page. |
| `/blog/polymarket-grammys` | `grammy odds` 320/KD 0, `grammy awards odds` 320/KD 5, `polymarket grammys` 140/KD 0 | Retitle/refresh sections to capture generic Grammy odds intent. |
| `/blog/polymarket-love-island` | `polymarket love island` 170/KD 0 | Keep as platform-specific; link to broad `/blog/love-island-odds`. |
| `/blog/love-island-odds` | `love island odds` 390/KD 2 | Keep broad reality TV intent; link to platform-specific Polymarket page. |
| `/blog/big-brother-odds` | `big brother odds` 140/KD 0, `big brother winner odds` 50/KD 0 | Add winner-odds section instead of creating a second Big Brother page. |
| `/blog/next-james-bond-actor-odds` | `james bond odds` 320/KD 6 | Add broader "James Bond odds" intro and internal links, but keep casting as the page's unique angle. |
| `/tv` | `polymarket netflix` 70/KD 0 | Add a streaming prediction-market module and link to the new Netflix guide. |

## Gold Standard Article Template

Each Batch 1 and Batch 2 article should use the ScreenOdds Type B evergreen template:

1. Title under 60 characters where possible, with the exact primary keyword near the front.
2. Meta description around 140-155 characters with the market angle and source-backed value proposition.
3. Opening answer paragraph that explains the search intent in plain language.
4. Market snapshot section: current ScreenOdds/Polymarket context, liquidity/volume caveat, and relevant related markets.
5. Signal stack section: official announcements, box office or ratings data, audience/social signals, and market movement.
6. "How to read the odds" section that explains implied probability and the value calculator context without presenting financial advice.
7. Catalyst calendar: nominations, episodes, finales, guild awards, release dates, box office weekends, or streaming drops.
8. FAQ section only for real search questions, not filler.
9. Article, BreadcrumbList, and FAQ JSON-LD where accurate.
10. Internal links to one hub, two related guides, one market page, and relevant news posts.

## Image and Infographic Requirements

- Featured image: Kie `gpt-image-2-text-to-image`, 16:9, editorial entertainment style, no logos, no recognizable faces, no text baked into the image.
- Real media: use TMDb/TVmaze/official sources where available; capture source URL, provider, credit text, usage note, and descriptive alt text.
- Infographics: 2-4 per evergreen guide, generated with Kie and reviewed before publishing.
- Suggested infographic set:
  - Odds-to-implied-probability explainer.
  - Signal stack for the specific market or show.
  - Catalyst calendar for the season or awards cycle.
  - Market movement checklist or decision tree.

## Internal Linking Plan

- Awards category articles link up to `/awards`, `/oscars`, `/blog/polymarket-oscars-odds`, and the relevant market page.
- Reality TV articles link up to `/reality-tv`, `/tv`, `/blog/love-island-odds`, `/blog/big-brother-odds`, and fresh news posts.
- Box office articles link up to `/box-office`, `/movies`, `/markets/highest-grossing-movie-in-2026`, and weekly box-office news.
- Streaming articles link up to `/tv`, `/movies`, `/blog/polymarket-love-island`, and related Netflix/streaming market modules.

## Publishing Order

1. Publish Batch 1 as six evergreen guides.
2. Refresh the seven existing pages listed above and add internal links to Batch 1.
3. Publish Batch 2 over the following two weeks.
4. Run `npm run keywords:topical` again and compare GSC impressions before adding any generic Grammy, Golden Globes, or broad Oscars odds pages.
