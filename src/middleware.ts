import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/api/auth/login", "/api/auth/register", "/api/auth/reset-password"];
const apiAuthPaths = ["/api/auth/login", "/api/auth/logout", "/api/auth/register", "/api/auth/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Статичні файли з public — віддавати без перевірки авторизації (логотип, іконки, manifest)
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico") ||
    /\.(png|ico|svg|json|webmanifest)$/i.test(pathname) ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("family_fin_session")?.value;

  if (pathname.startsWith("/api/") && !apiAuthPaths.some((p) => pathname === p)) {
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
