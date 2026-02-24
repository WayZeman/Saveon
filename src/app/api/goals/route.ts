import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validations";

export async function GET() {
  const session = await requireSession();
  const goals = await prisma.goal.findMany({
    where: {
      OR: [{ createdBy: session.id }, { isShared: true }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdByUser: { select: { id: true, email: true, role: true } },
    },
  });
  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const session = await requireSession();
  try {
    const body = await request.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { title, targetAmount, isShared } = parsed.data;
    const hasPartner = !!session.partnerId;
    const effectiveShared = hasPartner ? (isShared ?? true) : false;
    const goal = await prisma.goal.create({
      data: {
        title,
        targetAmount,
        currentAmount: 0,
        createdBy: session.id,
        isShared: effectiveShared,
      },
      include: {
        createdByUser: { select: { id: true, email: true, role: true } },
      },
    });
    return NextResponse.json(goal);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
