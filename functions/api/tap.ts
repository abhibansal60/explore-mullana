const KINDS = ["call", "whatsapp", "directions", "reviews", "share", "claim"];

type Env = {
  TAPS: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> };
  ASSETS: { fetch(url: URL): Promise<Response> };
};

// Only slugs with a built page count, so a script can't fill KV with made-up keys. Asking the site's own static
// assets keeps the list in step with each deploy for free.
async function known(slug: string, base: string, env: Env) {
  for (const dir of ["shop", "place"]) {
    if ((await env.ASSETS.fetch(new URL(`/${dir}/${slug}/`, base))).ok) return true;
  }
  return false;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const { slug, kind } = (await request.json().catch(() => null)) ?? {};
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(slug) || !KINDS.includes(kind) || !(await known(slug, request.url, env))) {
    return new Response(null, { status: 400 });
  }
  // Month in Asia/Kolkata; en-CA gives YYYY-MM-DD.
  const month = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
  const key = `${month}:${slug}:${kind}`;
  // ponytail: KV read-modify-write can drop a count under concurrent taps; fine at town scale, move to Durable Objects or Analytics Engine if exact counts matter.
  // ponytail: no per-IP limit, so a curl loop on a real slug can still inflate counts and spend the free KV write quota; add a Workers rate-limit binding if that happens.
  await env.TAPS.put(key, String(Number(await env.TAPS.get(key)) + 1));
  return new Response(null, { status: 204 });
};
