import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

test("reimport leaves the two unverified MMDU shop pins excluded", () => {
  const root = mkdtempSync(join(tmpdir(), "mullana-places-"));
  try {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "src/data"), { recursive: true });
    copyFileSync("scripts/places.py", join(root, "scripts/places.py"));
    copyFileSync("scripts/places-excluded.json", join(root, "scripts/places-excluded.json"));
    // Exercise the real importer in an isolated repo, with every allowed name
    // plus both excluded source rows. No network or production data required.
    execFileSync("python3", ["-c", `
import json, runpy, subprocess, sys
from pathlib import Path
root = Path(sys.argv[1])
script = root / 'scripts/places.py'
module = runpy.run_path(str(script))
excluded = json.loads((root / 'scripts/places-excluded.json').read_text())
names = list(module['PICK']) + [p['source_name'] for p in excluded]
rows = [dict(nm=name, lat=30.271936, lng=77.052032, conf=1, src='meta', lic='CDLA-Permissive-2.0') for name in names]
src = root / 'export.json'
src.write_text(json.dumps(rows))
subprocess.run([sys.executable, str(script), str(src)], check=True)
`, root]);
    const imported = JSON.parse(readFileSync(join(root, "src/data/places.json"), "utf8"));
    const published = JSON.parse(readFileSync("src/data/places.json", "utf8"));
    const excluded = JSON.parse(readFileSync("scripts/places-excluded.json", "utf8"));
    assert.deepEqual(excluded.map((p: { slug: string }) => p.slug).sort(), ["ambala-trading-co", "jain-metal-plastic-store"]);
    for (const p of excluded) {
      assert.equal(p.lat, 30.271936);
      assert.equal(p.lng, 77.052032);
      assert.ok(!imported.some((row: { slug: string }) => row.slug === p.slug));
      assert.ok(!published.some((row: { slug: string }) => row.slug === p.slug));
    }
    assert.deepEqual(imported.map((p: { slug: string }) => p.slug).sort(), published.map((p: { slug: string }) => p.slug).sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
