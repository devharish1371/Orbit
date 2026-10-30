import { expect, test, vi } from "vitest";
import { runNotify, type NotifyStore, type Context, type Job } from "./worker";
import { inQuietHours, messageFor } from "./messages";
import { authorized } from "./security";
test("internal authorization fails closed on missing or partial secrets", () => {
  const secret = "test-internal-key-00000000000000000000";
  expect(authorized(null, secret)).toBe(false);
  expect(authorized("", "")).toBe(false);
  expect(authorized(secret.slice(1), secret)).toBe(false);
  expect(authorized(secret + "x", secret)).toBe(false);
  expect(authorized(secret, secret)).toBe(true);
});
function fixture() {
  const job: Job = {
    id: "job",
    source_table: "events",
    record: {},
    delivered_tokens: [],
  };
  const context: Context = {
    type: "nudge",
    actor: "a",
    recipient: "b",
    name: "Partner",
    timezone: "Asia/Kolkata",
    quietStart: "23:00:00",
    quietEnd: "07:00:00",
    prefs: {},
    tokens: ["first", "second"],
  };
  const store: NotifyStore = {
    claim: vi.fn().mockResolvedValue([job]),
    context: vi.fn().mockResolvedValue(context),
    reserve: vi.fn().mockResolvedValue(true),
    finish: vi.fn().mockResolvedValue(undefined),
    removeToken: vi.fn().mockResolvedValue(undefined),
  };
  const sender = { send: vi.fn().mockResolvedValue("sent") };
  return { job, context, store, sender };
}
const now = new Date("2026-10-30T08:00:00Z");
test("quiet hours handle midnight, boundaries, same-day ranges and disabled hours", () => {
  const quiet = (iso: string, a = "23:00", b = "07:00") =>
    inQuietHours(new Date(iso), "Asia/Kolkata", a, b);
  expect(quiet("2026-10-30T17:30:00Z")).toBe(true);
  expect(quiet("2026-10-30T01:29:59Z")).toBe(true);
  expect(quiet("2026-10-30T01:30:00Z")).toBe(false);
  expect(quiet("2026-10-30T08:00:00Z", "12:00", "14:00")).toBe(true);
  expect(quiet("2026-10-30T08:00:00Z", "12:00", "12:00")).toBe(false);
  expect(
    inQuietHours(
      new Date("2026-11-01T06:30:00Z"),
      "America/New_York",
      "01:00",
      "02:00",
    ),
  ).toBe(true);
});
test("dry run records a result without sending or consuming dedupe", async () => {
  const f = fixture();
  expect(
    (await runNotify(f.store, f.sender, { dryRun: true, now })).dry_run,
  ).toBe(1);
  expect(f.sender.send).not.toHaveBeenCalled();
  expect(f.store.reserve).not.toHaveBeenCalled();
});
test("preferences and quiet hours suppress regular alerts; urgent bypasses quiet only", async () => {
  const f = fixture();
  f.context.prefs.nudge = false;
  await runNotify(f.store, f.sender, { dryRun: false, now });
  expect(f.sender.send).not.toHaveBeenCalled();
  f.context.prefs = {};
  const night = new Date("2026-10-30T18:00:00Z");
  await runNotify(f.store, f.sender, { dryRun: false, now: night });
  expect(f.sender.send).not.toHaveBeenCalled();
  f.context.type = "sos";
  await runNotify(f.store, f.sender, { dryRun: false, now: night });
  expect(f.sender.send).toHaveBeenCalledTimes(2);
  f.sender.send.mockClear();
  f.context.type = "sharing_stopped";
  f.context.prefs.sharing_stopped = false;
  await runNotify(f.store, f.sender, { dryRun: false, now: night });
  expect(f.sender.send).not.toHaveBeenCalled();
});
test("atomic dedupe blocks a second job before any FCM request", async () => {
  const f = fixture();
  vi.mocked(f.store.reserve).mockResolvedValue(false);
  expect(
    (await runNotify(f.store, f.sender, { dryRun: false, now })).skipped,
  ).toBe(1);
  expect(f.sender.send).not.toHaveBeenCalled();
});
test("partial delivery retries only failed devices and removes unregistered tokens", async () => {
  const f = fixture();
  f.sender.send.mockResolvedValueOnce("sent").mockResolvedValueOnce("retry");
  expect(
    (await runNotify(f.store, f.sender, { dryRun: false, now })).retry,
  ).toBe(1);
  const first = vi.mocked(f.store.finish).mock.calls[0]!;
  expect(first[1]).toBe("retry");
  expect(first[2]).toHaveLength(1);
  expect(first[2][0]).not.toBe("first");
  f.job.delivered_tokens = first[2];
  f.sender.send.mockClear().mockResolvedValue("unregistered");
  const result = await runNotify(f.store, f.sender, { dryRun: false, now });
  expect(f.sender.send).toHaveBeenCalledTimes(1);
  expect(f.sender.send.mock.calls[0]?.[0]).toBe("second");
  expect(result.removed).toBe(1);
  expect(f.store.removeToken).toHaveBeenCalledWith("second");
});
test("a database/context failure remains retryable and produces no outbound message", async () => {
  const f = fixture();
  vi.mocked(f.store.context).mockRejectedValue(new Error("unavailable"));
  expect(
    (await runNotify(f.store, f.sender, { dryRun: false, now })).retry,
  ).toBe(1);
  expect(f.store.finish).toHaveBeenCalledWith("job", "retry", []);
  expect(f.sender.send).not.toHaveBeenCalled();
});
test("copy uses generic private previews and safe internal routes", () => {
  expect(messageFor("chat", "Partner")).toMatchObject({
    body: "💬 A new message from Partner",
    route: "/chat",
  });
  expect(messageFor("sos", "Partner")).toMatchObject({
    urgent: true,
    channel: "alerts",
    route: "/map",
  });
  expect(messageFor("not-real", "Partner")).toBeNull();
});
