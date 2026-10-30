import type { Message } from "./messages.ts";
import type { Sender } from "./worker.ts";
export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}
const encoder = new TextEncoder();
function b64url(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export async function assertion(account: ServiceAccount, now = Date.now()) {
  const header = b64url(
    encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
  );
  const iat = Math.floor(now / 1000);
  const payload = b64url(
    encoder.encode(
      JSON.stringify({
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat,
        exp: iat + 3600,
      }),
    ),
  );
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const input = header + "." + payload;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(input),
  );
  return input + "." + b64url(new Uint8Array(signature));
}
export function fcmSender(
  account: ServiceAccount,
  transport: typeof fetch = fetch,
): Sender {
  let cached: { token: string; until: number } | undefined;
  let pending: Promise<string> | undefined;
  async function accessToken() {
    if (cached && Date.now() < cached.until) return cached.token;
    pending ??= (async () => {
      const response = await transport("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: await assertion(account),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("FCM_AUTH_UNAVAILABLE");
      const result = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (!result.access_token) throw new Error("FCM_AUTH_UNAVAILABLE");
      cached = {
        token: result.access_token,
        until:
          Date.now() +
          Math.min(3000, Math.max(0, (result.expires_in ?? 3600) - 60)) * 1000,
      };
      return result.access_token;
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  }
  return {
    async send(token: string, message: Message, id: string) {
      const response = await transport(
        "https://fcm.googleapis.com/v1/projects/" +
          encodeURIComponent(account.project_id) +
          "/messages:send",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + (await accessToken()),
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              android: {
                priority: "HIGH",
                ttl: message.urgent ? "300s" : "3600s",
                collapse_key: message.type,
                notification: {
                  channel_id: message.channel,
                  tag: message.type,
                  icon: "ic_tracking",
                  visibility: "PRIVATE",
                  ...(message.channel !== "quiet"
                    ? { default_sound: true }
                    : {}),
                },
              },
              data: { route: message.route, type: message.type, id },
            },
          }),
        },
      );
      if (response.ok) return "sent";
      if (response.status === 401) cached = undefined;
      const error = (await response.json().catch(() => ({}))) as {
        error?: { details?: { errorCode?: string }[] };
      };
      // A generic 404 can mean the wrong Firebase project. Delete only explicit UNREGISTERED.
      if (error.error?.details?.some((d) => d.errorCode === "UNREGISTERED"))
        return "unregistered";
      return "retry";
    },
  };
}
