const KINDS = ["call", "whatsapp", "directions", "reviews", "share", "claim"];

export const onRequestPost = async ({ request, env }: { request: Request; env: { TAPS: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> } } }) => {
  const { slug, kind } = (await request.json().catch(() => null)) ?? {};
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(slug) || !KINDS.includes(kind)) {
    return new Response(null, { status: 400 });
  }
  // Month in Asia/Kolkata; en-CA gives YYYY-MM-DD.
  const month = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
  const key = `${month}:${slug}:${kind}`;
  // ponytail: KV read-modify-write can drop a count under concurrent taps; fine at town scale, move to Durable Objects or Analytics Engine if exact counts matter.
  await env.TAPS.put(key, String(Number(await env.TAPS.get(key)) + 1));
  return new Response(null, { status: 204 });
};
