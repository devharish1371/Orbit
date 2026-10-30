import { authorized } from "./security.ts";
import { fcmSender, type ServiceAccount } from "./fcm.ts";
import { notifyStore } from "./rest-store.ts";
import { runNotify } from "./worker.ts";
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
let sender: ReturnType<typeof fcmSender> | undefined;
Deno.serve(async (request) => {
  if (
    request.method !== "POST" ||
    !authorized(
      request.headers.get("x-orbit-secret"),
      Deno.env.get("ORBIT_FN_SECRET") ?? "",
    )
  )
    return new Response("forbidden", { status: 403 });
  try {
    const input = (await request.json()) as { job_id?: unknown };
    if (
      input.job_id !== undefined &&
      (typeof input.job_id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(input.job_id))
    )
      return new Response("invalid job", { status: 400 });
    const keys = JSON.parse(
      Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}",
    ) as Record<string, string>;
    const key = keys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    if (!key || !url) throw new Error("NOTIFY_CONFIG");
    const dryRun = Deno.env.get("NOTIFY_DRY_RUN") !== "false";
    if (!sender && !dryRun) {
      const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_B64");
      if (!raw) throw new Error("NOTIFY_CONFIG");
      sender = fcmSender(
        JSON.parse(
          new TextDecoder().decode(
            Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)),
          ),
        ) as ServiceAccount,
      );
    }
    const stats = await runNotify(
      notifyStore(url, key),
      sender ?? {
        send: async () => {
          throw new Error("DRY_RUN");
        },
      },
      { dryRun, id: input.job_id as string | undefined },
    );
    return Response.json(stats);
  } catch {
    return Response.json({
      error:
        "Notification delivery deferred; private configuration or connectivity needs attention.",
    });
  }
});
