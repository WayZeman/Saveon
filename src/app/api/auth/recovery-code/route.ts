import { NextResponse } from "next/server";
import { getRequiredSession, hashPassword, isApiUnauthorized, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeRecoveryCodeSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
  const sessionOr = await getRequiredSession();
  if (isApiUnauthorized(sessionOr)) return sessionOr;
  const session = sessionOr;

  try {
    const body = await request.json();
    const parsed = changeRecoveryCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Невірний формат даних" },
        { status: 400 }
      );
    }
    const { password, recoveryCode } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      return NextResponse.json({ error: "Невірний пароль" }, { status: 401 });
    }

    const hashedRecoveryCode = await hashPassword(recoveryCode);
    await prisma.user.update({
      where: { id: session.id },
      data: { recoveryCode: hashedRecoveryCode },
    });

    return NextResponse.json({ message: "Код відновлення оновлено" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
