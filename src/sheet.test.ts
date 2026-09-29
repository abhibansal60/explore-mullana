import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore plain .mjs
import { cleanPhones, parseCoords, slugify, rowToShop } from "../scripts/sheet.mjs";

const row = {
  name: "Test Shop", category: "food", about: "x", owner: "y", phones: "9813127207",
  whatsapp: true, location: "30.2766, 77.0477", open: "09:00", close: "21:00", verified: "2026-09", slug: "",
};

test("phones: +91, spaces, leading 0, multiple", () => {
  assert.deepEqual(cleanPhones("+91 98131 27207"), ["9813127207"]);
  assert.deepEqual(cleanPhones("09813127207"), ["9813127207"]);
  assert.deepEqual(cleanPhones("9813127207, 8168190026 / 9896389996"), ["9813127207", "8168190026", "9896389996"]);
  assert.deepEqual(cleanPhones("9813127207 8168190026"), ["9813127207", "8168190026"]);
  assert.deepEqual(cleanPhones("12345"), []);
});

test("coords: !3d!4d beats @, plain lat,lng", () => {
  const url = "https://www.google.com/maps/place/X/@30.1,77.1,17z/data=!3d30.2751478!4d77.0457878";
  assert.deepEqual(parseCoords(url), { lat: 30.2751478, lng: 77.0457878 });
  assert.deepEqual(parseCoords("https://www.google.com/maps/place/X/@30.2,77.04,17z"), { lat: 30.2, lng: 77.04 });
  assert.deepEqual(parseCoords("30.2766, 77.0477"), { lat: 30.2766, lng: 77.0477 });
  assert.equal(parseCoords("nonsense"), null);
});

test("slug derivation", () => {
  assert.equal(slugify("  Bansal Bakery & Sweets! "), "bansal-bakery-sweets");
  assert.equal(rowToShop(row).slug, "test-shop");
  assert.equal(rowToShop({ ...row, slug: "custom" }).slug, "custom");
});

test("rejects bad rows", () => {
  assert.throws(() => rowToShop({ ...row, category: "nope" }), /unknown category/);
  assert.throws(() => rowToShop({ ...row, location: "28.6, 77.2" }), /outside Mullana/);
  assert.throws(() => rowToShop({ ...row, phones: "123" }), /phone/);
  assert.throws(() => rowToShop({ ...row, open: "9am" }), /HH:MM/);
});
