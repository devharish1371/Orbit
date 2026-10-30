import { inQuietHours, type Message, messageFor } from "./messages.ts";
export interface Job {
  id: string;
  source_table: string;
  record: Record<string, unknown>;
  delivered_tokens: string[];
}
export interface Context {
  type: string;
  actor: string;
  recipient: string;
  name: string;
  place?: string;
  placeId?: string;
  timezone: string;
  quietStart: string;
  quietEnd: string;
  prefs: Record<string, unknown>;
  tokens: string[];
}
export interface NotifyStore {
  claim(id?: string): Promise<Job[]>;
  context(job: Job): Promise<Context | null>;
  reserve(job: string, key: string): Promise<boolean>;
  finish(
    id: string,
    status: "sent" | "skipped" | "dry_run" | "retry",
    tokens: string[],
  ): Promise<void>;
  removeToken(token: string): Promise<void>;
}
export interface Sender {
  send(
    token: string,
    message: Message,
    id: string,
  ): Promise<"sent" | "unregistered" | "retry">;
}
async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function runNotify(
  store: NotifyStore,
  sender: Sender,
  options: { dryRun: boolean; id?: string; now?: Date },
) {
  const stats = { sent: 0, skipped: 0, dry_run: 0, retry: 0, removed: 0 };
  const jobs = await store.claim(options.id);
  for (const job of jobs) {
    const delivered = [...job.delivered_tokens];
    try {
      const context = await store.context(job);
      const message =
        context && messageFor(context.type, context.name, context.place);
      if (
        !context ||
        !message ||
        context.prefs[message.preference] === false ||
        (!message.urgent &&
          inQuietHours(
            options.now ?? new Date(),
            context.timezone,
            context.quietStart,
            context.quietEnd,
          )) ||
        !context.tokens.length
      ) {
        await store.finish(job.id, "skipped", delivered);
        stats.skipped++;
        continue;
      }
      if (options.dryRun) {
        await store.finish(job.id, "dry_run", delivered);
        stats.dry_run++;
        continue;
      }
      if (
        !(await store.reserve(
          job.id,
          [
            context.recipient,
            context.type,
            context.actor,
            context.placeId ?? "",
          ].join(":"),
        ))
      ) {
        await store.finish(job.id, "skipped", delivered);
        stats.skipped++;
        continue;
      }
      let retry = false;
      for (const token of context.tokens) {
        const hash = await digest(token);
        if (delivered.includes(hash)) continue;
        try {
          const status = await sender.send(token, message, job.id);
          if (status === "unregistered") {
            await store.removeToken(token);
            stats.removed++;
            delivered.push(hash);
          } else if (status === "sent") {
            delivered.push(hash);
            stats.sent++;
          } else retry = true;
        } catch {
          retry = true;
        }
      }
      await store.finish(job.id, retry ? "retry" : "sent", delivered);
      if (retry) stats.retry++;
    } catch {
      stats.retry++;
      await store.finish(job.id, "retry", delivered);
    }
  }
  return stats;
}
