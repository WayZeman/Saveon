import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { senderRoleForPair } from "@/lib/partner-invite";

/** Скасувати власне відправлене запрошення */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;

  const invite = await prisma.partnerInvite.findFirst({
    where: { id, fromUserId: session.id, status: "pending" },
  });
  if (!invite) {
    return NextResponse.json({ error: "Запрошення не знайдено" }, { status: 404 });
  }

  await prisma.partnerInvite.update({
    where: { id },
    data: { status: "cancelled", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

type ActionBody = { action: "accept" | "reject" };

/** Прийняти або відхилити запрошення (лише одержувач) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const { id } = await params;

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "Невірні дані" }, { status: 400 });
  }
  if (body.action !== "accept" && body.action !== "reject") {
    return NextResponse.json({ error: "Очікується action: accept або reject" }, { status: 400 });
  }

  const invite = await prisma.partnerInvite.findFirst({
    where: { id, toUserId: session.id, status: "pending" },
  });
  if (!invite) {
    return NextResponse.json({ error: "Запрошення не знайдено" }, { status: 404 });
  }

  if (body.action === "reject") {
    await prisma.partnerInvite.update({
      where: { id },
      data: { status: "rejected", respondedAt: new Date() },
    });
    return NextResponse.json({ ok: true, rejected: true });
  }

  const me = await prisma.user.findUnique({ where: { id: session.id } });
  const fromUser = await prisma.user.findUnique({ where: { id: invite.fromUserId } });
  if (!me || !fromUser) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 400 });
  }
  if (me.partnerId || fromUser.partnerId) {
    return NextResponse.json(
      { error: "Неможливо прийняти: один із акаунтів уже має партнера" },
      { status: 409 }
    );
  }

  const recipientRole = invite.recipientRole as "husband" | "wife" | "friend";
  const senderRole = senderRoleForPair(recipientRole);

  await prisma.$transaction(async (tx) => {
    await tx.partnerInvite.updateMany({
      where: {
        status: "pending",
        id: { not: id },
        OR: [
          { toUserId: session.id },
          { fromUserId: session.id },
          { toUserId: invite.fromUserId },
          { fromUserId: invite.fromUserId },
        ],
      },
      data: { status: "rejected", respondedAt: new Date() },
    });

    await tx.partnerInvite.update({
      where: { id },
      data: { status: "accepted", respondedAt: new Date() },
    });

    await tx.user.update({
      where: { id: invite.fromUserId },
      data: { partnerId: invite.toUserId, role: senderRole },
    });
    await tx.user.update({
      where: { id: invite.toUserId },
      data: { partnerId: invite.fromUserId, role: recipientRole },
    });
  });

  const partner = await prisma.user.findUnique({
    where: { id: invite.fromUserId },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({
    ok: true,
    accepted: true,
    partner: partner ?? undefined,
  });
}
