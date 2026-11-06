import { archiveHandler } from "./handler.ts";
import { archiveStore } from "./store.ts";
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
const url = Deno.env.get("SUPABASE_URL") ?? "";
const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<
  string,
  string
>;
const key = keys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
Deno.serve(
  archiveHandler(archiveStore(url, key), async (token) => {
    const r = await fetch(url + "/auth/v1/user", {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const user = (await r.json()) as { id?: string };
    return user.id ?? null;
  }),
);
