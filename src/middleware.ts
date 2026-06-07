import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionSecret, verifySessionToken } from "@/lib/session-token";

const publicPaths = ["/", "/login", "/api/auth/login", "/api/auth/register", "/api/auth/reset-password"];
const apiAuthPaths = ["/api/auth/login", "/api/auth/logout", "/api/auth/register", "/api/auth/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDevPreview =
    process.env.NODE_ENV !== "production" &&
    request.nextUrl.searchParams.get("preview") === "1";

  if (
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico") ||
    /\.(png|ico|svg|json|webmanifest|js)$/i.test(pathname) ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("family_fin_session")?.value;
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return NextResponse.json({ error: "Сервер не налаштовано (SESSION_SECRET)" }, { status: 500 });
  }

  if (pathname.startsWith("/api/") && !apiAuthPaths.some((p) => pathname === p)) {
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = await verifySessionToken(sessionCookie, secret);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  if (isDevPreview && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const userId = await verifySessionToken(sessionCookie, secret);
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
