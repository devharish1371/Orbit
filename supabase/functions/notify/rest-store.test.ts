import { afterEach, expect, test, vi } from "vitest";
import { notifyStore } from "./rest-store";
afterEach(() => vi.unstubAllGlobals());
test("pending notifications for unsent or expired posts stop before FCM resolution", async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json([
        {
          user_id: "a",
          display_name: "A",
          nickname: null,
          notify_prefs: {},
          quiet_start: "23:00",
          quiet_end: "07:00",
        },
        {
          user_id: "b",
          display_name: "B",
          nickname: null,
          notify_prefs: {},
          quiet_start: "23:00",
          quiet_end: "07:00",
        },
      ]),
    )
    .mockResolvedValueOnce(Response.json([]));
  vi.stubGlobal("fetch", transport);
  const context = await notifyStore(
    "https://test.invalid",
    "public-test-key",
  ).context({
    id: "job",
    source_table: "posts",
    record: { id: "post", couple_id: "room", author_id: "a", channel: "chat" },
    delivered_tokens: [],
  });
  expect(context).toBeNull();
  expect(transport).toHaveBeenCalledTimes(2);
  expect(String(transport.mock.calls[1]?.[0])).toContain("unsent_at=is.null");
  expect(String(transport.mock.calls[1]?.[0])).toContain("expires_at.gt.");
});
