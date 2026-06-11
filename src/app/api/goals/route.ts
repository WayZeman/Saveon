import { NextResponse } from "next/server";
import { getRequiredSession, isApiUnauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalsVisibleWhere } from "@/lib/data-scope";
import { goalListInclude, syncGoalSourceCategories, validateGoalSourceCategoryIds } from "@/lib/goal-api";
import { parseGoalDeadline } from "@/lib/goal-dates";
import { mapGoalSourceCategories } from "@/lib/goal-balance";
import { goalSchema } from "@/lib/validations";

export async function GET() {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  const goals = await prisma.goal.findMany({
    where: goalsVisibleWhere(session),
    orderBy: { createdAt: "desc" },
    include: goalListInclude,
  });
  return NextResponse.json(goals.map(mapGoalSourceCategories));
}

export async function POST(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;
  try {
    const body = await request.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { title, targetAmount, isShared, sourceCategoryIds, description, deadline } = parsed.data;
    const resolvedIds = await validateGoalSourceCategoryIds(session, sourceCategoryIds);
    if (!resolvedIds) {
      return NextResponse.json({ error: "Invalid source categories" }, { status: 400 });
    }
    const hasPartner = !!session.partnerId;
    const effectiveShared = hasPartner ? (isShared ?? true) : false;
    const goal = await prisma.goal.create({
      data: {
        title,
        description: description?.trim() || null,
        targetAmount,
        currentAmount: 0,
        deadline: deadline ? parseGoalDeadline(deadline) : null,
        createdBy: session.id,
        isShared: effectiveShared,
      },
      include: goalListInclude,
    });
    await syncGoalSourceCategories(goal.id, resolvedIds);
    const withCategories = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: goalListInclude,
    });
    return NextResponse.json(mapGoalSourceCategories(withCategories!));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
