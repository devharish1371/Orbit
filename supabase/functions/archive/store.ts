import type { ArchivePort } from "./worker.ts";
export function archiveStore(url: string, key: string): ArchivePort {
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const path = (value: string) =>
    value.split("/").map(encodeURIComponent).join("/");
  async function request(
    route: string,
    method = "GET",
    body?: BodyInit,
    extra?: Record<string, string>,
  ) {
    return fetch(url + route, {
      method,
      body,
      headers: { ...headers, ...extra },
      signal: AbortSignal.timeout(25000),
    });
  }
  return {
    async rpc<T>(name: string, body: object): Promise<T> {
      const r = await request(
        "/rest/v1/rpc/" + name,
        "POST",
        JSON.stringify(body),
        { "Content-Type": "application/json" },
      );
      if (!r.ok) throw new Error("ARCHIVE_UNAVAILABLE");
      const text = await r.text();
      return (text ? JSON.parse(text) : null) as T;
    },
    async remove(paths) {
      if (!paths.length) return;
      if (paths.length > 20) throw new Error("ARCHIVE_UNAVAILABLE");
      const r = await request(
        "/storage/v1/object/media",
        "DELETE",
        JSON.stringify({ prefixes: paths }),
        { "Content-Type": "application/json" },
      );
      if (!r.ok) throw new Error("ARCHIVE_RETRY");
    },
    async upload(name, data, mime) {
      const r = await request(
        "/storage/v1/object/media/" + path(name),
        "POST",
        new Uint8Array(data),
        { "Content-Type": mime, "x-upsert": "false" },
      );
      if (!r.ok && r.status !== 409) {
        const info: unknown = await r.json().catch(() => null);
        if (!(
          info &&
          typeof info === "object" &&
          "statusCode" in info &&
          String(info.statusCode) === "409"
        ))
          throw new Error("RESTORE_RETRY");
      }
    },
    async read(name) {
      const r = await request(
        "/storage/v1/object/authenticated/media/" + path(name),
      );
      if (!r.ok) throw new Error("RESTORE_RETRY");
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}
