# Bootstrap and initial repository setup

Outcome
A working monorepo skeleton that installs, typechecks, lints, and formats, with CI in GitHub Actions.

Decisions
- Package manager: Bun workspaces
- Shared dependency versions: Bun catalogs
- Tooling packages:
  - packages/ox/lint
  - packages/ox/fmt
  - packages/typescript

Files in this step
- Root:
  - package.json
  - tsconfig.json
  - README.md
  - LICENSE
  - .gitignore
  - .editorconfig
  - AGENTS.md
  - .github/workflows/ci.yml
- Shared packages:
  - packages/ox/lint
  - packages/ox/fmt
  - packages/typescript
- App scaffolds:
  - apps/ingestion
  - apps/dashboard
- Library scaffolds:
  - packages/sdk
  - packages/db

Commands
- bun install
- bun run typecheck
- bun run lint
- bun run fmt:check

Acceptance checks
- CI runs on push
- Lint and format checks pass
- Typecheck passes
