# Marketing POC

Throwaway landing pages for testing marketing ideas. Nothing here is deployed or shared with the other workspaces.

Each landing lives under its own route and its own folder in `features/`. The index at `/` lists them.

```sh
bun run --cwd apps/marketing-poc dev
```

Runs on port 3300.

`bun run build` writes the static export to `out/`. `bun run bundle` then renders `/stackly` with react-dom and bundles its client code with Bun into `out/standalone/`, a single `index.html` plus `app.js` that hydrates anywhere, including the claude.ai artifact used for review.
