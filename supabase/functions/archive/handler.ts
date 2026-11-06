import {
  cancelRestore,
  removeArchives,
  restoreAsset,
  type ArchivePort,
} from "./worker.ts";
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
export function archiveHandler(
  port: ArchivePort,
  authenticate: (token: string) => Promise<string | null>,
) {
  return async (request: Request): Promise<Response> => {
    const response = (value: unknown, status = 200) =>
      Response.json(value, { status, headers: cors });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST")
      return response({ error: "METHOD_NOT_ALLOWED" }, 405);
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) return response({ error: "SIGN_IN_REQUIRED" }, 401);
    try {
      const actor = await authenticate(token);
      if (!actor || !uuid.test(actor))
        return response({ error: "SIGN_IN_REQUIRED" }, 401);
      const url = new URL(request.url),
        action = url.searchParams.get("action"),
        post = url.searchParams.get("post"),
        restore = url.searchParams.get("restore");
      if (!post || !uuid.test(post))
        return response({ error: "INVALID_REQUEST" }, 400);
      if (action === "process")
        return response(await removeArchives(port, post, actor));
      if (!restore || !uuid.test(restore))
        return response({ error: "INVALID_REQUEST" }, 400);
      if (action === "finish") {
        const done = await port.rpc<boolean>("finish_memory_restore", {
          p_actor: actor,
          p_post: post,
          p_restore: restore,
        });
        return response({ restored: done }, done ? 200 : 409);
      }
      if (action === "cancel")
        return response(await cancelRestore(port, actor, post, restore));
      if (action !== "asset")
        return response({ error: "INVALID_REQUEST" }, 400);
      const source = url.searchParams.get("source");
      if (!source || source.length > 300)
        return response({ error: "INVALID_REQUEST" }, 400);
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > 5 * 1024 * 1024)
        return response({ error: "FILE_TOO_LARGE" }, 413);
      // Bound streaming reads even when Content-Length is missing or dishonest.
      const reader = request.body?.getReader();
      if (!reader) return response({ error: "INVALID_REQUEST" }, 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 5 * 1024 * 1024) {
            await reader.cancel();
            return response({ error: "FILE_TOO_LARGE" }, 413);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const data = new Uint8Array(size);
      let offset = 0;
      for (const part of chunks) {
        data.set(part, offset);
        offset += part.length;
      }
      return response(
        await restoreAsset(port, actor, post, restore, source, data),
      );
    } catch (error) {
      const code =
        error instanceof Error &&
        ["WRONG_BACKUP", "RESTORE_VERIFY_FAILED"].includes(error.message)
          ? error.message
          : "ARCHIVE_RETRY";
      return response({ error: code }, 409);
    }
  };
}
