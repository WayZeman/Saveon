"use client";

export type PushPermissionState = "unsupported" | "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function getPushSupport(): PushPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PushPermissionState;
}

export async function subscribeToWebPush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const support = getPushSupport();
  if (support === "unsupported") {
    return { ok: false, reason: "unsupported" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, reason: permission === "denied" ? "denied" : "default" };
  }

  const keyRes = await fetch("/api/push/vapid-public-key");
  if (!keyRes.ok) {
    return { ok: false, reason: "no-vapid" };
  }
  const { publicKey } = (await keyRes.json()) as { publicKey?: string };
  if (!publicKey) {
    return { ok: false, reason: "no-vapid" };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  const saveRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });

  if (!saveRes.ok) {
    return { ok: false, reason: "save-failed" };
  }

  return { ok: true };
}

export async function unsubscribeFromWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

export async function syncExistingPushSubscription(): Promise<boolean> {
  if (getPushSupport() !== "granted") return false;
  const result = await subscribeToWebPush();
  return result.ok;
}
