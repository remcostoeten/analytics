# Create folder structure and commit baseline

Outcome
The repo has all intended folders and placeholder package metadata so future steps can add logic without reorganizing.

Folder structure
- apps/ingestion
- apps/dashboard
- packages/sdk
- packages/db
- packages/ox/lint
- packages/ox/fmt
- packages/typescript
- docs

Scope
- Create directories
- Add placeholder package.json files for apps and packages
- Wire workspaces in root package.json

Acceptance checks
- bun install works
- workspace detection is correct
- root scripts execute without missing workspace errors
