"use client";

import { useEffect } from "react";
import { syncExistingPushSubscription } from "@/lib/push-client";

/** Підтримує push-підписку, якщо користувач уже дозволив сповіщення. */
export function PushNotificationsSetup() {
  useEffect(() => {
    syncExistingPushSubscription().catch(() => undefined);
  }, []);

  return null;
}
