import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Невірний формат даних", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Невірний email або пароль" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Невірний email або пароль" }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) {
    console.error("Login error:", e);
    const code = e && typeof (e as { code?: string }).code === "string" ? (e as { code: string }).code : "";
    const msg =
      code === "P1001" || code === "P1017"
        ? "База даних недоступна. Перезапустіть сервер."
        : "Помилка сервера";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
