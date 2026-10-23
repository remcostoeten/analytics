import type { GrantedRole } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

import { lines } from "./form";

const loginShape = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * @name loginOf
 * @description The GitHub login in whatever someone typed or pasted: a profile URL, an `@handle`
 * or the bare login, trimmed.
 *
 * @example
 * loginOf("https://github.com/octocat/"); // "octocat"
 * loginOf("@octocat"); // "octocat"
 */
export function loginOf(value: string) {
  // Strips an optional scheme and `github.com/`, a leading `@`, and anything after the login.
  const stripped = value
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/^@/, "");
  const end = stripped.search(/[/?#\s]/);
  return end === -1 ? stripped : stripped.slice(0, end);
}

/**
 * @name isLogin
 * @description Whether a string has the shape of a GitHub login: up to 39 letters, digits and
 * single dashes, starting with a letter or digit. It says nothing about whether the account
 * exists.
 *
 * @example
 * isLogin("octocat"); // true
 * isLogin("-bad-"); // false
 */
export function isLogin(value: string) {
  return loginShape.test(value);
}

/**
 * @name projectsOf
 * @description The project list of a member from the form: null for every project when the box is
 * ticked, otherwise the ids typed one per line, which may be none.
 *
 * @example
 * projectsOf(false, "docs\nskriuw"); // ["docs", "skriuw"]
 * projectsOf(true, "docs"); // null
 */
export function projectsOf(everyProject: boolean, value: string): Nullable<string[]> {
  return everyProject ? null : lines(value);
}

/**
 * @name grantedRoleOf
 * @description The role a select holds, falling back to the least powerful one.
 *
 * @example
 * grantedRoleOf("admin"); // "admin"
 * grantedRoleOf("owner"); // "viewer"
 */
export function grantedRoleOf(value: string): GrantedRole {
  return value === "admin" || value === "analyst" ? value : "viewer";
}

/**
 * @name inviteMessage
 * @description The text an owner pastes to someone just allowed to sign in: where to go and which
 * account to use.
 *
 * @example
 * inviteMessage("octocat", "https://docs.analytics.remcostoeten.nl");
 */
export function inviteMessage(login: string, origin: string) {
  return `You can now sign in to the analytics dashboard with your GitHub account ${login}: ${origin}/dashboard`;
}

/**
 * @name avatarOf
 * @description GitHub's avatar URL for a member: by numeric id when it is known, otherwise by
 * login.
 *
 * @example
 * avatarOf("octocat", "583231"); // "https://avatars.githubusercontent.com/u/583231?s=48"
 */
export function avatarOf(login: string, githubId: Nullable<string>) {
  return githubId === null
    ? `https://github.com/${encodeURIComponent(login)}.png?size=48`
    : `https://avatars.githubusercontent.com/u/${githubId}?s=48`;
}

/**
 * @name formatSignIn
 * @description A member's last sign-in as its UTC day, or "never" before the first one.
 *
 * @example
 * formatSignIn("2026-10-13T08:12:00.000Z"); // "2026-10-13"
 * formatSignIn(null); // "never"
 */
export function formatSignIn(value: Nullable<string>) {
  return value === null ? "never" : value.slice(0, 10);
}
