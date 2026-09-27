# 0008 Admin sign-in

## Context

The v1 dashboard has its own GitHub OAuth routes. v2 moves reads into the API, so sign-in has to live there too, and the repo has a rule against cookies.

## Decision

Recommended default: GitHub OAuth in the API through Better Auth, checked against the `dashboard_users` allowlist, with an admin-only session cookie. The no-cookies rule is read as covering tracked visitors only.

## Status

Open, default. Source: row 8 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- The API and dashboard need to be subdomains of one site for the cookie to work.
- The dashboard's own OAuth routes retire in phase 4.
- Tracked visitors still get no cookies.
