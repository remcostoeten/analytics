# Git Workflow and Branch Strategy

Owner: Remco
Status: Draft

## Overview

Git branching strategy, commit conventions, and workflow for developing the analytics platform.

## Branch Strategy

### Main Branches

```
master (protected)
  └── develop (integration branch)
```

#### master
- Production-ready code only
- Protected: requires PR review
- Auto-deploys to production
- Tagged with semantic versions (v1.0.0)
- Never commit directly

#### develop
- Integration branch for features
- Deployed to staging/preview
- Merge target for feature branches
- Semi-stable, tested code

### Supporting Branches

#### Feature Branches
```
feature/M1-ingest-endpoint
feature/M2-sdk-component
feature/dashboard-timeseries
feature/bot-detection
```

**Convention:** `feature/<milestone>-<short-description>`

**Lifecycle:**
1. Branch from `develop`
2. Develop and test locally
3. Push for review
4. Merge to `develop` via PR
5. Delete after merge

#### Fix Branches
```
fix/dedupe-cache-leak
fix/dashboard-query-timeout
fix/visitor-id-null-check
```

**Convention:** `fix/<issue-description>`

**Lifecycle:**
- Branch from `develop` (or `master` for hotfixes)
- Fix and test
- Merge via PR
- Delete after merge

#### Chore Branches
```
chore/update-dependencies
chore/add-tests
chore/improve-docs
```

**Convention:** `chore/<task-description>`

For non-feature work: dependencies, refactoring, documentation, tooling.

### Milestone-Based Organization

Align branches with milestones from 00-spec.md:

```
# M0: Bootstrap (Complete)
✓ master (initial setup)

# M1: Ingestion Service
feature/M1-database-schema
feature/M1-ingest-endpoint
feature/M1-geo-extraction
feature/M1-bot-detection
feature/M1-dedupe-logic

# M2: SDK
feature/M2-visitor-session-ids
feature/M2-analytics-component
feature/M2-track-function
feature/M2-package-publish

# M3: Dashboard
feature/M3-dashboard-app
feature/M3-overview-queries
feature/M3-timeseries-chart
feature/M3-tables-ui

# M4: Quality
feature/M4-dedupe-improvements
feature/M4-monitoring
feature/M4-performance-optimization
```

## Commit Message Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `docs` - Documentation changes
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `style` - Code style changes (formatting)

### Scopes

- `ingestion` - Ingestion service
- `sdk` - SDK package
- `dashboard` - Dashboard app
- `db` - Database schema/queries
- `ci` - CI/CD pipeline
- `docs` - Documentation
- `tests` - Test files

### Examples

```bash
# Good commits
feat(ingestion): add POST /ingest endpoint
fix(sdk): handle null visitor ID gracefully
refactor(db): optimize unique visitors query
test(ingestion): add bot detection unit tests
docs(schema): document index strategy
chore(deps): update drizzle to v0.29.0
perf(ingestion): add dedupe cache with TTL

# Bad commits (avoid)
update stuff
fixed bug
WIP
asdf
```

### Subject Line Rules

- Use imperative mood ("add" not "added")
- No period at the end
- Max 72 characters
- Start with lowercase after type
- Be specific and descriptive

### Body (Optional)

```
feat(ingestion): add geo extraction from Vercel headers

Extract country, region, and city from x-vercel-ip-* headers.
Falls back to Cloudflare headers if Vercel headers unavailable.
Returns null values when no geo data present.

Implements: docs/07-geo-and-ip.md
```

### Footer (Optional)

```
# Reference issues
Closes #42
Refs #123

# Breaking changes
BREAKING CHANGE: visitor ID now required in all events
```

## Workflow

### Starting New Work

```bash
# 1. Ensure develop is up to date
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/M1-ingest-endpoint

# 3. Work on feature
# ... make changes ...

# 4. Commit frequently
git add .
git commit -m "feat(ingestion): scaffold ingest handler"
git commit -m "feat(ingestion): add request validation"
git commit -m "test(ingestion): add ingest handler tests"

# 5. Push to remote
git push origin feature/M1-ingest-endpoint
```

### Pull Request Workflow

