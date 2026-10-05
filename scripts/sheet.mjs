// Pulls approved shop rows from the Apps Script web app and writes src/data/shops.json.
// Usage: npm run sheet   (URL from SHEET_URL or .sheet-url; optional OUT for the output path)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { categories, kinds } from "../src/data/index.ts";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const slugify = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const clean10 = (s) => {
  let d = s.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? d : "";
};

// "+91 99999 00001 / 99999 00002" -> ["9999900001", "9999900002"]
export const cleanPhones = (raw) =>
  String(raw ?? "")
    .split(/[,/;]+/)
    .flatMap((part) => {
      const whole = clean10(part);
      return whole ? [whole] : part.trim().split(/\s+/).map(clean10);
    })
    .filter(Boolean);

// Place pin (!3d..!4d..) beats viewport (@lat,lng). Also accepts plain "lat, lng" and ?q=lat,lng.
export const parseCoords = (text) => {
  const s = String(text).trim();
  const m =
    s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/) ||
    s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ||
    s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
    s.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
};

const isUrl = (s) => /^https?:\/\//i.test(s.trim());

// Follows short-link redirects; returns the final URL text (HTML body is not needed). Only Google Maps links:
// a contributor's Location must not make this machine fetch an arbitrary URL.
const MAPS_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+)$/i;
export const resolveUrl = async (url) => {
  if (!MAPS_HOSTS.test(new URL(url).hostname)) throw new Error(`location link is not a Google Maps link: ${url}`);
  return (await fetch(url, { redirect: "follow", headers: { "user-agent": UA } })).url;
};

// Pure: row + the location text to parse (a resolved URL or plain coords) -> Shop. Throws on the first problem.
export const rowToShop = (row, location = row.location) => {
  const name = String(row.name ?? "").trim();
  if (!name) throw new Error("missing name");
  if (!Object.hasOwn(categories, row.category)) throw new Error(`unknown category "${row.category}"`);
  const phones = cleanPhones(row.phones);
  if (!phones.length) throw new Error(`no valid 10-digit phone in "${row.phones}"`);
  const c = parseCoords(location);
  if (!c) throw new Error(`no coordinates in location "${row.location}"`);
  if (!(c.lat >= 30.2 && c.lat <= 30.35 && c.lng >= 76.95 && c.lng <= 77.15))
    throw new Error(`coordinates ${c.lat}, ${c.lng} are outside Mullana`);
  if (!HHMM.test(row.open ?? "") || !HHMM.test(row.close ?? "")) throw new Error(`hours must be HH:MM (got "${row.open}"-"${row.close}")`);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.verified ?? "")) throw new Error(`verified must be YYYY-MM (got "${row.verified}")`);
  const slug = String(row.slug ?? "").trim() || slugify(name);
  // Same rule as functions/api/tap.ts, so a hand-typed slug can't break the page path or tap counts.
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error(`bad slug "${slug}" (use a-z, 0-9 and -)`);
  return {
    slug,
    name,
    category: row.category,
    about: String(row.about ?? "").trim(),
    owner: String(row.owner ?? "").trim(),
    phones,
    whatsapp: row.whatsapp === true || String(row.whatsapp).toLowerCase() === "true",
    lat: c.lat,
    lng: c.lng,
    hours: { open: row.open, close: row.close },
    googleMaps: isUrl(String(row.location)) ? String(row.location).trim() : "",
    verified: row.verified,
    by: String(row.by ?? "").trim(),
  };
};

const YMD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Pure: an approved event row -> Event (the shape of src/data/events.json). Throws on the first problem.
export const rowToEvent = (row) => {
  const title = String(row.title ?? "").trim();
  if (!title) throw new Error("missing title");
  if (!(row.kind in kinds)) throw new Error(`unknown kind "${row.kind}"`);
  if (!YMD.test(row.date ?? "")) throw new Error(`date must be YYYY-MM-DD (got "${row.date}")`);
  if (row.end && (!YMD.test(row.end) || row.end < row.date)) throw new Error(`bad last day "${row.end}"`);
  if (row.time && !HHMM.test(row.time)) throw new Error(`time must be HH:MM (got "${row.time}")`);
  const place = String(row.place ?? "").trim();
  if (!place) throw new Error("missing place");
  const link = String(row.link ?? "").trim();
  if (link && !/^https:\/\//i.test(link)) throw new Error(`link must start with https:// (got "${link}")`);
  const by = String(row.by ?? "").trim();
  return {
    id: `${slugify(title)}-${row.date}`,
    title,
    date: row.date,
    ...(row.end && row.end !== row.date ? { endDate: row.end } : {}),
    ...(row.time ? { time: row.time } : {}),
    place,
    kind: row.kind,
    ...(link ? { source: { name: "Details", url: link } } : {}),
    ...(by ? { by } : {}),
  };
};

const main = async () => {
  const url = process.env.SHEET_URL || (existsSync(".sheet-url") ? readFileSync(".sheet-url", "utf8").trim() : "");
  if (!url) throw new Error("Set SHEET_URL or put the web app URL in .sheet-url");
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Sheet request failed: HTTP ${res.status}`);
  const body = await res.json();
  const rows = body.shops;
  if (!Array.isArray(rows)) throw new Error('Response has no "shops" array');

  const shops = [];
  const errors = [];
  for (const row of rows) {
    try {
      const loc = String(row.location ?? "");
      const resolved = isUrl(loc) && !parseCoords(loc) ? await resolveUrl(loc.trim()) : loc;
      shops.push(rowToShop(row, resolved));
    } catch (e) {
      errors.push(`${row.name || "(no name)"}: ${e.message}`);
    }
  }
  const seen = new Set();
  for (const s of shops) {
    if (seen.has(s.slug)) errors.push(`${s.name}: duplicate slug "${s.slug}"`);
    seen.add(s.slug);
  }
  if (errors.length) {
    console.error(errors.map((e) => `  - ${e}`).join("\n"));
    throw new Error(`${errors.length} bad row(s); not writing`);
  }
  const out = process.env.OUT || "src/data/shops.json";
  // A shrinking list usually means an unticked box or a broken sheet, not closed shops.
  const before = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")).length : 0;
  if (shops.length < before && !process.env.FORCE) {
    throw new Error(`Sheet has ${shops.length} approved shops but ${out} has ${before}; not writing. Rerun with FORCE=1 if shops really were removed.`);
  }
  writeFileSync(out, JSON.stringify(shops, null, 2) + "\n");
  console.log(`${shops.length} shops -> ${out.replace(/^.*\/(src\/data\/)/, "$1")}`);

  // Events from the second Form, once setupEvents() has run. A bad row stops only the events.
  if (!Array.isArray(body.events)) return;
  const bad = [];
  const events = body.events.flatMap((row) => {
    try {
      return [rowToEvent(row)];
    } catch (e) {
      bad.push(`${row.title || "(no title)"}: ${e.message}`);
      return [];
    }
  });
  if (bad.length) {
    console.error(bad.map((e) => `  - ${e}`).join("\n"));
    throw new Error(`${bad.length} bad event row(s); events not written`);
  }
  writeFileSync("src/data/events-community.json", JSON.stringify(events, null, 2) + "\n");
  console.log(`${events.length} events -> src/data/events-community.json`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
