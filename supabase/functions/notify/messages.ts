export interface Message {
  title: string;
  body: string;
  route: string;
  type: string;
  preference: string;
  urgent: boolean;
  channel: "alerts" | "social" | "quiet";
}
export function messageFor(
  type: string,
  name: string,
  place = "your place",
): Message | null {
  const base = {
    title: "Orbit",
    type,
    preference: type,
    urgent: false,
    route: "/activity",
    channel: "social" as Message["channel"],
  };
  const map: Record<string, string> = {
    arrive: `💛 ${name} reached ${place}`,
    leave: `👋 ${name} left ${place}`,
    low_battery: `🔋 ${name}'s phone is running low`,
    sharing_stopped: `📵 ${name}'s location updates have stopped`,
    sharing_resumed: `💛 ${name}'s location updates are back`,
    mode_changed: `${name} changed their sharing mode`,
    nudge: `🫶 ${name} is thinking of you`,
    call_request: `📞 ${name} wants to talk`,
    sos: `🚨 ${name} needs you — tap to open Orbit`,
    capsule_unlocked: `✨ A time capsule from ${name} is ready`,
    question_ready: "A little question for the two of you",
    moment: `📸 ${name} shared a moment`,
    chat: `💬 A new message from ${name}`,
    comment: `${name} commented on your moment`,
    reaction: `${name} reacted to your moment`,
  };
  const body = map[type];
  if (!body) return null;
  const urgent = type === "sos" || type === "sharing_stopped";
  const preference =
    (
      {
        moment: "moments",
        comment: "reactions",
        reaction: "reactions",
        capsule_unlocked: "capsule",
        question_ready: "capsule",
        sharing_resumed: "sharing_stopped",
        mode_changed: "sharing_stopped",
        call_request: "nudge",
      } as Record<string, string>
    )[type] ?? type;
  const route =
    type === "call_request"
      ? "/call"
      : [
            "arrive",
            "leave",
            "low_battery",
            "sharing_stopped",
            "sharing_resumed",
            "mode_changed",
            "sos",
          ].includes(type)
        ? "/map"
        : type === "chat"
          ? "/chat"
          : ["moment", "comment", "reaction"].includes(type)
            ? "/moments"
            : type === "capsule_unlocked"
              ? "/us"
              : "/activity";
  return {
    ...base,
    body,
    preference,
    route,
    urgent,
    channel:
      urgent || ["arrive", "leave", "low_battery"].includes(type)
        ? "alerts"
        : "social",
  };
}
export function inQuietHours(
  now: Date,
  timezone: string,
  start: string,
  end: string,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const minute =
    Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value);
  const minutes = (value: string) =>
    Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const a = minutes(start),
    b = minutes(end);
  return a === b
    ? false
    : a < b
      ? minute >= a && minute < b
      : minute >= a || minute < b;
}
