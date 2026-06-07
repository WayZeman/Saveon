import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseStartDate, serializeReminder } from "@/lib/reminder-schedule";
import { reminderPatchSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;

  const existing = await prisma.reminder.findFirst({
    where: { id, userId: session.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = reminderPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: {
      message?: string;
      time?: string;
      startDate?: Date;
      interval?: string;
      timezone?: string;
      enabled?: boolean;
      lastTriggeredAt?: Date;
    } = {};

    if (parsed.data.message !== undefined) data.message = parsed.data.message.trim();
    if (parsed.data.time !== undefined) {
      const [hh, mm] = parsed.data.time.split(":").map(Number);
      if (hh > 23 || mm > 59) {
        return NextResponse.json({ error: "Невірний час" }, { status: 400 });
      }
      data.time = parsed.data.time;
    }
    if (parsed.data.startDate !== undefined) {
      const startDate = parseStartDate(parsed.data.startDate);
      if (!startDate) return NextResponse.json({ error: "Невірна дата" }, { status: 400 });
      data.startDate = startDate;
    }
    if (parsed.data.interval !== undefined) data.interval = parsed.data.interval;
    if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
    if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;

    if (parsed.data.markTriggered) {
      data.lastTriggeredAt = new Date();
      if (existing.interval === "once") {
        data.enabled = false;
      }
    }

    const row = await prisma.reminder.update({
      where: { id },
      data,
    });

    return NextResponse.json(serializeReminder(row));
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;

  const existing = await prisma.reminder.findFirst({
    where: { id, userId: session.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
