import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";

export async function GET() {
  const session = await requireSession();
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: session.id }, { isShared: true }],
    },
    orderBy: [{ isShared: "desc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await requireSession();
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, isShared } = parsed.data;
    const hasPartner = !!session.partnerId;
    const effectiveShared = hasPartner ? (isShared ?? false) : false;
    const category = await prisma.category.create({
      data: {
        name,
        userId: effectiveShared ? null : session.id,
        isShared: effectiveShared,
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
