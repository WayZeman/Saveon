import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoriesVisibleWhere } from "@/lib/data-scope";
import { categorySchema } from "@/lib/validations";

function isSchemaMismatchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("P2022") || message.includes("does not exist");
}

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  try {
    const categories = await prisma.category.findMany({
      where: categoriesVisibleWhere(session),
      orderBy: [{ isShared: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        marketSymbol: true,
        isShared: true,
        userId: true,
        _count: { select: { transactions: true } },
      },
    });
    return NextResponse.json(categories);
  } catch (e) {
    if (!isSchemaMismatchError(e)) throw e;
    const categories = await prisma.category.findMany({
      where: categoriesVisibleWhere(session),
      orderBy: [{ isShared: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        isShared: true,
        userId: true,
        _count: { select: { transactions: true } },
      },
    });
    return NextResponse.json(categories.map((c) => ({ ...c, marketSymbol: null })));
  }
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
    const { name, isShared, marketSymbol } = parsed.data;
    const hasPartner = !!session.partnerId;
    const effectiveShared = hasPartner ? (isShared ?? false) : false;
    let category;
    try {
      category = await prisma.category.create({
        data: {
          name,
          marketSymbol: marketSymbol ? marketSymbol.trim().toUpperCase() : null,
          userId: effectiveShared ? null : session.id,
          createdBy: session.id,
          isShared: effectiveShared,
        },
      });
    } catch (e) {
      if (!isSchemaMismatchError(e)) throw e;
      category = await prisma.category.create({
        data: {
          name,
          userId: effectiveShared ? null : session.id,
          createdBy: session.id,
          isShared: effectiveShared,
        },
      });
    }
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
