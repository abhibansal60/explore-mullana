// Renders the PWA icons (kilometre stone on paper) into public/icons/. Run: npm run icons. Output is committed.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const fonts = "https://fonts.googleapis.com/css2?family=Anek+Devanagari:wdth,wght@75..100,700&display=swap";
// w = stone width in vmin; 60 keeps it inside the maskable safe zone.
const html = (w) => `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${fonts}">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 100vw; height: 100vh; background: #fafaf8; display: grid; place-items: center; }
  .stone { --w: ${w}vmin; width: var(--w); padding-bottom: calc(var(--w) * 0.09); text-align: center; overflow: hidden; background: #fff; color: #1c1b19;
    border-radius: calc(var(--w) / 2) calc(var(--w) / 2) calc(var(--w) * 0.065) calc(var(--w) * 0.065); outline: calc(var(--w) * 0.012) solid #1c1b19; outline-offset: -1px; }
  .dome { height: calc(var(--w) * 0.33); background: #f2b705; margin-bottom: calc(var(--w) * 0.07); }
  .hi { font: 700 calc(var(--w) * 0.2)/1.15 "Anek Devanagari", sans-serif; }
</style><div class="stone"><div class="dome"></div><div class="hi" lang="hi">मुलाना</div></div>`;

const jobs = [["icon-512", 512, 60], ["icon-maskable-512", 512, 60], ["icon-192", 192, 60], ["apple-touch-icon", 180, 60], ["favicon-32", 32, 80]];
mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const [name, size, w] of jobs) {
  await tab.setViewportSize({ width: size, height: size });
  await tab.setContent(html(w), { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `public/icons/${name}.png` });
}
await browser.close();
console.log(`icons: ${jobs.length} in public/icons`);
