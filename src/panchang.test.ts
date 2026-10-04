import { test } from "node:test";
import assert from "node:assert/strict";
import { panchang, tithiAt, tithiName } from "./panchang.ts";

// Checked against drikpanchang.com day pages for Ambala.
test("tithi at sunrise matches Drik Panchang", () => {
  assert.equal(tithiName(panchang("2026-10-04").tithi).en, "Krishna Navami");
  assert.equal(tithiName(panchang("2026-10-10").tithi).en, "Amavasya");
  assert.equal(tithiName(panchang("2026-10-11").tithi).en, "Shukla Pratipada"); // Navratri begins
  assert.equal(tithiName(panchang("2026-10-26").tithi).en, "Purnima");
  assert.equal(tithiName(panchang("2026-11-08").tithi).en, "Krishna Chaturdashi"); // Diwali: Amavasya from 11:27
  assert.equal(tithiName(panchang("2027-08-25").tithi).en, "Krishna Ashtami"); // Janmashtami
});

test("tithi changes within minutes of Drik's time", () => {
  // Navami ends 03:53 IST on 5 Oct 2026 (22:23 UTC on the 4th).
  assert.equal(tithiAt(new Date("2026-10-04T22:13:00Z")), 23);
  assert.equal(tithiAt(new Date("2026-10-04T22:33:00Z")), 24);
});

test("next Ekadashi, Amavasya and Purnima", () => {
  assert.deepEqual(panchang("2026-10-04"), { tithi: 23, purnima: "2026-10-26", amavasya: "2026-10-10", ekadashi: "2026-10-06" });
});
