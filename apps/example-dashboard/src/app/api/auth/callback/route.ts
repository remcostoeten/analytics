import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, isAuthEnabled } from "@/lib/auth";
import { sql } from "@/lib/db";

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string | null> {
	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({
			client_id: process.env.GITHUB_CLIENT_ID,
			client_secret: process.env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
		}),
	});
	if (!response.ok) {
		return null;
	}
	const data = (await response.json()) as { access_token?: string };
	return data.access_token ?? null;
}

async function fetchGithubLogin(accessToken: string): Promise<string | null> {
	const response = await fetch("https://api.github.com/user", {
		headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
	});
	if (!response.ok) {
		return null;
	}
	const data = (await response.json()) as { login?: string };
	return data.login ?? null;
}

export async function GET(request: NextRequest) {
	if (!isAuthEnabled()) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	const code = request.nextUrl.searchParams.get("code");
	const state = request.nextUrl.searchParams.get("state");
	const storedState = request.cookies.get("oauth_state")?.value;

	if (!code || !state || !storedState || state !== storedState) {
		return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
	}

	const redirectUri = new URL("/api/auth/callback", request.url).toString();
	const accessToken = await exchangeCodeForToken(code, redirectUri);
	if (!accessToken) {
		return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
	}

	const login = await fetchGithubLogin(accessToken);
	if (!login) {
		return NextResponse.json({ error: "Could not resolve GitHub user" }, { status: 502 });
	}

	const [allowed] = await sql`
    SELECT github_login FROM dashboard_users WHERE LOWER(github_login) = LOWER(${login}) LIMIT 1
  `;
	if (!allowed) {
		return NextResponse.json(
			{ error: `GitHub user "${login}" is not allowed. Add them to the dashboard_users table.` },
			{ status: 403 },
		);
	}

	const response = NextResponse.redirect(new URL("/", request.url));
	response.cookies.delete("oauth_state");
	response.cookies.set(SESSION_COOKIE, createSessionToken(login), {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: SESSION_TTL_MS / 1000,
		path: "/",
	});
	return response;
}
