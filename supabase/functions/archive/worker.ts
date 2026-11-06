export interface ArchiveJob {
  post_id: string;
  archive_id: string;
  token: string;
  files: { path: string; bytes: number }[];
}
export interface RestoreTarget {
  source: string;
  path: string;
  bytes: number;
  sha256: string;
  mime: string;
}
export interface ArchivePort {
  rpc<T>(name: string, body: object): Promise<T>;
  remove(paths: string[]): Promise<void>;
  upload(path: string, data: Uint8Array, mime: string): Promise<void>;
  read(path: string): Promise<Uint8Array>;
}
export async function sha256(data: Uint8Array) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data))),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
}
export async function removeArchives(
  port: ArchivePort,
  post?: string,
  actor?: string,
) {
  const jobs = await port.rpc<ArchiveJob[]>("claim_memory_archives", {
    p_post: post ?? null,
    p_actor: actor ?? null,
  });
  let completed = 0;
  for (const job of jobs) {
    if (
      !Array.isArray(job.files) ||
      job.files.length > 20 ||
      job.files.some((f) => !/^([0-9a-f-]{36}\/){2}[a-z0-9_.-]+$/.test(f.path))
    )
      throw new Error("ARCHIVE_UNAVAILABLE");
    await port.remove(job.files.map((f) => f.path));
    const done = await port.rpc<boolean>("finish_memory_archive", {
      p_post: job.post_id,
      p_archive: job.archive_id,
      p_token: job.token,
    });
    if (!done) throw new Error("ARCHIVE_RETRY");
    completed++;
  }
  return { completed };
}
export async function restoreAsset(
  port: ArchivePort,
  actor: string,
  post: string,
  restore: string,
  source: string,
  data: Uint8Array,
) {
  const args = {
    p_actor: actor,
    p_post: post,
    p_restore: restore,
    p_source: source,
  };
  const target = await port.rpc<RestoreTarget>("memory_restore_asset", args);
  if (data.length !== target.bytes || (await sha256(data)) !== target.sha256)
    throw new Error("WRONG_BACKUP");
  // No overwrite. A retry must find identical bytes, and can never target an old generation.
  await port.upload(target.path, data, target.mime);
  const saved = await port.read(target.path);
  if (saved.length !== target.bytes || (await sha256(saved)) !== target.sha256)
    throw new Error("RESTORE_VERIFY_FAILED");
  await port.rpc("ack_memory_restore_asset", {
    ...args,
    p_sha256: target.sha256,
  });
  return { verified: true };
}
export async function cancelRestore(
  port: ArchivePort,
  actor: string,
  post: string,
  restore: string,
) {
  const args = { p_actor: actor, p_post: post, p_restore: restore };
  const files = await port.rpc<{ path: string }[]>(
    "cancel_memory_restore",
    args,
  );
  await port.remove(files.map((f) => f.path));
  await port.rpc("cancel_memory_restore", { ...args, p_finish: true });
  return { cancelled: true };
}
