import { connection, NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, isAuthEnabled } from "@/lib/auth";
import { authErrorUrl, type AuthErrorCode } from "@/lib/auth-errors";
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
		console.error("[auth] token exchange failed:", response.status, await response.text());
		return null;
	}
	const data = (await response.json()) as { access_token?: string; error?: string };
	if (data.error) {
		console.error("[auth] token exchange rejected:", data.error);
	}
	return data.access_token ?? null;
}

async function fetchGithubLogin(accessToken: string): Promise<string | null> {
	const response = await fetch("https://api.github.com/user", {
		headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
	});
	if (!response.ok) {
		console.error("[auth] user lookup failed:", response.status, await response.text());
		return null;
	}
	const data = (await response.json()) as { login?: string };
	return data.login ?? null;
}

function failWith(request: NextRequest, code: AuthErrorCode, login?: string) {
	const response = NextResponse.redirect(authErrorUrl(request.url, code, login));
	response.cookies.delete("oauth_state");
	return response;
}

async function handleCallback(request: NextRequest) {
	const params = request.nextUrl.searchParams;

	if (params.get("error")) {
		const githubError = params.get("error");
		if (githubError !== "access_denied") {
			console.error("[auth] GitHub returned error:", githubError, params.get("error_description"));
		}
		return failWith(request, githubError === "access_denied" ? "access_denied" : "unexpected");
	}

	const code = params.get("code");
	const state = params.get("state");
	const storedState = request.cookies.get("oauth_state")?.value;

	if (!code || !state || !storedState || state !== storedState) {
		return failWith(request, "invalid_state");
	}

	const redirectUri = new URL("/api/auth/callback", request.url).toString();
	const accessToken = await exchangeCodeForToken(code, redirectUri);
	if (!accessToken) {
		return failWith(request, "token_exchange_failed");
	}

	const login = await fetchGithubLogin(accessToken);
	if (!login) {
		return failWith(request, "user_lookup_failed");
	}

	const [allowed] = await sql`
    SELECT github_login FROM dashboard_users WHERE LOWER(github_login) = LOWER(${login}) LIMIT 1
  `;
	if (!allowed) {
		return failWith(request, "not_allowed", login);
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

export async function GET(request: NextRequest) {
	await connection();

	if (!isAuthEnabled()) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	try {
		return await handleCallback(request);
	} catch (error) {
		console.error("[auth] callback failed:", error);
		return failWith(request, "unexpected");
	}
}
