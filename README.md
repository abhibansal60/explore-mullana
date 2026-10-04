# Explore Mullana

A free map and directory of shops and places in Mullana (Ambala, Haryana) and around MMDU. It shows opening hours, open-now status, call, WhatsApp and directions buttons, and a 3D view of the town's buildings.

"Today in Mullana" on the home page shows the weather and air, the day's tithi with the next Ekadashi, Amavasya and Purnima, and the festivals and events of the next two weeks, with a button to share it all on WhatsApp. Guide pages cover helplines, festivals and melas, a first-week guide for new MMDU students, getting here, day trips and the town itself. The site installs to a phone's home screen and works offline.

## Start here: paste this to your agent

```text
Set up the Explore Mullana site from https://github.com/abhibansal60/explore-mullana on my machine.
1. Clone it, run `npm install`, then `npm test` and `npm run build`. Report both results.
2. Check whether src/data/shops.json exists. If it doesn't, copy src/data/shops.example.json to it and tell me the build is using sample data.
3. Before editing shops.json, show me the entry you plan to add and wait for my OK. Only add phone numbers the shop owner has agreed to publish.
4. Run `npm run dev` and give me the local URL so I can check the list, the map and the "3D buildings" button.
Don't deploy, push, or change DNS without asking me first.
```

## How it works

- `src/data/shops.json` holds the real listings. It's git-ignored so phone numbers stay out of the repo. `shops.example.json` shows the format.
- `npm run sheet` pulls the listings: Google Form -> Sheet -> approved rows -> `src/data/shops.json`. The web app URL goes in `SHEET_URL` or a git-ignored `.sheet-url`. Nothing is published until a row is approved, and a bad row aborts the run without touching the existing file.
- `scripts/og.mjs` renders the 1200x630 link previews (`public/og/`, git-ignored) with Playwright before each build, so WhatsApp shows a picture. Run `npm run og` on its own to redraw them.
- Categories, with the Hindi labels and Hinglish search words, live in `src/data/index.ts`.
- The list is plain HTML and works without the map. MapLibre loads afterwards, and the 3D buildings (about 1 MB) load only when someone taps "3D buildings".
- `public/buildings.geojson` comes from Overture Maps building footprints. Overture has no heights for Mullana, so `scripts/buildings.py` estimates floors from footprint area. Put floor counts you've checked on foot into `scripts/height_overrides.json` (Overture id → floors), then run:

  ```sh
  npm run buildings -- <overture_export.geojson>
  ```

## Commands

```sh
npm run dev      # local site
npm test         # open-now logic
npm run build    # static site in dist/
```

## Data and credits

Basemap: OpenFreeMap / OpenMapTiles, © OpenStreetMap contributors. Buildings: Overture Maps Foundation, including Google Open Buildings (CDLA-Permissive-2.0) and Microsoft ML Buildings (ODbL). Code is MIT licensed.

## Adding shops and counting taps

- Shops are added through a Google Form. Its responses land in a private Sheet, and a listing goes live only after its "Approved" box is ticked. `apps-script/Code.gs` creates the Form and Sheet and serves the approved rows. `npm run sheet` pulls them into `shops.json`.
- Events work the same way. Run `setupEvents()` once in the Apps Script project to create the events Form and Sheet, deploy a new version of the web app, and put the events Form's link in `site.addEventUrl` (`src/data/index.ts`). Tick "Approved" on an event row, and `npm run sheet` writes it to `src/data/events-community.json` (git-ignored). Festivals and big days are curated by hand in `src/data/events.json`.
- `npm run taps` prints this month's Call, WhatsApp, Directions, Reviews, Share and Claim taps per shop (`npm run taps -- 2026-09` for another month). Only the shop and the kind of tap are counted, no IP or device. Counts live in the Cloudflare KV namespace `explore-mullana-taps`, bound as `TAPS` in `wrangler.toml`.
