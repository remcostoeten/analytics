import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthEnabled, verifySessionToken } from "@/lib/auth";

let fallbackWarningEmitted = false;

/**
 * Every dashboard surface reads the analytics database, so reads are gated the
 * same as writes: pages render visitor-level history, user agents, geo and any
 * `identify()` traits, and `/api/analytics*` returns the same data as JSON.
 */
export function proxy(request: NextRequest) {
	if (!isAuthEnabled()) {
		if (!fallbackWarningEmitted && process.env.NODE_ENV === "production") {
			fallbackWarningEmitted = true;
			console.warn(
				"[auth] GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are not both set — " +
					"the dashboard and its analytics API are serving visitor data unauthenticated.",
			);
		}
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
	matcher: [
		"/((?!api/auth|auth/error|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webp)$).*)",
	],
};
