import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPartnerSchema } from "@/lib/validations";

export async function GET() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { partnerId: true },
  });
  if (!user?.partnerId) {
    return NextResponse.json({ partner: null });
  }
  const partner = await prisma.user.findUnique({
    where: { id: user.partnerId },
    select: { id: true, email: true, role: true },
  });
  return NextResponse.json({ partner });
}

export async function POST(request: Request) {
  const session = await requireSession();
  try {
    const body = await request.json();
    const parsed = addPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Невірні дані" },
        { status: 400 }
      );
    }
    const { email, role } = parsed.data;

    if (email === session.email) {
      return NextResponse.json({ error: "Не можна додати себе як партнера" }, { status: 400 });
    }

    const me = await prisma.user.findUnique({ where: { id: session.id } });
    if (me?.partnerId) {
      return NextResponse.json({ error: "У вас вже є партнер. Спочатку видаліть поточного" }, { status: 409 });
    }

    const partner = await prisma.user.findUnique({ where: { email } });
    if (!partner) {
      return NextResponse.json({ error: "Користувача з таким email не знайдено" }, { status: 404 });
    }
    if (partner.partnerId && partner.partnerId !== session.id) {
      return NextResponse.json({ error: "Цей користувач вже має іншого партнера" }, { status: 409 });
    }

    const myRole = role === "friend" ? "friend" : role === "husband" ? "wife" : "husband";

    await prisma.$transaction([
      prisma.user.update({ where: { id: session.id }, data: { partnerId: partner.id, role: myRole } }),
      prisma.user.update({ where: { id: partner.id }, data: { partnerId: session.id, role } }),
    ]);

    return NextResponse.json({
      partner: { id: partner.id, email: partner.email, role },
    });
  } catch (e) {
    console.error("Add partner error:", e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await requireSession();
  try {
    const me = await prisma.user.findUnique({ where: { id: session.id } });
    if (!me?.partnerId) {
      return NextResponse.json({ error: "У вас немає партнера" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: session.id }, data: { partnerId: null, role: "user" } }),
      prisma.user.update({ where: { id: me.partnerId }, data: { partnerId: null, role: "user" } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Remove partner error:", e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
