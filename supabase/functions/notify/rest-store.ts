import type { Context, Job, NotifyStore } from "./worker.ts";
export function notifyStore(url: string, key: string): NotifyStore {
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  async function request<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(url + "/rest/v1/" + path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("NOTIFY_DATABASE_UNAVAILABLE");
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }
  const rpc = <T>(name: string, body: unknown) =>
    request<T>("rpc/" + name, "POST", body);
  return {
    claim: (id) =>
      rpc<Job[]>("claim_notification_jobs", { p_id: id ?? null, p_limit: 1 }),
    reserve: (id, key) =>
      rpc<boolean>("reserve_notification", { p_id: id, p_key: key }),
    finish: async (id, status, tokens) => {
      await rpc("finish_notification", {
        p_id: id,
        p_status: status,
        p_tokens: tokens,
      });
    },
    removeToken: async (token) => {
      await request(
        "device_tokens?token=eq." + encodeURIComponent(token),
        "DELETE",
      );
    },
    async context(job) {
      const record = job.record;
      if (
        typeof record.expires_at === "string" &&
        new Date(record.expires_at).getTime() <= Date.now()
      )
        return null;
      const couple = record.couple_id;
      const actor = record.user_id ?? record.author_id;
      if (typeof couple !== "string" || typeof actor !== "string") return null;
      const members = await request<
        {
          user_id: string;
          display_name: string;
          nickname: string | null;
          notify_prefs: Record<string, unknown>;
          quiet_start: string;
          quiet_end: string;
        }[]
      >(
        "members?couple_id=eq." +
          encodeURIComponent(couple) +
          "&select=user_id,display_name,nickname,notify_prefs,quiet_start,quiet_end",
      );
      const self = members.find((m) => m.user_id === actor),
        partner = members.find((m) => m.user_id !== actor);
      if (!self || !partner) return null;
      let type: string;
      if (job.source_table === "events") type = String(record.type);
      else if (job.source_table === "posts") {
        const live = await request<{ id: string }[]>(
          "posts?id=eq." +
            encodeURIComponent(String(record.id)) +
            "&couple_id=eq." +
            encodeURIComponent(couple) +
            "&unsent_at=is.null&or=(keep.eq.true,expires_at.gt." +
            encodeURIComponent(new Date().toISOString()) +
            ")&select=id",
        );
        if (!live.length) return null;
        type = String(record.channel);
      } else if (
        job.source_table === "comments" ||
        job.source_table === "reactions"
      ) {
        const post = await request<{ author_id: string }[]>(
          "posts?id=eq." +
            encodeURIComponent(String(record.post_id)) +
            "&couple_id=eq." +
            encodeURIComponent(couple) +
            "&unsent_at=is.null&or=(keep.eq.true,expires_at.gt." +
            encodeURIComponent(new Date().toISOString()) +
            ")&select=author_id",
        );
        if (post[0]?.author_id !== partner.user_id) return null;
        type = job.source_table === "comments" ? "comment" : "reaction";
      } else return null;
      const couples = await request<{ timezone: string }[]>(
        "couples?id=eq." + encodeURIComponent(couple) + "&select=timezone",
      );
      const tokens = await request<{ token: string }[]>(
        "device_tokens?user_id=eq." +
          encodeURIComponent(partner.user_id) +
          "&platform=eq.android&select=token&limit=10",
      );
      let place: string | undefined;
      if (typeof record.place_id === "string") {
        const places = await request<{ name: string }[]>(
          "places?id=eq." +
            encodeURIComponent(record.place_id) +
            "&couple_id=eq." +
            encodeURIComponent(couple) +
            "&select=name",
        );
        place = places[0]?.name;
      }
      return {
        type,
        actor,
        recipient: partner.user_id,
        name: self.nickname || self.display_name,
        place,
        placeId:
          typeof record.place_id === "string" ? record.place_id : undefined,
        timezone: couples[0]?.timezone ?? "Asia/Kolkata",
        quietStart: partner.quiet_start,
        quietEnd: partner.quiet_end,
        prefs: partner.notify_prefs,
        tokens: tokens.map((t) => t.token),
      } satisfies Context;
    },
  };
}
