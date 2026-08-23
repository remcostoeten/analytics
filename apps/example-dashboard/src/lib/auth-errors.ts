const AUTH_ERROR_CODES = [
	"access_denied",
	"invalid_state",
	"token_exchange_failed",
	"user_lookup_failed",
	"not_allowed",
	"unexpected",
] as const;

type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

type AuthErrorCopy = {
	title: string;
	description: string;
};

function isAuthErrorCode(value: string | undefined): value is AuthErrorCode {
	return AUTH_ERROR_CODES.includes(value as AuthErrorCode);
}

function getAuthErrorCopy(code: AuthErrorCode, login?: string): AuthErrorCopy {
	switch (code) {
		case "access_denied":
			return {
				title: "Sign-in cancelled",
				description: "You cancelled the GitHub authorization. Nothing was changed.",
			};
		case "invalid_state":
			return {
				title: "Sign-in expired",
				description:
					"The sign-in request could not be verified. It may have expired or been opened in a different browser. Start again.",
			};
		case "token_exchange_failed":
			return {
				title: "GitHub did not accept the sign-in",
				description:
					"The authorization code could not be exchanged for a token. This usually means the code expired or the OAuth app is misconfigured.",
			};
		case "user_lookup_failed":
			return {
				title: "Could not read your GitHub profile",
				description: "GitHub signed you in but did not return a username. Try again in a moment.",
			};
		case "not_allowed":
			return {
				title: "Account not allowed",
				description: login
					? `GitHub account "${login}" is not on the dashboard allowlist. Ask an admin to add it to the dashboard_users table.`
					: "This GitHub account is not on the dashboard allowlist. Ask an admin to add it to the dashboard_users table.",
			};
		case "unexpected":
			return {
				title: "Something went wrong",
				description:
					"An unexpected error interrupted the sign-in. It has been logged. Try again in a moment.",
			};
	}
}

function authErrorUrl(base: string | URL, code: AuthErrorCode, login?: string): URL {
	const url = new URL("/auth/error", base);
	url.searchParams.set("code", code);
	if (login) {
		url.searchParams.set("login", login);
	}
	return url;
}

export { isAuthErrorCode, getAuthErrorCopy, authErrorUrl };
export type { AuthErrorCode };
