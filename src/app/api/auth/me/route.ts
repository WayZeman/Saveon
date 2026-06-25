import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAllowedProfileEmoji } from "@/lib/profile-avatar";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(session);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { avatarEmoji?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!("avatarEmoji" in body)) {
    return NextResponse.json({ error: "avatarEmoji is required" }, { status: 400 });
  }

  const avatarEmoji =
    body.avatarEmoji === null || body.avatarEmoji === "" ? null : String(body.avatarEmoji);

  if (!isAllowedProfileEmoji(avatarEmoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: { avatarEmoji },
    select: { id: true, name: true, email: true, role: true, partnerId: true, avatarEmoji: true },
  });

  return NextResponse.json(user);
}
