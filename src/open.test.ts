import { test } from "node:test";
import assert from "node:assert/strict";
import { istDate, isNight, isOpen } from "./open.ts";

// 12:00 UTC is 17:30 in Mullana.
const noonUtc = new Date("2026-09-29T12:00:00Z");

test("open during hours, in IST not UTC", () => {
  assert.equal(isOpen("10:00", "21:00", noonUtc), true);
  assert.equal(isOpen("09:00", "17:00", noonUtc), false);
});

test("overnight hours wrap past midnight", () => {
  assert.equal(isOpen("18:00", "02:00", new Date("2026-09-29T19:00:00Z")), true); // 00:30 IST
  assert.equal(isOpen("18:00", "02:00", noonUtc), false);
});

test("night is 18:30 to 06:00 IST", () => {
  assert.equal(isNight(new Date("2026-09-29T13:30:00Z")), true); // 19:00 IST
  assert.equal(isNight(new Date("2026-09-29T06:30:00Z")), false); // 12:00 IST
  assert.equal(isNight(new Date("2026-09-29T00:00:00Z")), true); // 05:30 IST
  assert.equal(isNight(new Date("2026-09-29T01:00:00Z")), false); // 06:30 IST
});

test("IST date rolls over at midnight in Mullana, not UTC", () => {
  assert.equal(istDate(new Date("2026-10-04T18:29:00Z")), "2026-10-04"); // 23:59 IST
  assert.equal(istDate(new Date("2026-10-04T18:31:00Z")), "2026-10-05"); // 00:01 IST
});
