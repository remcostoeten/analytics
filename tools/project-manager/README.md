# project-manager

Small terminal project manager for this monorepo.

## Current commands

- tests
- help
- exit

## Tests menu behavior

- run all tests: runs `bun run test` at repo root
- package test entries: discovered by scanning `packages/*` for test dirs
- supported test dir names: `__test__`, `__tests__`, `_tests_`

Each discovered test directory is listed as its own menu item and runs:

`bun test --cwd <package-path> <test-dir-relative-path>`

## Run

From repo root:

`go run ./tools/project-manager`
