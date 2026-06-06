# Quick Start — Publishing & Deployment

## Prerequisites

```bash
# Vercel CLI installed and authenticated
npm i -g vercel
vercel login

# npm authenticated for publishing
npm login

# Verify
vercel whoami
npm whoami
```

## Launch the Deployment Tool

```bash
bun run deploy.ts
```

## Menu Options

| # | Option | What It Does |
|---|--------|--------------|
| **1** | Build all | Compiles SDK, Dashboard, and Ingestion |
| **2** | Build SDK only | `packages/sdk` |
| **3** | Build Dashboard only | `apps/example-dashboard` |
| **4** | Build Ingestion only | `packages/ingestion` + `apps/ingestion` |
| **5** | Deploy Dashboard | Push to Vercel (asks preview vs production) |
| **6** | Publish SDK | Bump version, update CHANGELOG, publish `@remcostoeten/analytics` |
| **7** | Publish Ingestion | Bump version, publish `@remcostoeten/ingestion` |
| **8** | Publish create-analytics | Bump version, publish `create-analytics` CLI |
| **9** | Run tests | `bun test` across all packages |
| **10** | Type check | `tsc --noEmit` across all packages |
| **11** | Create git tag | Tag from SDK version, optionally push |
| **12** | **Full release** | All steps in order (recommended) |
| **0** | Exit | — |

## Recommended Release Sequence

### Verify first, then release

```bash
bun run deploy.ts

# In order:
9  → Run tests       (all pass)
10 → Type check      (0 errors)
1  → Build all       (all succeed)

# Then publish:
12 → Full release
```

### Full release covers

1. Run tests
2. Type check
3. Build all packages
4. Deploy dashboard to Vercel
5. Publish `@remcostoeten/analytics` (SDK)
6. Publish `@remcostoeten/ingestion`
7. Publish `create-analytics` CLI
8. Create and push git tag

Each publish step asks: bump version? → dry-run? → publish?

## Published Packages

| Package | npm | Install |
|---------|-----|---------|
| `@remcostoeten/analytics` | SDK (browser) | `npm install @remcostoeten/analytics` |
| `@remcostoeten/ingestion` | Ingestion server | `npm install @remcostoeten/ingestion` |
| `create-analytics` | Scaffolder CLI | `npx create-analytics` |

## After Publishing

1. **npm SDK**: https://www.npmjs.com/package/@remcostoeten/analytics
2. **npm Ingestion**: https://www.npmjs.com/package/@remcostoeten/ingestion
3. **npm CLI**: https://www.npmjs.com/package/create-analytics
4. **Vercel**: check dashboard deployment URL
5. **GitHub**: verify tag appears in releases

## Troubleshooting

### "vercel: command not found"
```bash
npm i -g vercel && vercel login
```

### "You must be logged in to publish packages"
```bash
npm login
```

### Build failed
```bash
bun test
bun run typecheck
```

## Tips

- Always run tests (option 9) and type check (option 10) before a full release
- Use dry-run when publishing (each publish step will ask)
- Preview deploy before production (deploy step will ask)
- Ensure a clean `git status` before starting
