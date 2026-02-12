# Add Oxlint and Oxfmt tooling

Outcome
Repo uses oxlint and oxfmt via shared packages, with root scripts that run across the monorepo and CI enforcing them.

Scope
- packages/ox/lint provides shared oxlint config and scripts
- packages/ox/fmt provides shared oxfmt config and scripts
- Root scripts:
  - lint
  - fmt
  - fmt:check
  - typecheck

Acceptance checks
- bun run lint passes
- bun run fmt:check passes
- CI fails if lint or format checks fail
