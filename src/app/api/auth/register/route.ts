import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

const SESSION_COOKIE = "family_fin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Невірний формат даних" },
        { status: 400 }
      );
    }

    const { name, email, password, recoveryCode } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Акаунт з цим email вже існує" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const hashedRecoveryCode = await hashPassword(recoveryCode);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        recoveryCode: hashedRecoveryCode,
        role: "user",
      },
    });

    // 🔥 Створюємо response
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    // 🔥 Ставимо cookie прямо в response
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;

  } catch (e) {
    const err = e as Error & { code?: string };
    console.error("Register error:", err);

    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Акаунт з цим email вже існує" },
        { status: 409 }
      );
    }

    if (
      err.code === "P2010" ||
      err.message?.includes("recoveryCode") ||
      err.message?.includes("column")
    ) {
      return NextResponse.json(
        {
          error:
            "Оновіть базу даних: виконайте npm run db:migrate або npx prisma migrate deploy",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Помилка сервера",
      },
      { status: 500 }
    );
  }
}
