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

test.each([
  "changed",
  "cancelled",
  "unconfirmed",
  "opted-out",
  "past",
  "valid",
])(
  "plan reminder %s revalidates current consent/version before resolving only the requesting member’s devices",
  async (variant) => {
    const now = Date.now();
    const members = [
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
    ];
    const transport = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("/members?")) return Response.json(members);
      if (path.includes("/plans?"))
        return Response.json([
          {
            version: variant === "changed" ? 2 : 1,
            cancelled: variant === "cancelled",
            starts_at: new Date(
              now + (variant === "past" ? -1 : 600000),
            ).toISOString(),
            accepted_by: variant === "unconfirmed" ? ["a"] : ["a", "b"],
          },
        ]);
      if (path.includes("/plan_reminders?"))
        return Response.json([
          {
            lead_minutes: variant === "opted-out" ? null : 30,
            queued_version: 1,
          },
        ]);
      if (path.includes("/couples?"))
        return Response.json([{ timezone: "Asia/Kolkata" }]);
      if (path.includes("/device_tokens?")) {
        expect(path).toContain("user_id=eq.a");
        return Response.json([{ token: "only-a" }]);
      }
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", transport);
    const context = await notifyStore("https://test.invalid", "test").context({
      id: "job",
      source_table: "plan_reminders",
      record: {
        plan_id: "plan",
        couple_id: "room",
        user_id: "a",
        version: 1,
        expires_at: new Date(now + 600000).toISOString(),
      },
      delivered_tokens: [],
    });
    if (variant === "valid") {
      expect(context?.recipient).toBe("a");
      expect(context?.tokens).toEqual(["only-a"]);
      expect(context?.placeId).toBe("plan:1");
    } else {
      expect(context).toBeNull();
      expect(
        transport.mock.calls.every(
          ([url]) => !String(url).includes("/device_tokens?"),
        ),
      ).toBe(true);
    }
  },
);

test.each([
  "valid",
  "private",
  "paused",
  "surprise",
  "recipient-off",
  "recipient-unset",
  "checked-in",
  "cancelled",
  "changed",
  "not-queued",
  "early",
  "expired",
  "foreign",
])(
  "journey %s validates current timer, both consent and privacy before reading recipient tokens",
  async (variant) => {
    const now = Date.now();
    const transport = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("/members?"))
        return Response.json([
          {
            user_id: "a",
            display_name: "A",
            nickname: null,
            share_mode: ["paused", "surprise"].includes(variant)
              ? variant
              : "live",
            notify_prefs: {},
            quiet_start: "23:00",
            quiet_end: "07:00",
          },
          {
            user_id: "b",
            display_name: "B",
            nickname: null,
            share_mode: "live",
            notify_prefs:
              variant === "recipient-unset"
                ? {}
                : { safety: variant !== "recipient-off" },
            quiet_start: "23:00",
            quiet_end: "07:00",
          },
        ]);
      if (path.includes("/safety_journeys?"))
        return Response.json([
          {
            user_id: variant === "foreign" ? "x" : "a",
            state:
              variant === "checked-in"
                ? "checked_in"
                : variant === "cancelled"
                  ? "cancelled"
                  : "active",
            share_overdue: variant !== "private",
            version: variant === "changed" ? 2 : 1,
            queued_version: variant === "not-queued" ? null : 1,
            deadline: new Date(
              now +
                (variant === "early"
                  ? 60000
                  : variant === "expired"
                    ? -3600001
                    : -60000),
            ).toISOString(),
          },
        ]);
      if (path.includes("/couples?"))
        return Response.json([{ timezone: "Asia/Kolkata" }]);
      if (path.includes("/device_tokens?")) {
        expect(path).toContain("user_id=eq.b");
        return Response.json([{ token: "only-b" }]);
      }
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", transport);
    const result = await notifyStore("https://test.invalid", "test").context({
      id: "job",
      source_table: "safety_journeys",
      record: {
        journey_id: "trip",
        user_id: "a",
        couple_id: "room",
        version: 1,
        expires_at: new Date(now + 60000).toISOString(),
      },
      delivered_tokens: [],
    });
    if (variant === "valid") {
      expect(result?.type).toBe("journey_overdue");
      expect(result?.placeId).toBe("trip:1");
      expect(result?.tokens).toEqual(["only-b"]);
    } else {
      expect(result).toBeNull();
      expect(
        transport.mock.calls.every(
          ([url]) => !String(url).includes("/device_tokens?"),
        ),
      ).toBe(true);
    }
  },
);
