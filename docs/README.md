# Analytics Documentation

Complete specification and implementation guide for Remco Analytics.

## Overview

Private, first-party analytics platform with centralized ingestion, thin SDK clients, and single Postgres database.

## Core Documents

### Planning and Architecture

- **[00-spec.md](./00-spec.md)** - Main specification document, high-level architecture, milestones
- **[01-bootstrap.md](./01-bootstrap.md)** - Repository setup, monorepo structure, tooling
- **[02-structure.md](./02-structure.md)** - Folder organization and workspace layout
- **[03-ox-tools.md](./03-ox-tools.md)** - Linting and formatting with oxlint and oxfmt

### Implementation Specs

- **[04-ingestion.md](./04-ingestion.md)** - Ingestion service endpoints and deployment
- **[05-data-and-dashboard.md](./05-data-and-dashboard.md)** - Dashboard queries and UI components
- **[06-schema.md](./06-schema.md)** - Complete database schema with indexes and constraints
- **[07-geo-and-ip.md](./07-geo-and-ip.md)** - Geographic lookup and IP address handling
- **[08-visitor-session-ids.md](./08-visitor-session-ids.md)** - Client-side identity strategy
- **[09-bot-filtering.md](./09-bot-filtering.md)** - Bot detection and traffic quality
- **[10-deduplication.md](./10-deduplication.md)** - Event deduplication strategy
- **[11-sdk-usage.md](./11-sdk-usage.md)** - SDK API reference and usage examples
- **[12-testing-strategy.md](./12-testing-strategy.md)** - Comprehensive testing approach
- **[13-git-workflow.md](./13-git-workflow.md)** - Git branching and commit conventions

## Quick Navigation

### For Implementation

| Task | Document |
|------|----------|
| Set up monorepo | [01-bootstrap.md](./01-bootstrap.md) |
| Create database schema | [06-schema.md](./06-schema.md) |
| Build ingestion endpoint | [04-ingestion.md](./04-ingestion.md), [07-geo-and-ip.md](./07-geo-and-ip.md) |
| Add bot filtering | [09-bot-filtering.md](./09-bot-filtering.md) |
| Prevent duplicates | [10-deduplication.md](./10-deduplication.md) |
| Build SDK | [08-visitor-session-ids.md](./08-visitor-session-ids.md), [11-sdk-usage.md](./11-sdk-usage.md) |
| Create dashboard | [05-data-and-dashboard.md](./05-data-and-dashboard.md) |
| Write tests | [12-testing-strategy.md](./12-testing-strategy.md) |
| Set up git workflow | [13-git-workflow.md](./13-git-workflow.md) |

### For Integration

| Need | Document |
|------|----------|
| Install SDK | [11-sdk-usage.md](./11-sdk-usage.md#installation) |
| Track page views | [11-sdk-usage.md](./11-sdk-usage.md#quick-start) |
| Track custom events | [11-sdk-usage.md](./11-sdk-usage.md#track-function-api) |
| Configure environment | [11-sdk-usage.md](./11-sdk-usage.md#environment-configuration) |
| TypeScript types | [11-sdk-usage.md](./11-sdk-usage.md#typescript-support) |
| Run tests | [12-testing-strategy.md](./12-testing-strategy.md) |
| Create branches | [13-git-workflow.md](./13-git-workflow.md) |

## Architecture Summary

```
┌─────────────────┐
│   Web Browser   │
│  (Client Side)  │
└────────┬────────┘
         │
         │ HTTPS POST /ingest
         │ (sendBeacon or fetch)
         │
         ▼
┌─────────────────┐
│   Ingestion     │──────► Bot Detection (09)
│   Service       │──────► Geo Lookup (07)
│   (Hono/Node)   │──────► IP Hashing (07)
└────────┬────────┘──────► Dedupe Check (10)
         │
         │ SQL INSERT
         │
         ▼
┌─────────────────┐
│  Neon Postgres  │
│  (Single DB)    │◄───── Schema (06)
└────────┬────────┘
         │
         │ SQL SELECT
         │
         ▼
┌─────────────────┐
│   Dashboard     │
│   (Next.js)     │──────► Queries (05)
└─────────────────┘
```

## Implementation Status

### Completed ✅
- M0: Monorepo bootstrap
- M0: Bun workspaces and catalogs
- M0: Oxlint/oxfmt tooling
- M0: CI pipeline
- M1: Basic Hono health endpoint

### In Progress 🚧
- M1: POST /ingest implementation
- M1: Database schema and migrations
- M1: Neon connection

### Planned 📋
- M2: SDK package
- M3: Dashboard application
- M4: Quality improvements

## Development Workflow

1. Read [00-spec.md](./00-spec.md) for vision and goals
2. Follow [01-bootstrap.md](./01-bootstrap.md) for setup
3. Implement schema from [06-schema.md](./06-schema.md)
4. Build ingestion using [04-ingestion.md](./04-ingestion.md), [07-geo-and-ip.md](./07-geo-and-ip.md), [09-bot-filtering.md](./09-bot-filtering.md)
5. Add dedupe from [10-deduplication.md](./10-deduplication.md)
6. Create SDK following [08-visitor-session-ids.md](./08-visitor-session-ids.md) and [11-sdk-usage.md](./11-sdk-usage.md)
7. Build dashboard per [05-data-and-dashboard.md](./05-data-and-dashboard.md)

## Philosophy

From [AGENTS.md](../AGENTS.md):
- Prioritize simplicity, correctness, boring reliability
- Avoid premature abstraction
- Prefer composable primitives
- No comments, self-explanatory code
- Centralized ingestion, thin clients
- Data first, UI second

## Environment Variables

```bash
# Ingestion
DATABASE_URL=postgresql://...
IP_HASH_SECRET=your-secret-here
DEDUPE_ENABLED=true

# SDK (client-side)
NEXT_PUBLIC_REMCO_ANALYTICS_URL=https://ingest.example.com/ingest
NEXT_PUBLIC_REMCO_ANALYTICS_PROJECT=my-app
```

## Testing Strategy

See [12-testing-strategy.md](./12-testing-strategy.md) for complete testing approach:
- Unit tests for core logic (60% of tests)
- Integration tests for component interactions (30% of tests)
- E2E tests for user flows (10% of tests)
- Performance and load testing
- CI/CD integration

## Performance Targets

- Ingestion latency: < 100ms p95
- Dashboard queries: < 500ms p95
- SDK bundle size: < 5KB gzipped
- Database: optimized for 1M events/month

## Privacy Compliance

- No HTTP cookies
- No raw IP storage (hashed with daily salt rotation)
- No PII collection
- User opt-out support
- DNT header respect
- GDPR-friendly by design

See [07-geo-and-ip.md](./07-geo-and-ip.md) and [08-visitor-session-ids.md](./08-visitor-session-ids.md) for details.

## Git Workflow

See [13-git-workflow.md](./13-git-workflow.md) for complete workflow:
- Branch strategy (master, develop, feature/*, fix/*)
- Commit message conventions (conventional commits)
- Pull request guidelines
- Merge strategies
- Release tagging

## Contributing

This is a private project. Refer to [AGENTS.md](../AGENTS.md) for code conventions.

## License

MIT - See [LICENSE](../LICENSE)