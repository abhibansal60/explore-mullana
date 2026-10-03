// Renders 1200x630 Open Graph previews into public/og/ (git-ignored: they carry local shop data).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { categories, guide, landmarks, places, shops, time12 } from "../src/data/index.ts";

const fonts =
  "https://fonts.googleapis.com/css2?family=Anek+Devanagari:wdth,wght@75..100,400..700&family=Anek+Latin:wdth,wght@75..100,400..800&display=swap";

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const stone = (scale) => `
  <div class="stone" style="--s:${scale}">
    <i></i><b>मुलाना</b><span>Mullana</span>
  </div>`;

const page = (band, body) => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${fonts}">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #fafaf8; color: #1c1b19; position: relative; overflow: hidden;
    font: 400 32px/1.3 "Anek Latin", "Anek Devanagari", sans-serif; font-variation-settings: "wdth" 100; }
  .band { height: 44px; background: ${band}; }
  .main { position: absolute; left: 72px; right: 72px; top: 44px; bottom: 0; display: flex; flex-direction: column; justify-content: center; padding-bottom: 60px; }
  .title { font-weight: 750; font-variation-settings: "wdth" 78; line-height: 1.02; }
  .muted { color: #68645c; }
  .stone { position: absolute; right: 72px; bottom: 48px; width: calc(120px * var(--s)); text-align: center;
    background: #fff; border: 3px solid #1c1b19; border-radius: calc(60px * var(--s)) calc(60px * var(--s)) 6px 6px;
    padding: calc(46px * var(--s)) 0 calc(14px * var(--s)); overflow: hidden; line-height: 1.1; }
  .stone i { position: absolute; left: 0; right: 0; top: 0; height: calc(34px * var(--s)); background: #f2b705; border-bottom: 3px solid #1c1b19; }
  .stone b { display: block; font-weight: 700; font-size: calc(26px * var(--s)); }
  .stone span { display: block; font-size: calc(18px * var(--s)); color: #68645c; }
</style>
<div class="band"></div>
${body}`;

const homePage = page(
  "#f2b705",
  `<div class="main">
    <div class="title" style="font-size:112px">Shops and places<br>in Mullana</div>
    <p class="muted" style="margin-top:28px;font-size:36px">Open hours, call, WhatsApp, directions</p>
  </div>${stone(1.5)}`,
);

const shopPage = (s) => {
  const c = categories[s.category];
  const size = s.name.length > 34 ? 84 : s.name.length > 20 ? 104 : 128;
  return page(
    c.color,
    `<div class="main">
      <div class="title" style="font-size:${size}px">${esc(s.name)}</div>
      <p style="margin-top:30px;font-size:38px">${esc(c.en)} <span class="muted" style="margin-left:14px">${esc(c.hi)}</span></p>
      <p class="muted" style="margin-top:10px;font-size:34px">Open ${time12(s.hours.open)} to ${time12(s.hours.close)}</p>
    </div>${stone(1)}`,
  );
};

const guidePage = (g) =>
  page(
    g.color,
    `<div class="main">
      <div class="title" style="font-size:120px">${esc(g.en)}</div>
      <p style="margin-top:24px;font-size:44px;font-family:'Anek Devanagari'">${esc(g.hi)}</p>
      <p class="muted" style="margin-top:10px;font-size:34px">${esc(g.what)}</p>
    </div>${stone(1)}`,
  );

// Public landmarks get their own preview; other unchecked places share the home one.
const landmarkPage = (p) => {
  const c = categories[p.category];
  const size = p.name.length > 30 ? 92 : 116;
  return page(
    c.color,
    `<div class="main">
      <div class="title" style="font-size:${size}px">${esc(p.name)}</div>
      ${landmarks[p.slug].hi ? `<p style="margin-top:22px;font-size:46px;font-weight:600">${esc(landmarks[p.slug].hi)}</p>` : ""}
      <p class="muted" style="margin-top:10px;font-size:34px">Mullana, Ambala</p>
    </div>${stone(1)}`,
  );
};

mkdirSync("public/og", { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const jobs = [["home", homePage], ...shops.map((s) => [s.slug, shopPage(s)]), ...guide.map((g) => [g.slug, guidePage(g)]),
  ...places.filter((p) => landmarks[p.slug]?.public).map((p) => [`place-${p.slug}`, landmarkPage(p)])];
for (const [name, html] of jobs) {
  await tab.setContent(html, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `public/og/${name}.png` });
}
await browser.close();
console.log(`og: ${jobs.length} images in public/og`);
