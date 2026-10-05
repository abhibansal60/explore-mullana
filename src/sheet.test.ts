import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore plain .mjs
import { cleanPhones, parseCoords, slugify, rowToEvent, rowToShop, resolveUrl } from "../scripts/sheet.mjs";

const row = {
  name: "Test Shop", category: "food", about: "x", owner: "y", phones: "9999900001",
  whatsapp: true, location: "30.2766, 77.0477", open: "09:00", close: "21:00", verified: "2026-09", slug: "",
};

test("phones: +91, spaces, leading 0, multiple", () => {
  assert.deepEqual(cleanPhones("+91 99999 00001"), ["9999900001"]);
  assert.deepEqual(cleanPhones("09999900001"), ["9999900001"]);
  assert.deepEqual(cleanPhones("9999900001, 9999900002 / 9999900003"), ["9999900001", "9999900002", "9999900003"]);
  assert.deepEqual(cleanPhones("9999900001 9999900002"), ["9999900001", "9999900002"]);
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

test("by: trimmed credit, empty when absent", () => {
  assert.equal(rowToShop({ ...row, by: "  Rohit " }).by, "Rohit");
  assert.equal(rowToShop(row).by, "");
});

const ev = { title: " Mata ka jagran ", kind: "religious", date: "2026-10-17", end: "", time: "21:00", place: "Shiv Mandir", link: "", by: "Rohit" };

test("event rows become events", () => {
  assert.deepEqual(rowToEvent(ev), {
    id: "mata-ka-jagran-2026-10-17", title: "Mata ka jagran", date: "2026-10-17", time: "21:00",
    place: "Shiv Mandir", kind: "religious", by: "Rohit",
  });
  const multi = rowToEvent({ ...ev, end: "2026-10-19", time: "", link: "https://www.instagram.com/p/x/" });
  assert.equal(multi.endDate, "2026-10-19");
  assert.equal(multi.time, undefined);
  assert.deepEqual(multi.source, { name: "Details", url: "https://www.instagram.com/p/x/" });
});

test("rejects bad event rows", () => {
  assert.throws(() => rowToEvent({ ...ev, kind: "party" }), /unknown kind/);
  assert.throws(() => rowToEvent({ ...ev, date: "17/10/2026" }), /YYYY-MM-DD/);
  assert.throws(() => rowToEvent({ ...ev, end: "2026-10-01" }), /last day/);
  assert.throws(() => rowToEvent({ ...ev, link: "javascript:alert(1)" }), /https/);
  assert.throws(() => rowToEvent({ ...ev, place: " " }), /place/);
});

test("rowToShop rejects a slug that would break page paths and tap counts", () => {
  assert.throws(() => rowToShop({ ...row, slug: "Raju Chai" }), /bad slug/);
});

test("resolveUrl only follows Google Maps links", async () => {
  await assert.rejects(resolveUrl("http://169.254.169.254/latest"), /not a Google Maps link/);
});
