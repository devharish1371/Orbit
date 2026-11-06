import { expect, test, vi } from "vitest";
import { archiveHandler } from "./handler.ts";
import {
  removeArchives,
  restoreAsset,
  cancelRestore,
  sha256,
  type ArchivePort,
} from "./worker.ts";
const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  path = `${id}/${other}/${id}.webp`;
function port() {
  return {
    rpc: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
    read: vi.fn(),
  } as unknown as ArchivePort & {
    rpc: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
  };
}
test("archive deletes complete files before leased finish, failures never finish metadata", async () => {
  const p = port();
  p.rpc
    .mockResolvedValueOnce([
      {
        post_id: id,
        archive_id: other,
        token: id,
        files: [{ path, bytes: 3 }],
      },
    ])
    .mockResolvedValueOnce(true);
  expect(await removeArchives(p, id, other)).toEqual({ completed: 1 });
  expect(p.rpc).toHaveBeenNthCalledWith(1, "claim_memory_archives", {
    p_post: id,
    p_actor: other,
  });
  expect(p.remove).toHaveBeenCalledWith([path]);
  expect(p.remove.mock.invocationCallOrder[0]).toBeLessThan(
    p.rpc.mock.invocationCallOrder[1]!,
  );
  const fail = port();
  fail.rpc.mockResolvedValue([
    { post_id: id, archive_id: other, token: id, files: [{ path, bytes: 3 }] },
  ]);
  fail.remove.mockRejectedValue(new Error("offline"));
  await expect(removeArchives(fail)).rejects.toThrow();
  expect(fail.rpc).toHaveBeenCalledTimes(1);
});
test("restore verifies input, independent storage readback and only then acknowledges", async () => {
  const data = new Uint8Array([1, 2, 3]),
    hash = await sha256(data),
    p = port();
  p.rpc.mockResolvedValue({
    source: path,
    path,
    bytes: 3,
    sha256: hash,
    mime: "image/webp",
  });
  p.read.mockResolvedValue(data);
  await restoreAsset(p, id, id, other, path, data);
  expect(p.upload).toHaveBeenCalledWith(path, data, "image/webp");
  expect(p.read.mock.invocationCallOrder[0]).toBeLessThan(
    p.rpc.mock.invocationCallOrder[1]!,
  );
  expect(p.rpc.mock.calls.at(-1)?.[0]).toBe("ack_memory_restore_asset");
  const wrong = port();
  wrong.rpc.mockResolvedValue({ bytes: 3, sha256: hash });
  await expect(
    restoreAsset(wrong, id, id, other, path, new Uint8Array([3, 2, 1])),
  ).rejects.toThrow("WRONG_BACKUP");
  expect(wrong.upload).not.toHaveBeenCalled();
  const corrupt = port();
  corrupt.rpc.mockResolvedValue({
    path,
    bytes: 3,
    sha256: hash,
    mime: "image/webp",
  });
  corrupt.read.mockResolvedValue(new Uint8Array([3, 2, 1]));
  await expect(
    restoreAsset(corrupt, id, id, other, path, data),
  ).rejects.toThrow("RESTORE_VERIFY_FAILED");
  expect(corrupt.rpc).toHaveBeenCalledTimes(1);
});
test("cancel removes only generation targets before committing cancellation", async () => {
  const p = port();
  p.rpc.mockResolvedValueOnce([{ path }]).mockResolvedValueOnce([]);
  await cancelRestore(p, id, id, other);
  expect(p.remove).toHaveBeenCalledWith([path]);
  expect(p.rpc.mock.calls[1]).toEqual([
    "cancel_memory_restore",
    { p_actor: id, p_post: id, p_restore: other, p_finish: true },
  ]);
});
test("handler authenticates user JWT, rejects body actor spoofing, bounds files and scopes jobs", async () => {
  const p = port(),
    auth = vi.fn().mockResolvedValue(id),
    handler = archiveHandler(p, auth),
    url = `https://example.test/archive?action=process&post=${other}`;
  expect((await handler(new Request(url, { method: "POST" }))).status).toBe(
    401,
  );
  expect(p.rpc).not.toHaveBeenCalled();
  p.rpc.mockResolvedValue([]);
  const r = await handler(
    new Request(url, {
      method: "POST",
      headers: { authorization: "Bearer user-token" },
      body: JSON.stringify({ actor: other }),
    }),
  );
  expect(r.status).toBe(200);
  expect(p.rpc).toHaveBeenCalledWith("claim_memory_archives", {
    p_post: other,
    p_actor: id,
  });
  expect((await handler(new Request(url, { method: "GET" }))).status).toBe(405);
  const oversized = await handler(
    new Request(
      `https://example.test/archive?action=asset&post=${id}&restore=${other}&source=${path}`,
      {
        method: "POST",
        headers: { authorization: "Bearer token", "content-length": "6000000" },
      },
    ),
  );
  expect(oversized.status).toBe(413);
  auth.mockResolvedValue(null);
  expect(
    (
      await handler(
        new Request(url, {
          method: "POST",
          headers: { authorization: "Bearer invalid" },
        }),
      )
    ).status,
  ).toBe(401);
});
