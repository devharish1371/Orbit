/** Runtime-independent cleanup logic. All file deletion is through the Storage API. */
export interface ExpiredPost {
  id: string;
  deletion_token: string;
  media_path: string | null;
  thumb_path: string | null;
  media_bytes: number;
  thumb_bytes: number;
}
export interface StorageObject {
  path: string;
  createdAt: string;
  bytes: number;
}
export interface RetentionStore {
  claimPosts(): Promise<ExpiredPost[]>;
  removeFiles(paths: string[]): Promise<void>;
  finishPost(id: string, token: string): Promise<boolean>;
  trim(table: "location_history" | "events", now: string): Promise<number>;
  listObjects(): AsyncIterable<StorageObject[]>;
  claimOrphans(paths: string[]): Promise<string[]>;
  finishOrphans(paths: string[]): Promise<void>;
  record(stats: RetentionStats): Promise<void>;
}
export interface RetentionStats {
  posts_deleted: number;
  files_deleted: number;
  orphans_deleted: number;
  history_deleted: number;
  events_deleted: number;
  bytes_freed: number;
  error: string | null;
}

export async function runRetention(
  store: RetentionStore,
  now = new Date(),
): Promise<RetentionStats> {
  const stats: RetentionStats = {
    posts_deleted: 0,
    files_deleted: 0,
    orphans_deleted: 0,
    history_deleted: 0,
    events_deleted: 0,
    bytes_freed: 0,
    error: null,
  };
  const failures: string[] = [];
  try {
    for (let page = 0; page < 50; page++) {
      const rows = await store.claimPosts();
      if (!rows.length) break;
      for (const post of rows) {
        try {
          const paths = [post.media_path, post.thumb_path].filter(
            (path): path is string => Boolean(path),
          );
          if (paths.length) await store.removeFiles(paths);
          // Token matching prevents a late worker from completing a different lease.
          if (await store.finishPost(post.id, post.deletion_token)) {
            stats.posts_deleted++;
            stats.files_deleted += paths.length;
            stats.bytes_freed += post.media_bytes + post.thumb_bytes;
          }
        } catch {
          failures.push(
            "Expired post cleanup failed; lease retained for retry",
          );
        }
      }
      if (page === 49)
        failures.push("Post batch limit reached; remaining work deferred");
    }
    stats.history_deleted = await store.trim(
      "location_history",
      now.toISOString(),
    );
    stats.events_deleted = await store.trim("events", now.toISOString());
    for await (const files of store.listObjects()) {
      const old = files.filter(
        (file) => Date.parse(file.createdAt) < now.getTime() - 86_400_000,
      );
      if (!old.length) continue;
      // The database checks age and references again under advisory locks, so a
      // late post/avatar insert cannot race this snapshot and lose its file.
      const paths = await store.claimOrphans(old.map((file) => file.path));
      for (let start = 0; start < paths.length; start += 100) {
        const batch = paths.slice(start, start + 100);
        try {
          await store.removeFiles(batch);
          await store.finishOrphans(batch);
          stats.orphans_deleted += batch.length;
          stats.files_deleted += batch.length;
          const removed = new Set(batch);
          stats.bytes_freed += old
            .filter((file) => removed.has(file.path))
            .reduce((total, file) => total + file.bytes, 0);
        } catch {
          failures.push("Orphan removal failed; tombstones retained for retry");
        }
      }
    }
  } catch {
    failures.push("Retention backend operation failed");
  }
  stats.error = failures.length ? [...new Set(failures)].join("; ") : null;
  try {
    await store.record(stats);
  } catch {
    stats.error = [stats.error, "Could not record retention status"]
      .filter(Boolean)
      .join("; ");
  }
  return stats;
}
