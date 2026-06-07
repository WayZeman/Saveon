import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeReminder, shouldTriggerReminder } from "@/lib/reminder-schedule";
import { sendWebPush } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reminders = await prisma.reminder.findMany({
    where: { enabled: true },
    include: {
      user: {
        include: {
          pushSubscriptions: true,
        },
      },
    },
  });

  const now = new Date();
  let triggered = 0;
  let sent = 0;
  const expiredEndpoints: string[] = [];

  for (const row of reminders) {
    const record = serializeReminder(row);
    if (!shouldTriggerReminder(record, now)) continue;

    const subscriptions = row.user.pushSubscriptions;
    if (subscriptions.length === 0) continue;

    triggered++;
    let delivered = false;

    for (const sub of subscriptions) {
      try {
        const ok = await sendWebPush(sub, {
          title: "Saveon",
          body: row.message,
          url: "/dashboard",
        });
        if (ok) {
          sent++;
          delivered = true;
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "subscription-expired") {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    if (delivered) {
      await prisma.reminder.update({
        where: { id: row.id },
        data: {
          lastTriggeredAt: now,
          ...(row.interval === "once" ? { enabled: false } : {}),
        },
      });
    }
  }

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }

  return NextResponse.json({ ok: true, triggered, sent, cleaned: expiredEndpoints.length });
}
