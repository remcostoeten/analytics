# Examples

Each folder here is a small app that uses `@spoar/sdk` the way a real project would, one per stack, and is its own Bun workspace. Run one with `bun install` at the repo root and `bun run --cwd examples/<name> dev`. The docs site reads an example's source files from disk at build time, so a new example shows up at `/examples/<slug>` once it has an entry in `apps/docs/lib/examples.ts`.
