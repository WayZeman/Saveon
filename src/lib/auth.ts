import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { ensureAssetSchema } from "./ensure-asset-schema";
import { getSessionSecret, signSessionToken, verifySessionToken } from "./session-token";

const SESSION_COOKIE = "family_fin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  partnerId: string | null;
  avatarEmoji: string | null;
};

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const secret = getSessionSecret();
  const token = await signSessionToken(userId, secret);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const secret = getSessionSecret();
  const userId = await verifySessionToken(value, secret);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, partnerId: true, avatarEmoji: true },
  });
  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Для API route handlers: завжди перевіряйте результат через isApiUnauthorized */
export async function getRequiredSession(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureAssetSchema();
  return session;
}

export function isApiUnauthorized(res: SessionUser | NextResponse): res is NextResponse {
  return res instanceof NextResponse;
}

/** Викидає помилку — у route handlers краще getRequiredSession */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
