import { test } from "node:test";
import assert from "node:assert/strict";
import { distLabel, metres } from "./geo.ts";

test("bakery to general store is about 80 m", () => {
  const m = metres([30.2756526, 77.0463673], [30.2751478, 77.0457878]);
  assert.ok(m > 70 && m < 90, `got ${m}`);
});

test("labels", () => {
  assert.equal(distLabel(84), "80 m");
  assert.equal(distLabel(1240), "1.2 km");
});
