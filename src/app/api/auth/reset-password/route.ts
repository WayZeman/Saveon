import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = resetPasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message ?? "Невірний формат даних" },
                { status: 400 }
            );
        }
        const { email, recoveryCode, newPassword } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const isValidCode = await verifyPassword(recoveryCode, user.recoveryCode || "");
            if (!isValidCode) {
                return NextResponse.json({ error: "Невірний код відновлення" }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
        }

        const hashedPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        try {
            await createSession(user.id);
        } catch (sessionErr) {
            console.error("ResetPassword: createSession failed", sessionErr);
            return NextResponse.json(
                { error: "Пароль оновлено, але не вдалося ввійти. Спробуйте увійти вручну.", needLogin: true },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { message: "Пароль успішно змінено", user: { id: user.id, name: user.name, email: user.email, role: user.role } },
            { status: 200 }
        );
    } catch (e) {
        const err = e as Error;
        console.error("ResetPassword error:", err);
        return NextResponse.json(
            { error: process.env.NODE_ENV === "development" ? err.message : "Помилка сервера" },
            { status: 500 }
        );
    }
}
