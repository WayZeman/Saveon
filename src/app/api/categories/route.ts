import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoriesManageWhere } from "@/lib/data-scope";
import { categorySchema } from "@/lib/validations";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const categories = await prisma.category.findMany({
    where: categoriesManageWhere(session),
    orderBy: [{ tier: "asc" }, { isShared: "desc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, isShared, tier } = parsed.data;
    const hasPartner = !!session.partnerId;
    const effectiveShared = hasPartner ? (isShared ?? false) : false;
    const category = await prisma.category.create({
      data: {
        name,
        userId: effectiveShared ? null : session.id,
        createdBy: session.id,
        isShared: effectiveShared,
        tier: tier ?? "primary",
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
