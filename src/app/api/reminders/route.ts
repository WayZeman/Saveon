import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseStartDate, serializeReminder } from "@/lib/reminder-schedule";
import { reminderSchema } from "@/lib/validations";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;

  const rows = await prisma.reminder.findMany({
    where: { userId: session.id },
    orderBy: [{ enabled: "desc" }, { time: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(rows.map(serializeReminder));
}

export async function POST(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;

  try {
    const body = await request.json();
    const parsed = reminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const startDate = parseStartDate(parsed.data.startDate);
    if (!startDate) {
      return NextResponse.json({ error: "Невірна дата" }, { status: 400 });
    }

    const [hh, mm] = parsed.data.time.split(":").map(Number);
    if (hh > 23 || mm > 59) {
      return NextResponse.json({ error: "Невірний час" }, { status: 400 });
    }

    const row = await prisma.reminder.create({
      data: {
        userId: session.id,
        message: parsed.data.message.trim(),
        time: parsed.data.time,
        startDate,
        interval: parsed.data.interval,
        timezone: parsed.data.timezone ?? "Europe/Kyiv",
        enabled: parsed.data.enabled ?? true,
      },
    });

    return NextResponse.json(serializeReminder(row));
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
