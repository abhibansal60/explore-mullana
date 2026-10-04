# Explore Mullana: notes for agents

A free guide to Mullana (Ambala, Haryana) and the MMDU campus: https://mullana.abhibansal.dev. Owner: Abhinav Bansal (GitHub `abhibansal60`).

## Direction

Not a Google Maps clone. The goal is Mullana's living notice board, in three layers:

1. **Utility (built):** a directory you can trust. Owner-checked hours and numbers, open now, near me, Hindi labels, category-first home, compact rows, 3D buildings.
2. **Pulse (in preview):** "Today in Mullana", what is happening today and this week: temple aarti, kirtans and melas (Mata Bala Sundari Mandir is the big one), MMDU events, the weekly bazaar, new shops. Branch `night-build` (which includes `today-preview`) has real festival dates, weather and air, the day's tithi, a WhatsApp share, community events through a second Form, and guide pages. Live at https://night-build.explore-mullana.pages.dev. Not merged.
3. **People (later):** shop stories, local creators, contributor credits.

The town's news already lives on public Instagram accounts (mata.bala.sunderi.mandir 79K, mullana_vines 85K, mmdumullana 53K, mullanabreakingnews 32K, mullana_town 8.6K, _shiv_mandir_mullana). Treat them as partners and link back to their posts. Do not scrape and republish Instagram content.

Success metric: people who come back each week, not the number of listings.

## Rules

- Runs at $0. Never add anything that can bill without the owner's explicit OK.
- A phone number or owner name goes live only with the owner's consent. Unchecked places (from Overture Maps open data) show no phone.
- No photos of people. Rooms/PGs are out of scope for now.
- No paid features or ads without the owner's explicit OK.
- Keep the design language: Anek type, signboard `.board` names, the kilometre-stone header (today's temperature where the km goes), NH-green direction boards for guide pages, category colours, restrained roadside palette (whitewash, stone yellow, sign green). Content first: on phones the map is a full-screen layer behind the Map button and loads only when opened. No emoji, no all-caps labels, no pills, no middle-dot separators.
- Mobile first (mid-range Android, patchy 4G). The list must work without WebGL.
- Model use: Opus plans, decides and reviews; Sonnet subagents do scoped build work.

## How it fits together

- Astro static site, MapLibre GL 6 (worker bundled via `?worker&url`), OpenFreeMap tiles.
- `src/data/shops.json` (git-ignored) is the real listing data. `npm run sheet` rebuilds it from the listing Sheet's Apps Script web app (URL in git-ignored `.sheet-url` or `SHEET_URL`). It refuses to shrink the file unless `FORCE=1`. Without shops.json the build uses `shops.example.json`.
- `src/data/places.json`: 47 unchecked places from Overture, curated by `scripts/places.py`.
- `apps-script/Code.gs`: creates the Form/Sheet and serves approved rows. Paste into the Apps Script project and deploy a new version after edits.
- `src/data/events.json`: curated festival dates (Drik Panchang). Approved community events come from the events Sheet into git-ignored `events-community.json` via `npm run sheet`.
- Guide pages (`src/pages/{helplines,festivals,mmdu,getting-here,around,about}.astro`) use `src/Page.astro`; their list, colours and search keys are `guide` in `src/data/index.ts`. Facts and sources behind them: `docs/research/mullana-facts.md`. Only state what a source backs.
- `/place/<slug>/` pages for unchecked places; `src/data/landmarks.json` adds notes for public landmarks.
- Client-side: `src/weather.ts` (Open-Meteo, cached 30 min), `src/panchang.ts` (tithi from Meeus series, tested against Drik Panchang).
- `public/sw.js` + `manifest.webmanifest`: installable, offline. Bump `V` in sw.js to clear old caches.
- `functions/api/tap.ts` + KV `TAPS`: per-shop tap counts. `npm run taps` reads them.
- `scripts/og.mjs`: WhatsApp preview images (Playwright) before each build.
- Deploy: `npm run build && npx -y wrangler pages deploy dist --project-name explore-mullana --branch main`. Wrangler 4.143+ tries to turn Pages into Workers and rewrite files; never pass `--force`, and revert anything it changes. Preview branches deploy with `--branch <name>`.

## Checks

`npm test` (node:test via tsx) and `npm run build` must pass before any commit.
