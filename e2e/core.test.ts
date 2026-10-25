// Core flows in a real browser against the built site: search, categories, a shop page, the map.
// Run `npm run build` first. Works with shops.example.json, so CI needs no real data.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { preview } from "astro";
import { chromium, type Browser, type Page } from "playwright";

let server: Awaited<ReturnType<typeof preview>>;
let browser: Browser;
let base: string;

before(async () => {
  server = await preview({ root: ".", logLevel: "error", server: { host: "127.0.0.1", port: 4329 } });
  base = `http://127.0.0.1:${server.port}`;
  browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
});
after(async () => {
  await browser?.close();
  await server?.stop();
});

// A phone-sized page that fails the test on any uncaught error.
async function phone(): Promise<Page & { errors: string[] }> {
  const page = Object.assign(await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }), { errors: [] as string[] });
  page.on("pageerror", (e) => page.errors.push(e.message));
  return page;
}
const shown = (page: Page) => page.locator(".row:not([hidden])").count();

test("every page in the sitemap loads without errors", async () => {
  const xml = await (await fetch(`${base}/sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)/g)].map((m) => new URL(m[1]).pathname);
  assert.ok(paths.length > 5);
  const page = await phone();
  for (const path of paths) {
    const res = await page.goto(base + path);
    assert.equal(res?.status(), 200, path);
  }
  assert.deepEqual(page.errors, []);
});

test("search finds shops, guide pages and nothing", async () => {
  const page = await phone();
  await page.goto(base + "/");
  await page.fill("#q", "chai");
  assert.ok((await shown(page)) > 0);
  assert.match((await page.locator("#l-title").textContent())!, /chai/);
  await page.fill("#q", "112");
  assert.equal(await page.locator('.gm[href="/helplines/"]').isVisible(), true);
  await page.fill("#q", "zzzz");
  assert.equal(await shown(page), 0);
  assert.equal(await page.locator("#empty").isVisible(), true);
  assert.deepEqual(page.errors, []);
});

test("a category tile opens its list, and Back returns to the grid", async () => {
  const page = await phone();
  await page.goto(base + "/");
  const tile = page.locator(".tile").first();
  const cat = (await tile.getAttribute("data-cat"))!;
  await tile.click();
  await page.waitForURL(`**/#${cat}`);
  await page.locator("#list-view").waitFor(); // the list opens on hashchange, just after the URL changes
  const rows = page.locator(".row:not([hidden])");
  assert.ok((await rows.count()) > 0);
  for (const c of await rows.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.cat))) assert.equal(c, cat);
  await page.click("#back");
  await page.locator("#home-view").waitFor();
  assert.deepEqual(page.errors, []);
});

test("a shop page has call, directions and hours", async () => {
  const page = await phone();
  await page.goto(base + "/");
  await page.fill("#q", "chai");
  const row = page.locator(".row:not(.place):not([hidden])").first();
  const name = (await row.locator("h2").textContent())!.trim();
  await row.locator("a.main").click();
  await page.waitForURL("**/shop/*/");
  assert.equal((await page.locator("h1").textContent())!.trim(), name);
  assert.match((await page.locator('[data-tap="call"]').getAttribute("href"))!, /^tel:\+91\d{10}$/);
  assert.match((await page.locator('[data-tap="directions"]').getAttribute("href"))!, /^https:\/\//);
  assert.match((await page.locator(".facts").textContent())!, /Every day, .+ to .+/);
  assert.deepEqual(page.errors, []);
});

test("the map opens full screen on a phone and the Back button closes it", async () => {
  const page = await phone();
  await page.goto(base + "/");
  await page.click("#map-open");
  await page.locator("#map canvas").waitFor({ timeout: 20000 });
  assert.equal(await page.locator("#stage").isVisible(), true);
  await page.goBack();
  assert.equal(await page.locator("#stage").isVisible(), false);
  assert.deepEqual(page.errors, []);
});
