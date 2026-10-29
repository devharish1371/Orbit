import { expect, test, vi } from "vitest";
import { runRetention, type RetentionStore } from "./worker";

function fixture() {
  const row = {
    id: "p",
    deletion_token: "lease",
    media_path: "photo",
    thumb_path: "thumb",
    media_bytes: 20,
    thumb_bytes: 5,
  };
  const store: RetentionStore = {
    claimPosts: vi.fn().mockResolvedValueOnce([row]).mockResolvedValue([]),
    removeFiles: vi.fn().mockResolvedValue(undefined),
    finishPost: vi.fn().mockResolvedValue(true),
    trim: vi.fn().mockResolvedValue(2),
    async *listObjects() {
      yield [
        { path: "orphan", createdAt: "2020-01-01T00:00:00Z", bytes: 8 },
        { path: "new-upload", createdAt: "2026-10-30T00:00:00Z", bytes: 9 },
      ];
    },
    claimOrphans: vi.fn().mockResolvedValue(["orphan"]),
    finishOrphans: vi.fn().mockResolvedValue(undefined),
    record: vi.fn().mockResolvedValue(undefined),
  };
  return store;
}
const now = new Date("2026-10-30T01:00:00Z");

test("removes storage first, matches deletion leases, skips fresh orphans and records exact counts", async () => {
  const store = fixture();
  const result = await runRetention(store, now);
  expect(result).toEqual({
    posts_deleted: 1,
    files_deleted: 3,
    orphans_deleted: 1,
    history_deleted: 2,
    events_deleted: 2,
    bytes_freed: 33,
    error: null,
  });
  expect(store.finishPost).toHaveBeenCalledWith("p", "lease");
  expect(vi.mocked(store.removeFiles).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(store.finishPost).mock.invocationCallOrder[0]!,
  );
  expect(store.claimOrphans).toHaveBeenCalledWith(["orphan"]);
  expect(store.record).toHaveBeenCalledWith(result);
});

test("a Storage failure never deletes its post and is recorded for retry", async () => {
  const store = fixture();
  vi.mocked(store.removeFiles).mockRejectedValue(new Error("injected failure"));
  const result = await runRetention(store, now);
  expect(store.finishPost).not.toHaveBeenCalled();
  expect(store.finishOrphans).not.toHaveBeenCalled();
  expect(result.posts_deleted).toBe(0);
  expect(result.error).toContain("lease retained");
  expect(result.error).toContain("tombstones retained");
});

test("backend query failures produce an error run instead of false success", async () => {
  const store = fixture();
  vi.mocked(store.trim).mockRejectedValue(new Error("query failed"));
  const result = await runRetention(store, now);
  expect(result.error).toBe("Retention backend operation failed");
  expect(store.record).toHaveBeenCalled();
});

test("a late worker does not count a different lease as its deletion", async () => {
  const store = fixture();
  vi.mocked(store.finishPost).mockResolvedValue(false);
  const result = await runRetention(store, now);
  expect(result.posts_deleted).toBe(0);
  expect(result.bytes_freed).toBe(8);
});

test("failure to record status changes the response to an error", async () => {
  const store = fixture();
  vi.mocked(store.record).mockRejectedValue(new Error("offline"));
  expect((await runRetention(store, now)).error).toBe(
    "Could not record retention status",
  );
});
