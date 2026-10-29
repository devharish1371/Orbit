import { runRetention } from "./worker.ts";
import { restStore } from "./rest-store.ts";

// Deno is supplied by the hosted Edge Runtime; declarations keep local TS strict.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let difference = left.length ^ right.length;
  // Hash-independent fixed iterations for the configured secret length.
  for (let i = 0; i < right.length; i++)
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return right.length >= 32 && difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return new Response("method not allowed", { status: 405 });
  if (
    !safeEqual(
      request.headers.get("x-orbit-secret") ?? "",
      Deno.env.get("ORBIT_FN_SECRET") ?? "",
    )
  )
    return new Response("forbidden", { status: 403 });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const keys = JSON.parse(
      Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}",
    ) as Record<string, string>;
    const key = keys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Missing backend configuration");
    const stats = await runRetention(restStore(url, key));
    return Response.json(stats, { status: stats.error ? 500 : 200 });
  } catch {
    return Response.json(
      {
        error:
          "Retention is unavailable; check private function configuration.",
      },
      { status: 503 },
    );
  }
});
