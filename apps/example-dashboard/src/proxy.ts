import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthEnabled, verifySessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
	if (!isAuthEnabled()) {
		return NextResponse.next();
	}

	if (request.method === "GET" || request.method === "HEAD") {
		return NextResponse.next();
	}

	const login = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
	if (login) {
		return NextResponse.next();
	}

	if (request.nextUrl.pathname.startsWith("/api/")) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.redirect(new URL("/api/auth/login", request.url));
}

export const config = {
	matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)"],
};
