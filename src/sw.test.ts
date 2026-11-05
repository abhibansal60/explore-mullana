import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Exercise the shipped worker with a stalled network and advance its fallback timer.
function navigation(path: string, savedPaths: string[]) {
  const origin = "https://mullana.example";
  const listeners: Record<string, Function> = {};
  const saved = new Map(savedPaths.map((p) => [origin + p, new Response(p)]));
  let timeout!: () => void;
  let resolveNetwork!: (res: Response) => void;
  let rejectNetwork!: (err: Error) => void;
  const network = new Promise<Response>((resolve, reject) => {
    resolveNetwork = resolve;
    rejectNetwork = reject;
  });
  runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self: { addEventListener: (name: string, fn: Function) => (listeners[name] = fn) },
    location: { origin },
    URL,
    fetch: () => network,
    caches: {
      match: async (req: string | Request) => saved.get(typeof req === "string" ? new URL(req, origin).href : req.url),
      open: async () => ({ put: async () => {} }),
    },
    setTimeout: (fn: () => void, ms: number) => {
      assert.equal(ms, 4000);
      timeout = fn;
    },
  });
  let response!: Promise<Response>;
  listeners.fetch({
    request: { method: "GET", mode: "navigate", url: origin + path },
    respondWith: (value: Promise<Response>) => (response = value),
  });
  return { response, expire: () => timeout(), resolveNetwork, rejectNetwork };
}

for (const path of ["/?q=chai", "/around/"]) {
  test(`stalled navigation to ${path} serves the saved homepage after four seconds`, async () => {
    const nav = navigation(path, ["/"]);
    let result: Response | undefined;
    nav.response.then((res) => (result = res));
    nav.expire();
    // Drain the promise chain without allowing the stalled fetch to resolve.
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(result, "navigation still waits for the network after the fallback timeout");
    assert.equal(await result.text(), "/");
  });
}

test("stalled navigation prefers the exact saved page", async () => {
  const nav = navigation("/helplines/", ["/", "/helplines/"]);
  nav.expire();
  assert.equal(await (await nav.response).text(), "/helplines/");
});

test("without a saved page the timeout still waits for the network", async () => {
  const nav = navigation("/around/", []);
  nav.expire();
  await new Promise((resolve) => setImmediate(resolve));
  nav.resolveNetwork(new Response("online"));
  assert.equal(await (await nav.response).text(), "online");
});

test("failed navigation uses the saved homepage", async () => {
  const nav = navigation("/?q=chai", ["/"]);
  nav.rejectNetwork(new Error("offline"));
  assert.equal(await (await nav.response).text(), "/");
});

test("a prompt network response wins over the saved page", async () => {
  const nav = navigation("/helplines/", ["/", "/helplines/"]);
  nav.resolveNetwork(new Response("fresh helplines"));
  assert.equal(await (await nav.response).text(), "fresh helplines");
});
