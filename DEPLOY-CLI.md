# 🚀 Analytics Deployment CLI

The `deploy.ts` script is a comprehensive, interactive command-line tool designed to handle the entire lifecycle of the Remco Analytics platform. It automates testing, building, versioning, and deployment.

## 📦 Features

- **Interactive Menu**: Easy-to-use numbered menu for all common tasks.
- **Smart Versioning**: Automatically detects current SDK version and offers to increment it (0.0.1 logic).
- **Automated Changelog**: Updates `packages/sdk/CHANGELOG.md` with new version entries and dates.
- **Vercel Integration**: Direct deployment of the Dashboard to Vercel (supports Preview and Production).
- **npm Publishing**: Builds, dry-runs, and publishes the SDK package.
- **Git Automation**: Handles version bump commits and release tagging.
- **Quality Gates**: Integrated test runner and type-checker to ensure stability before release.

## 🚀 Getting Started

To start the interactive deployment tool, run:

```bash
bun run deploy
```

## 📋 Menu Options

| Option | Action | Description |
|--------|--------|-------------|
| **1** | **Build All** | Runs `bun run build` across the entire monorepo. |
| **2-4** | **Individual Build** | Build only the SDK, Dashboard, or Ingestion service. |
| **5** | **Deploy Dashboard** | Deploys `apps/dashboard` to Vercel. Asks for Production vs. Preview. |
| **6** | **Publish SDK** | Handles version increment, build, and `npm publish`. |
| **7** | **Run Tests** | Executes the full test suite (168 tests). |
| **8** | **Type Check** | Runs strict TypeScript validation across the project. |
| **9** | **Create Git Tag** | Creates a version tag (e.g., `v0.0.1`) and optionally pushes to origin. |
| **10** | **Full Release** | The "Golden Path" - runs 7, 8, 1, 5, 6, and 9 in sequence. |

## 🛠 Prerequisites

Before running the deployment script, ensure you have:

1. **Vercel CLI**: Installed and authenticated (`vercel login`).
2. **npm**: Authenticated for publishing (`npm login`).
3. **Git**: A clean working directory (recommended).
4. **Environment**: `DATABASE_URL` and other required secrets configured.

## 📦 SDK Publishing Logic

When you select **Publish SDK (Option 6)**, the script performs the following:

1. Reads `packages/sdk/package.json` to find the current version.
2. Calculates the next patch version (e.g., `0.0.1` -> `0.0.2`).
3. Asks if you want to increment.
4. If yes:
    - Updates `package.json`.
    - Appends a new entry to `CHANGELOG.md` with today's date.
    - Commits the version bump to Git.
5. Builds the SDK using `tsup`.
6. Offers a `--dry-run` to verify the package content.
7. Publishes the package to the public npm registry.

## 🌍 Vercel Deployment

When deploying the **Dashboard (Option 5)**:

- The script enters `apps/dashboard`.
- It prompts for **Production (y)** or **Preview (n)**.
- It triggers the Vercel CLI directly.
- Ensure your project is already linked to Vercel (`vercel link`).

## 🏁 Full Release Workflow (Option 10)

This is the recommended path for the **0.0.1 release**:

1. **Test**: Verifies 168/168 tests pass.
2. **Typecheck**: Ensures zero TS errors.
3. **Build All**: Compiles all packages and apps.
4. **Deploy**: Pushes the latest dashboard to Vercel.
5. **Publish**: Bumps SDK version and pushes to npm.
6. **Tag**: Marks the release point in Git history.

---

**Note**: This script uses `bun` as the runtime. Ensure you are running it from the root of the `analytics` directory.