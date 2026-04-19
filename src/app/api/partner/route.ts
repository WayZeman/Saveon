import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addPartnerSchema } from "@/lib/validations";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { partnerId: true },
  });

  let partner: { id: string; email: string; role: string } | null = null;
  if (user?.partnerId) {
    const p = await prisma.user.findUnique({
      where: { id: user.partnerId },
      select: { id: true, email: true, role: true },
    });
    partner = p ?? null;
  }

  if (user?.partnerId) {
    return NextResponse.json({
      partner,
      incomingInvite: null,
      outgoingInvite: null,
    });
  }

  const incomingInviteRaw = await prisma.partnerInvite.findFirst({
    where: { toUserId: session.id, status: "pending" },
    include: {
      fromUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const outgoingInviteRaw = await prisma.partnerInvite.findFirst({
    where: { fromUserId: session.id, status: "pending" },
    include: {
      toUser: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const incomingInvite = incomingInviteRaw
    ? {
        id: incomingInviteRaw.id,
        recipientRole: incomingInviteRaw.recipientRole,
        createdAt: incomingInviteRaw.createdAt.toISOString(),
        fromUser: incomingInviteRaw.fromUser,
      }
    : null;

  const outgoingInvite = outgoingInviteRaw
    ? {
        id: outgoingInviteRaw.id,
        toEmail: outgoingInviteRaw.toUser.email,
        recipientRole: outgoingInviteRaw.recipientRole,
        createdAt: outgoingInviteRaw.createdAt.toISOString(),
      }
    : null;

  return NextResponse.json({ partner, incomingInvite, outgoingInvite });
}

export async function POST(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
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

    const pendingOutgoing = await prisma.partnerInvite.findFirst({
      where: { fromUserId: session.id, status: "pending" },
    });
    if (pendingOutgoing) {
      return NextResponse.json(
        { error: "У вас вже є активний запрошення. Скасуйте його або дочекайтеся відповіді." },
        { status: 409 }
      );
    }

    const pendingIncoming = await prisma.partnerInvite.findFirst({
      where: { toUserId: session.id, status: "pending" },
    });
    if (pendingIncoming) {
      return NextResponse.json(
        { error: "Спочатку відповідьте на вхідне запрошення до спільного рахунку." },
        { status: 409 }
      );
    }

    const partner = await prisma.user.findUnique({ where: { email } });
    if (!partner || (partner.partnerId && partner.partnerId !== session.id)) {
      return NextResponse.json(
        { error: "Не вдалося додати партнера. Перевірте email або стан акаунту." },
        { status: 400 }
      );
    }

    const pendingBetween = await prisma.partnerInvite.findFirst({
      where: {
        status: "pending",
        OR: [
          { fromUserId: session.id, toUserId: partner.id },
          { fromUserId: partner.id, toUserId: session.id },
        ],
      },
    });
    if (pendingBetween) {
      return NextResponse.json(
        { error: "Між вами вже є запрошення. Дочекайтеся відповіді або скасуйте його." },
        { status: 409 }
      );
    }

    const invite = await prisma.partnerInvite.create({
      data: {
        fromUserId: session.id,
        toUserId: partner.id,
        recipientRole: role,
        status: "pending",
      },
    });

    return NextResponse.json({
      pending: true,
      invite: {
        id: invite.id,
        toEmail: partner.email,
        recipientRole: role,
        createdAt: invite.createdAt.toISOString(),
      },
      message: "Запрошення надіслано. Другий учасник має прийняти його в додатку.",
    });
  } catch (e) {
    console.error("Add partner error:", e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}

export async function DELETE() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
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
