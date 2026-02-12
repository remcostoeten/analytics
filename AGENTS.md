# AGENTS.md

This repository is owned and designed by Remco.

All agents working on this codebase must follow the conventions below unless explicitly instructed otherwise.

Core philosophy
- Prioritize simplicity, correctness, and boring reliability.
- Avoid premature abstraction.
- Prefer composable primitives.
- No comments, code must be self explanatory.
- Centralized ingestion, thin clients.
- Data first, UI second.

Language and runtime
- TypeScript everywhere.
- Node runtime for ingestion on Vercel serverless.
- React and Next.js for dashboard and SDK integration.
- Hono is acceptable for ingestion routing.

Code style rules
- Use type, never interface.
- Use function declarations, never arrow functions, never classes.
- Names should ideally be max two words.
- File names must be kebab-case.
- No comments.

Project structure
Module based folders when applicable:
- components
- hooks
- utilities
- types
- api/queries
- api/mutations

Only use barrel index.ts when a folder has multiple exports.

React and Next.js
- Prefer server actions when applicable.
- Prefer modern hooks when relevant.
- Full page code only, not partial snippets.
- Dark neutral UI only, no emojis.

SDK rules
- Package: @remcostoeten/analytics
- Export Analytics component, optional track helper.
- SDK must never contain database logic.
- SDK only sends events to ingestion endpoint.
- projectId defaults to hostname, overrides by prop or env.

Database
- Postgres on Neon.
- Drizzle ORM.
- Schema lives in packages/db.

Tooling
- Bun workspaces.
- Bun catalogs for dependency version sharing.
- Oxlint for linting.
- Oxfmt for formatting.
