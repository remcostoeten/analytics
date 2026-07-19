import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAuthEnabled } from "@/lib/auth";

export function GET(request: NextRequest) {
	if (!isAuthEnabled()) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	const state = randomBytes(16).toString("hex");
	const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
	authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
	authorizeUrl.searchParams.set(
		"redirect_uri",
		new URL("/api/auth/callback", request.url).toString(),
	);
	authorizeUrl.searchParams.set("state", state);

	const response = NextResponse.redirect(authorizeUrl);
	response.cookies.set("oauth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 600,
		path: "/",
	});
	return response;
}
