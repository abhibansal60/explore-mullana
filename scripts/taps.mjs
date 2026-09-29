// Usage: node scripts/taps.mjs [YYYY-MM]  (defaults to the current month, Asia/Kolkata)
import { execFileSync } from "node:child_process";

const ID = "69037c3a8de846b5bfbb5791fa6b3fce";
const month = process.argv[2] ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const wr = (...a) => execFileSync("npx", ["-y", "wrangler", "kv", "key", ...a, "--namespace-id", ID, "--remote"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

const keys = JSON.parse(wr("list", "--prefix", `${month}:`)).map((k) => k.name);
const rows = {};
for (const key of keys) {
  const [, slug, kind] = key.split(":");
  (rows[slug] ??= {})[kind] = Number(wr("get", key).trim());
}
const kinds = ["call", "whatsapp", "directions", "reviews", "share", "claim"];
console.log(`Taps for ${month}`);
console.log(["shop".padEnd(32), ...kinds.map((k) => k.padStart(10))].join(""));
for (const slug of Object.keys(rows).sort()) {
  console.log([slug.padEnd(32), ...kinds.map((k) => String(rows[slug][k] ?? 0).padStart(10))].join(""));
}
if (!keys.length) console.log("(no taps)");
