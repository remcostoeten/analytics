# 0008 Admin sign-in

## Context

The v1 dashboard has its own GitHub OAuth routes. v2 moves reads into the API, so sign-in has to live there too, and the repo has a rule against cookies.

## Decision

Better Auth in the API with an admin-only session cookie. GitHub OAuth for logins on the `dashboard_users` allowlist, and email and password for people who register through a single-use invite link from `POST /v2/invites`. No open registration, no email verification and no password reset. The no-cookies rule is read as covering tracked visitors only.

## Status

Settled. Source: row 8 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- The API and dashboard need to be subdomains of one site for the cookie to work.
- The dashboard's own OAuth routes retire in phase 4.
- Tracked visitors still get no cookies.
- Someone without GitHub joins through an invite; a forgotten password means a new invite.
- Owners and admins manage members through `/v2/members`.
