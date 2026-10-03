import { test } from "node:test";
import assert from "node:assert/strict";
import { airBand, rainAt, sky } from "./weather.ts";

test("WMO codes read as plain sky words", () => {
  assert.equal(sky(0), "Clear");
  assert.equal(sky(2), "Partly cloudy");
  assert.equal(sky(45), "Fog");
  assert.equal(sky(63), "Rain");
  assert.equal(sky(81), "Rain");
  assert.equal(sky(95), "Thunderstorm");
});

test("PM2.5 uses India's AQI bands", () => {
  assert.equal(airBand(30), "Good");
  assert.equal(airBand(31), "Satisfactory");
  assert.equal(airBand(91), "Poor");
  assert.equal(airBand(300), "Severe");
});

test("rain is the first likely hour from now, within 12 hours", () => {
  const times = ["2026-10-04T10:00", "2026-10-04T11:00", "2026-10-04T12:00", "2026-10-04T13:00"];
  assert.equal(rainAt(times, [80, 10, 60, 90], "2026-10-04T11:15"), "2026-10-04T12:00");
  assert.equal(rainAt(times, [80, 10, 20, 30], "2026-10-04T11:15"), undefined);
});
