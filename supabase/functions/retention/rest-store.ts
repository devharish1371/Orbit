import type {
  ExpiredPost,
  RetentionStats,
  RetentionStore,
  StorageObject,
} from "./worker.ts";

/** Minimal admin transport; no credentials are placed in URLs or error messages. */
export function restStore(url: string, key: string): RetentionStore {
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };
  // New secret keys go only in apikey; legacy JWT keys also need Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    extra?: Record<string, string>,
  ) {
    const response = await fetch(url + path, {
      method,
      headers: { ...headers, ...extra },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok)
      throw new Error(`Supabase operation failed (HTTP ${response.status})`);
    return response;
  }
  async function rpc<T>(name: string, body: unknown): Promise<T> {
    const response = await request("/rest/v1/rpc/" + name, "POST", body);
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }
  return {
    claimPosts: () =>
      rpc<ExpiredPost[]>("claim_expired_posts", { p_limit: 100 }),
    async removeFiles(paths) {
      if (paths.length > 1000)
        throw new Error("Storage removal batch exceeds 1000");
      await request("/storage/v1/object/media", "DELETE", { prefixes: paths });
    },
    finishPost: (id, token) =>
      rpc<boolean>("finish_expired_post", { p_id: id, p_token: token }),
    async trim(table, now) {
      const response = await request(
        "/rest/v1/" + table + "?expires_at=lt." + encodeURIComponent(now),
        "DELETE",
        undefined,
        { Prefer: "count=exact,return=minimal" },
      );
      const count = response.headers.get("content-range")?.split("/")[1];
      if (!count || count === "*") throw new Error("Missing deletion count");
      return Number(count);
    },
    async *listObjects(): AsyncIterable<StorageObject[]> {
      const folders = [""];
      let pages = 0;
      while (folders.length) {
        const prefix = folders.shift()!;
        for (let offset = 0; ; offset += 1000) {
          if (++pages > 200)
            throw new Error("Storage listing work limit reached");
          const response = await request(
            "/storage/v1/object/list/media",
            "POST",
            {
              prefix,
              limit: 1000,
              offset,
              sortBy: { column: "name", order: "asc" },
            },
          );
          const rows = (await response.json()) as {
            id: string | null;
            name: string;
            created_at?: string;
            metadata?: { size?: number };
          }[];
          const objects: StorageObject[] = [];
          for (const row of rows) {
            const path = prefix ? `${prefix}/${row.name}` : row.name;
            if (!row.id) folders.push(path);
            else if (row.created_at)
              objects.push({
                path,
                createdAt: row.created_at,
                bytes: row.metadata?.size ?? 0,
              });
          }
          if (objects.length) yield objects;
          if (rows.length < 1000) break;
        }
      }
    },
    claimOrphans: (paths) =>
      rpc<string[]>("claim_orphan_media", { p_paths: paths }),
    async finishOrphans(paths) {
      await rpc("finish_orphan_media", { p_paths: paths });
    },
    async record(stats: RetentionStats) {
      await request("/rest/v1/retention_runs", "POST", stats);
    },
  };
}
