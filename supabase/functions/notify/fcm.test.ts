import { expect, test, vi } from "vitest";
import { assertion, fcmSender, type ServiceAccount } from "./fcm";
import { messageFor } from "./messages";
async function account() {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const raw = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keys.privateKey),
  );
  const account: ServiceAccount = {
    project_id: "test-project",
    client_email: "test@test.iam.gserviceaccount.com",
    // Ephemeral raw PKCS8 base64; no static PEM key is present in source.
    private_key: btoa(Array.from(raw, (c) => String.fromCharCode(c)).join("")),
  };
  return { keys, account };
}
test("OAuth assertion is verifiably signed RS256 with constrained scope and expiry", async () => {
  const f = await account();
  const jwt = await assertion(f.account, 1000000);
  const [header, payload, signature] = jwt.split(".");
  const decode = (v: string) =>
    Uint8Array.from(atob(v.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
      c.charCodeAt(0),
    );
  expect(JSON.parse(new TextDecoder().decode(decode(payload!)))).toMatchObject({
    iat: 1000,
    exp: 4600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
  });
  expect(
    await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      f.keys.publicKey,
      decode(signature!),
      new TextEncoder().encode(header + "." + payload),
    ),
  ).toBe(true);
});
test("FCM uses notification plus data, caches OAuth, and only explicit UNREGISTERED deletes a token", async () => {
  const f = await account();
  const transport = vi.fn<typeof fetch>();
  transport
    .mockResolvedValueOnce(
      Response.json({ access_token: "test-access", expires_in: 3600 }),
    )
    .mockResolvedValueOnce(Response.json({ name: "sent" }))
    .mockResolvedValueOnce(
      Response.json({ error: { status: "NOT_FOUND" } }, { status: 404 }),
    )
    .mockResolvedValueOnce(
      Response.json(
        { error: { details: [{ errorCode: "UNREGISTERED" }] } },
        { status: 404 },
      ),
    );
  const sender = fcmSender(f.account, transport);
  const message = messageFor("sos", "Partner")!;
  expect(await sender.send("test-device", message, "id")).toBe("sent");
  expect(await sender.send("test-device", message, "id")).toBe("retry");
  expect(await sender.send("test-device", message, "id")).toBe("unregistered");
  expect(transport).toHaveBeenCalledTimes(4);
  const sent = JSON.parse(String(transport.mock.calls[1]?.[1]?.body));
  expect(sent.message.notification.body).toContain("needs you");
  expect(sent.message.data).toEqual({ route: "/map", type: "sos", id: "id" });
  expect(sent.message.android.notification.visibility).toBe("PRIVATE");
  expect(sent.message.android.notification.channel_id).toBe("alerts");
});