```bash
# 1. Ensure branch is up to date
git checkout feature/M1-ingest-endpoint
git fetch origin
git rebase origin/develop

# 2. Run tests and checks
bun run typecheck
bun run lint
bun run test

# 3. Push (force if rebased)
git push origin feature/M1-ingest-endpoint --force-with-lease

# 4. Create PR on GitHub
# - Title: Clear description of changes
# - Description: What, why, how
# - Link to related issues/docs
# - Request review

# 5. Address review feedback
git commit -m "fix: address review comments"
git push origin feature/M1-ingest-endpoint

# 6. Merge via GitHub (squash and merge)
# 7. Delete branch
git branch -d feature/M1-ingest-endpoint
```

### Hotfix Workflow

For critical production bugs:

```bash
# 1. Branch from master
git checkout master
git pull origin master
git checkout -b fix/critical-ingestion-crash

# 2. Fix and test
# ... make fix ...
bun test

# 3. Commit
git commit -m "fix(ingestion): prevent crash on null visitor ID"

# 4. Create PR to master
# - Mark as hotfix
# - Require urgent review

# 5. After merge to master, also merge to develop
git checkout develop
git merge master
git push origin develop
```

## Pull Request Guidelines

### PR Title

Follow commit convention:
```
feat(ingestion): add geo extraction from headers
fix(sdk): handle localStorage blocked scenario
```

### PR Description Template

```markdown
## What

Brief description of changes.

## Why

Explain the problem being solved or feature being added.

## How

Technical approach taken.

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance verified

## Docs

- [ ] Documentation updated
- [ ] Types exported
- [ ] Examples added if needed

## Checklist

- [ ] Code follows AGENTS.md conventions
- [ ] Tests pass locally
- [ ] No console errors
- [ ] Lint passes
- [ ] Type check passes
- [ ] Branch is up to date with develop
```

### Review Requirements

- At least 1 approval required
- All CI checks must pass
- No merge conflicts
- Branch up to date with target

## Merge Strategy

### Squash and Merge (Preferred)

- Keeps history clean
- One commit per PR in develop/master
- Automatically generates changelog-friendly commits

```bash
# GitHub will create single commit like:
feat(ingestion): add geo extraction (#42)

* feat(ingestion): scaffold geo extraction
* feat(ingestion): add Vercel header parsing
* test(ingestion): add geo tests
* docs: update geo documentation
```

### Rebase and Merge

Use for clean, logical commit history:
- Each commit is meaningful
- Commits are well-crafted
- Want to preserve individual commits

### Merge Commit

Avoid unless necessary (preserves exact history but clutters graph).

## Tagging and Releases

### Semantic Versioning

```
v<major>.<minor>.<patch>

v1.0.0 - Initial release
v1.1.0 - New feature
v1.1.1 - Bug fix
v2.0.0 - Breaking change
```

### Creating Releases

```bash
# 1. Ensure master is ready
git checkout master
git pull origin master

# 2. Tag release
git tag -a v1.0.0 -m "Release v1.0.0: Initial analytics platform"

# 3. Push tag
git push origin v1.0.0

# 4. Create GitHub release
# - Use tag v1.0.0
# - Title: "v1.0.0 - Initial Release"
# - Description: Changelog from commits
```

### Release Cadence

- Major releases: Breaking changes (rare)
- Minor releases: New features (monthly)
- Patch releases: Bug fixes (as needed)

## Working with Subpackages

### Cross-Package Changes

When changes span multiple packages:

```bash
# Branch name indicates scope
feature/M1-schema-and-ingestion

# Commits are scoped per package
git commit -m "feat(db): add events schema with indexes"
git commit -m "feat(ingestion): integrate database writes"
git commit -m "test(ingestion): add end-to-end insert test"
```

### Package-Specific Branches

For isolated package work:

```bash
# SDK development
feature/M2-analytics-component
├── packages/sdk/src/analytics.tsx
├── packages/sdk/src/track.ts
└── packages/sdk/tests/

# Dashboard development
feature/M3-overview-page
└── apps/dashboard/src/
```

## Git Hooks

### Pre-commit (Husky)

