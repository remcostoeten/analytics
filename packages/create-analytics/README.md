# @remcostoeten/create-analytics

Scaffold [Remco Analytics](https://github.com/remcostoeten/analytics) wiring for Next.js.

## Usage

```bash
npx @remcostoeten/create-analytics@latest my-app
npx @remcostoeten/create-analytics@latest my-app --tier separate --yes
npx @remcostoeten/create-analytics@latest my-app --tier colocated
npx @remcostoeten/create-analytics@latest my-app --tier sdk-only
```

## Tiers

| Tier                 | Flag        | What you get                                                |
| -------------------- | ----------- | ----------------------------------------------------------- |
| **1 — Recommended**  | `separate`  | `apps/web` (SDK only) + `apps/analytics-api` (ingestion)    |
| **2 — Co-located**   | `colocated` | One Next.js app with SDK + API route (larger server bundle) |
| **3 — Existing URL** | `sdk-only`  | Next.js app with SDK only                                   |

Default is Tier 1 — keeps ingestion out of your main app deploy.

## Output

Tier 1 example:

```
my-app/
  README.md
  apps/web/                 @remcostoeten/analytics
  apps/analytics-api/       @remcostoeten/ingestion
```

See generated `README.md` for Neon, migrations, and Vercel steps.
