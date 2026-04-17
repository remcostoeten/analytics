# Quick Start - Deploy v0.0.1

## Prerequisites

Before running the deployment tool, make sure you have:

```bash
# 1. Vercel CLI installed and authenticated
npm i -g vercel
vercel login

# 2. npm authenticated for publishing
npm login

# 3. Verify authentication
vercel whoami
npm whoami
```

## Launch the Deployment Tool

```bash
bun run deploy
```

## Recommended First Run

For the **0.0.1 release**, follow this sequence:

### Option 1: Test Everything First (Recommended)

```bash
# Start the deployment tool
bun run deploy

# Then select options in this order:
7 → Run tests (verify 168/168 pass)
8 → Type check (verify 0 errors)  
1 → Build all (verify builds succeed)

# If all pass, you're ready to deploy!
```

### Option 2: Full Release (One Command)

```bash
# Start the deployment tool
bun run deploy

# Select option 10: Full release
# This will:
# - Run tests
# - Type check
# - Build all
# - Deploy dashboard
# - Publish SDK
# - Create git tag
```

## What Each Menu Option Does

| # | Option | What It Does |
|---|--------|--------------|
| **1** | Build all | Compiles SDK, Dashboard, and Ingestion |
| **2-4** | Build individual | Build only SDK, Dashboard, or Ingestion |
| **5** | Deploy Dashboard | Push to Vercel (asks preview vs production) |
| **6** | Publish SDK | Bump version, update CHANGELOG, publish to npm |
| **7** | Run tests | Execute 168 tests |
| **8** | Type check | Validate TypeScript across project |
| **9** | Git tag | Create version tag (e.g., v0.0.1) |
| **10** | **Full release** | Do everything in order (recommended) |

## Example Session

```bash
$ bun run deploy

╔════════════════════════════════════════════════════════════╗
║  Remco Analytics Deployment Tool                          ║
╚════════════════════════════════════════════════════════════╝

1. Build all packages
2. Build SDK only
3. Build Dashboard only
4. Build Ingestion only
5. Deploy Dashboard to Vercel
6. Publish SDK to npm
7. Run tests
8. Type check
9. Create git tag
10. Full release (all steps)
0. Exit

Select an option: 10

╔════════════════════════════════════════════════════════════╗
║  Full Release Process                                     ║
╚════════════════════════════════════════════════════════════╝

This will:
  1. Run tests
  2. Type check
  3. Build all packages
  4. Deploy dashboard to Vercel
  5. Publish SDK to npm
  6. Create and push git tag

Continue? (y/n): y

[... process runs automatically ...]

✓ All tests passed!
✓ Type check passed!
✓ All packages built successfully!
✓ Dashboard deployed successfully!
✓ SDK published successfully!
✓ Tag pushed successfully!

╔════════════════════════════════════════════════════════════╗
║  Release Complete!                                         ║
╚════════════════════════════════════════════════════════════╝

Press Enter to continue...
```

## After Publishing

Once published, verify:

1. **npm**: Visit https://www.npmjs.com/package/@remcostoeten/analytics
2. **Vercel**: Check your dashboard deployment URL
3. **GitHub**: Verify the tag appears in releases

## Troubleshooting

### "vercel: command not found"
```bash
npm i -g vercel
vercel login
```

### "You must be logged in to publish packages"
```bash
npm login
# Follow the prompts
```

### "Build failed"
```bash
# Run tests first to identify issues
bun test
bun run typecheck
```

### "Permission denied"
```bash
chmod +x deploy.ts
```

## Tips

- **Always test first** (option 7) before doing full release
- **Use dry-run** when publishing SDK (script will ask)
- **Preview deploy first** before production (script will ask)
- **Check git status** before starting to ensure clean working directory

---

**Ready to deploy?** Run `bun run deploy` and let's ship v0.0.1!