```bash
# Install husky
bun add -d husky

# Setup
bunx husky init

# .husky/pre-commit
#!/bin/sh
bun run lint
bun run fmt:check
bun run typecheck
```

### Pre-push

```bash
# .husky/pre-push
#!/bin/sh
bun test
```

### Commit Message Validation

```bash
# .husky/commit-msg
#!/bin/sh
# Validate commit message format
message=$(cat $1)
pattern="^(feat|fix|refactor|test|docs|chore|perf|style)(\([a-z]+\))?: .{1,72}$"

if ! echo "$message" | grep -qE "$pattern"; then
  echo "Invalid commit message format"
  echo "Use: type(scope): subject"
  echo "Example: feat(ingestion): add geo extraction"
  exit 1
fi
```

## Conflict Resolution

### Handling Merge Conflicts

```bash
# 1. Update develop
git checkout develop
git pull origin develop

# 2. Rebase feature branch
git checkout feature/my-feature
git rebase develop

# 3. Resolve conflicts
# ... edit conflicted files ...
git add .
git rebase --continue

# 4. Force push (safely)
git push origin feature/my-feature --force-with-lease
```

### Prevention

- Rebase frequently
- Keep PRs small
- Communicate with team
- Merge develop into long-lived branches

## Repository Hygiene

### Keeping Clean

```bash
# Delete merged local branches
git branch --merged | grep -v "\*\|master\|develop" | xargs -n 1 git branch -d

# Prune remote tracking branches
git fetch --prune

# List stale branches
git branch -vv | grep ': gone]'
```

### Stale Branch Policy

- Delete branches after PR merge
- Archive branches older than 3 months
- Tag important branches before deletion

## Monorepo Considerations

### Selective Testing

```bash
# Test only changed packages
git diff --name-only develop | grep "packages/sdk" && bun test --cwd packages/sdk
```

### Changesets (Optional)

For tracking package versions:

```bash
bun add -d @changesets/cli
bunx changeset init

# Add changeset
bunx changeset add

# Release packages
bunx changeset version
bunx changeset publish
```

## Examples

### Feature Development Flow

```bash
# M1: Add ingest endpoint
git checkout develop
git pull origin develop
git checkout -b feature/M1-ingest-endpoint

# Implement
git commit -m "feat(ingestion): add ingest route handler"
git commit -m "feat(ingestion): add request validation"
git commit -m "feat(ingestion): integrate database insert"
git commit -m "test(ingestion): add handler unit tests"
git commit -m "test(ingestion): add integration tests"
git commit -m "docs(ingestion): document endpoint API"

# Push and PR
git push origin feature/M1-ingest-endpoint
# Create PR: "feat(ingestion): add POST /ingest endpoint"
# Description: Implements docs/04-ingestion.md

# After approval and merge
git checkout develop
git pull origin develop
git branch -d feature/M1-ingest-endpoint
```

### Quick Fix Flow

```bash
# Fix bug
git checkout develop
git pull origin develop
git checkout -b fix/visitor-id-null-check

git commit -m "fix(sdk): handle null visitor ID in track function"
git commit -m "test(sdk): add null visitor ID test case"

git push origin fix/visitor-id-null-check
# Create PR, quick review, merge
```

## CI/CD Integration

### GitHub Actions on Branches

```yaml
# .github/workflows/branch.yml
name: Branch CI

on:
  push:
    branches:
      - 'feature/**'
      - 'fix/**'
      - 'chore/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run typecheck
      - run: bun run lint
      - run: bun test
```

### Deploy Previews

```yaml
# Deploy feature branches to preview
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/actions/deploy@v1
        with:
          environment: preview
```

## Acceptance Criteria

- [ ] Branch naming convention documented
- [ ] Commit message format enforced
- [ ] PR template created
- [ ] Git hooks configured
- [ ] CI runs on all branches
- [ ] Merge strategy defined
- [ ] Tagging convention established
- [ ] Conflict resolution process clear
- [ ] Team agrees on workflow

## Resources

- Conventional Commits: https://www.conventionalcommits.org
- Git Flow: https://nvie.com/posts/a-successful-git-branching-model
- Semantic Versioning: https://semver.org