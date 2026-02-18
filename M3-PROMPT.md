# M3: Dashboard Implementation Plan (Modern Rewrite)

**Status:** Phase 1 - Foundation  
**Last Updated:** February 2026  
**Target Stack:** Next.js 16.1.x, React 19.2, Drizzle ORM 1.0 RC, Neon Serverless 1.x, Tailwind CSS 4.1, Motion 12.x, Zustand 5.x

---

## Why the Old Instructions Are Wrong

The original M3 prompt targets **Next.js 14** (two major versions behind), uses deprecated APIs, ignores your engineering principles, and recommends outdated patterns. Here is every significant correction:

| Old (Wrong)                                  | New (Correct)                                                        |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Next.js 14                                   | **Next.js 16.1.6** (stable, Turbopack default)                      |
| `middleware.ts`                               | **`proxy.ts`** (middleware is deprecated)                            |
| No caching strategy                          | **`"use cache"` directive + `cacheComponents: true`**                |
| `revalidateTag(tag)` (single arg)            | **`revalidateTag(tag, 'max')` or `updateTag(tag)`**                 |
| `date-fns` for dates                         | **`Intl.DateTimeFormat` + `Intl.RelativeTimeFormat`** (zero-dep)    |
| `framer-motion`                              | **`motion`** (renamed, v12.26.0)                                    |
| Recharts direct import                       | **shadcn/ui charts** (wraps Recharts 3.7.x)                        |
| Old Drizzle ORM (v0.28-0.32)                 | **Drizzle ORM v1.0.0-beta.2** with Relational Queries v2            |
| `@neondatabase/serverless` pre-GA            | **`@neondatabase/serverless` 1.x** (GA, March 2025)                 |
| Zustand v4                                   | **Zustand 5.x** (dropped default exports, uses `useSyncExternalStore`) |
| Tailwind CSS v3                              | **Tailwind CSS 4.1** (CSS-first config, `@property`, `color-mix`)   |
| `interface` keyword                          | **`type` keyword only** (per your rules)                            |
| Arrow functions everywhere                   | **Function declarations only** (per your rules)                     |
| No `src/` directory enforcement              | **All code inside `src/`** (per your rules)                         |
| `GeistSans.className`                        | **`next/font/google` with CSS variable** + `font-sans` class        |
| React 18 patterns                            | **React 19.2**: `use()`, `useOptimistic`, `useActionState`, `useEffectEvent`, `<Activity>` |
| `export const config`                        | Removed in Next.js 16                                               |
| Sync `params`, `searchParams`, `cookies()`   | **Must `await`** all of these in Next.js 16                         |
| No React Compiler                            | **`reactCompiler: true`** in `next.config.ts` (stable)              |
| `export const experimental_ppr`              | Removed. Use **`cacheComponents`** model                            |
| No `nuqs`                                    | **`nuqs` v2** for type-safe URL search params                       |
| No SWR                                       | **SWR v2.4.0** for client-side data fetching + mutation             |
| Comments in code                             | **Self-explanatory code, zero comments** (per your rules)           |

---

## Exact Package Versions (February 2026)

```jsonc
{
  "dependencies": {
    "next": "^16.1.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "drizzle-orm": "^1.0.0-beta.2",
    "@neondatabase/serverless": "^1.0.0",
    "zustand": "^5.0.0",
    "motion": "^12.26.0",
    "recharts": "^3.7.0",
    "nuqs": "^2.4.0",
    "swr": "^2.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^1.0.0-beta.2",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/postcss": "^4.1.0",
    "typescript": "^5.7.0",
    "babel-plugin-react-compiler": "latest",
    "@types/node": "^22.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0"
  }
}
```

---

## Phase 1: Foundation

### 1.1 Next.js 16 Config

```ts
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  turbopack: {},
};

export default config;
```

**Key changes from old instructions:**
- `cacheComponents: true` enables `"use cache"` directive (replaces old PPR/dynamicIO)
- `reactCompiler: true` is stable in Next.js 16 (auto-memoizes components)
- Turbopack is now the default bundler (no config needed, but key is reserved)
- No `experimental` block for these features

### 1.2 Tailwind CSS 4.1 Setup

Tailwind v4 uses **CSS-first configuration**. No `tailwind.config.ts` file.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: oklch(0.13 0.01 260);
  --color-foreground: oklch(0.93 0.01 260);
  --color-card: oklch(0.16 0.01 260);
  --color-card-foreground: oklch(0.93 0.01 260);
  --color-border: oklch(0.25 0.01 260);
  --color-muted: oklch(0.20 0.01 260);
  --color-muted-foreground: oklch(0.60 0.01 260);
  --color-primary: oklch(0.55 0.15 250);
  --color-primary-foreground: oklch(0.98 0.00 0);
  --color-accent: oklch(0.45 0.10 250);
  --color-accent-foreground: oklch(0.93 0.01 260);
  --color-destructive: oklch(0.55 0.20 25);
  --color-success: oklch(0.55 0.15 150);
  --color-warning: oklch(0.65 0.15 80);

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

**Key changes:**
- `@import "tailwindcss"` replaces the old `@tailwind` directives
- `@theme` block replaces `tailwind.config.ts` extend
- oklch color space for perceptually uniform dark neutral palette
- No separate `tailwind.config.ts` needed (Tailwind v4 detects content automatically)

### 1.3 Root Layout with `next/font`

```tsx
// src/app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Privacy-focused analytics dashboard",
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Key changes:**
- Fonts use CSS variables (`variable` prop), applied via `font-sans` / `font-mono` utility
- Separate `viewport` export (Next.js 16 requirement for viewport meta)
- No `GeistSans.className` pattern (that was the old way)

### 1.4 Drizzle ORM v1.0 + Neon Serverless GA

```ts
// src/lib/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

In Drizzle 1.0 RC, you pass the connection string directly to `drizzle()`. No need for the `neon()` constructor separately unless you need the raw SQL template function.

```ts
// drizzle.config.ts (root level)
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 1.5 Schema (Drizzle v1.0 Patterns)

```ts
// src/lib/schema.ts
import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: text("project_id").notNull(),
    type: text("type").notNull(),
    path: text("path"),
    referrer: text("referrer"),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    isBot: integer("is_bot").default(0),
    screenWidth: integer("screen_width"),
    screenHeight: integer("screen_height"),
    metadata: jsonb("metadata"),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("events_project_ts_idx").on(table.projectId, table.ts),
    index("events_visitor_idx").on(table.visitorId),
    index("events_session_idx").on(table.sessionId),
    index("events_path_idx").on(table.path),
    index("events_country_idx").on(table.country),
    index("events_type_idx").on(table.type),
  ]
);
```

**Key changes from old patterns:**
- Drizzle v1.0 uses array return for indexes in the third argument
- `uuid().defaultRandom()` for auto-generated UUIDs
- `jsonb` for flexible metadata column
- Index definitions are cleaner with the new API

### 1.6 Relational Queries v2 (Drizzle 1.0)

Drizzle v1.0 introduces Relational Queries v2. If you add more tables (projects, sessions), define relations like:

```ts
// src/lib/relations.ts
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, ({ one, many }) => ({
  // Example: if you add a projects table
  // events: {
  //   project: one.projects({
  //     from: schema.events.projectId,
  //     to: schema.projects.id,
  //   }),
  // },
}));
```

**Key change:** Relations are now defined separately with `defineRelations()`, not inline with `relations()`.

---

## Phase 2: Query Layer (Modern Patterns)

### 2.1 Server Actions Architecture (Not API Routes)

Per your engineering principles: **Prefer Server Actions (`"use server"`)** over API routes.

```ts
// src/actions/analytics.ts
"use server";

import { db } from "@/lib/db";
import { events } from "@/lib/schema";
import { and, eq, gte, lte, sql, desc, count, countDistinct } from "drizzle-orm";

type DateRange = {
  start: Date;
  end: Date;
};

type TimeGranularity = "hour" | "day";

type TimeseriesPoint = {
  ts: string;
  count: number;
};

type TopPage = {
  path: string;
  views: number;
};

type TopReferrer = {
  referrer: string;
  visits: number;
};

type GeoEntry = {
  country: string | null;
  region: string | null;
  city: string | null;
  visitors: number;
};

type DashboardMetrics = {
  pageviews: number;
  visitors: number;
  sessions: number;
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  geo: GeoEntry[];
};

function rangeFilter(projectId: string, range: DateRange) {
  return and(
    eq(events.projectId, projectId),
    gte(events.ts, range.start),
    lte(events.ts, range.end),
    eq(events.isBot, 0)
  );
}

export async function fetchMetrics(
  projectId: string,
  range: DateRange
): Promise<DashboardMetrics> {
  const base = rangeFilter(projectId, range);
  const pageviewFilter = and(base, eq(events.type, "pageview"));

  const [
    [pageviewResult],
    [visitorResult],
    [sessionResult],
    timeseries,
    topPages,
    topReferrers,
    geo,
  ] = await Promise.all([
    db.select({ value: count() }).from(events).where(pageviewFilter),
    db.select({ value: countDistinct(events.visitorId) }).from(events).where(base),
    db.select({ value: countDistinct(events.sessionId) }).from(events).where(base),
    fetchTimeseries(projectId, range, "day"),
    fetchTopPages(projectId, range, 10),
    fetchTopReferrers(projectId, range, 10),
    fetchGeo(projectId, range),
  ]);

  return {
    pageviews: pageviewResult?.value ?? 0,
    visitors: visitorResult?.value ?? 0,
    sessions: sessionResult?.value ?? 0,
    timeseries,
    topPages,
    topReferrers,
    geo,
  };
}

async function fetchTimeseries(
  projectId: string,
  range: DateRange,
  granularity: TimeGranularity
): Promise<TimeseriesPoint[]> {
  const trunc = granularity === "hour" ? "hour" : "day";
  const bucket = sql`date_trunc(${sql.raw(`'${trunc}'`)}, ${events.ts})`;

  return db
    .select({
      ts: sql<string>`${bucket}::text`,
      count: count(),
    })
    .from(events)
    .where(and(rangeFilter(projectId, range), eq(events.type, "pageview")))
    .groupBy(bucket)
    .orderBy(bucket);
}

async function fetchTopPages(
  projectId: string,
  range: DateRange,
  limit: number
): Promise<TopPage[]> {
  return db
    .select({
      path: events.path,
      views: count(),
    })
    .from(events)
    .where(and(rangeFilter(projectId, range), eq(events.type, "pageview")))
    .groupBy(events.path)
    .orderBy(desc(count()))
    .limit(limit) as Promise<TopPage[]>;
}

async function fetchTopReferrers(
  projectId: string,
  range: DateRange,
  limit: number
): Promise<TopReferrer[]> {
  return db
    .select({
      referrer: events.referrer,
      visits: count(),
    })
    .from(events)
    .where(
      and(
        rangeFilter(projectId, range),
        sql`${events.referrer} IS NOT NULL AND ${events.referrer} != ''`
      )
    )
    .groupBy(events.referrer)
    .orderBy(desc(count()))
    .limit(limit) as Promise<TopReferrer[]>;
}

async function fetchGeo(
  projectId: string,
  range: DateRange
): Promise<GeoEntry[]> {
  return db
    .select({
      country: events.country,
      region: events.region,
      city: events.city,
      visitors: countDistinct(events.visitorId),
    })
    .from(events)
    .where(rangeFilter(projectId, range))
    .groupBy(events.country, events.region, events.city)
    .orderBy(desc(countDistinct(events.visitorId)));
}
```

**Key differences from old approach:**
- Uses `"use server"` directive (Server Actions, not standalone functions for RSC)
- Uses `count()` and `countDistinct()` from Drizzle ORM directly (type-safe)
- Single `fetchMetrics` action batches all queries with `Promise.all`
- `rangeFilter` helper avoids repetition (DRY per your rules)
- Bot filtering built into every query at the base level
- Strong typing with `type` keyword only (no `interface`)
- Function declarations only (no arrows)

### 2.2 `"use cache"` for Query Caching

```ts
// src/actions/cached-analytics.ts
"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { fetchMetrics } from "./analytics";

type DateRange = {
  start: Date;
  end: Date;
};

export async function cachedMetrics(projectId: string, range: DateRange) {
  cacheTag(`analytics-${projectId}`);
  cacheLife("hours");
  return fetchMetrics(projectId, range);
}
```

**How it works in Next.js 16:**
- `"use cache"` tells the compiler to cache this function's return value
- `cacheTag()` associates a tag for on-demand revalidation
- `cacheLife("hours")` uses a built-in profile (stale after 1h, revalidate up to 24h)
- Built-in profiles: `"default"`, `"seconds"`, `"minutes"`, `"hours"`, `"days"`, `"weeks"`, `"max"`
- Custom profiles can be defined in `next.config.ts` via `cacheLife` config

### 2.3 Revalidation Strategies (Next.js 16)

```ts
// src/actions/revalidate.ts
"use server";

import { revalidateTag, updateTag, refresh } from "next/cache";

export async function revalidateProject(projectId: string) {
  // SWR behavior: serve stale, revalidate in background
  revalidateTag(`analytics-${projectId}`, "max");
}

export async function updateProjectImmediate(projectId: string) {
  // Read-your-writes: immediate cache expiry
  // Only available in Server Actions (not Route Handlers)
  updateTag(`analytics-${projectId}`);
}

export async function refreshDynamic() {
  // Refresh uncached data only (live metrics, notification counts)
  // Does NOT touch any cached content
  refresh();
}
```

**Three distinct APIs in Next.js 16:**
| API              | Where             | Behavior                                  | Use Case                       |
| ---------------- | ----------------- | ----------------------------------------- | ------------------------------ |
| `revalidateTag`  | Server Actions, Route Handlers | SWR (stale-while-revalidate) | Background content refresh      |
| `updateTag`      | Server Actions only           | Immediate cache expiry       | User-facing mutations (forms)   |
| `refresh`        | Server Actions only           | Refresh uncached data only   | Live metrics, notification counts |

### 2.4 Date Utilities (Zero Dependencies)

**Do NOT use `date-fns`.** Use native `Intl` APIs which are fully supported in all target browsers and Node.js:

```ts
// src/lib/dates.ts

type DateRange = {
  start: Date;
  end: Date;
};

type RangePreset = "24h" | "7d" | "30d" | "90d";

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

const PRESET_MAP: Record<RangePreset, number> = {
  "24h": MS_DAY,
  "7d": 7 * MS_DAY,
  "30d": 30 * MS_DAY,
  "90d": 90 * MS_DAY,
};

export function rangeFromPreset(preset: RangePreset): DateRange {
  const end = new Date();
  const start = new Date(end.getTime() - PRESET_MAP[preset]);
  return { start, end };
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(range.start)} - ${fmt.format(range.end)}`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function granularityForRange(range: DateRange): "hour" | "day" {
  const diff = range.end.getTime() - range.start.getTime();
  return diff <= 2 * MS_DAY ? "hour" : "day";
}
```

**Why native over `date-fns`:**
- Zero bundle cost
- `Intl.DateTimeFormat` handles locale, timezone, formatting
- `Intl.NumberFormat` with `notation: "compact"` gives "1.2K", "3.4M" etc.
- SSR-safe (Node.js has full ICU data)

---

## Phase 3: UI Components (Modern Patterns)

### 3.1 Component Architecture

Per your engineering principles:
- **Function declarations only** (no arrow functions, no classes)
- **`type` keyword only** (no `interface`)
- **Single props type per file = `Props`**, multiple = prefix with `T`
- **Max 2-word names** for types, vars, functions
- **No comments** (self-explanatory code)
- **Skeleton loading states** (zero CLS)
- **`motion`** (not `framer-motion`) for animations
- **Keyboard-first** UX with ARIA attributes
- **Dark neutral only** (near-black / graphite palette)

### 3.2 shadcn/ui Charts (Not Raw Recharts)

Your old instructions import Recharts directly. The modern approach uses **shadcn/ui chart components** which wrap Recharts 3.7.x with proper theming:

```tsx
// src/components/timeseries-chart.tsx
"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";

type Props = {
  data: Array<{ ts: string; count: number }>;
};

export function TimeseriesChart({ data }: Props) {
  const chartConfig = {
    count: {
      label: "Pageviews",
      color: "var(--color-primary)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="ts" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="count"
          type="monotone"
          fill="var(--color-primary)"
          fillOpacity={0.1}
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
```

### 3.3 Motion Animations (Not Framer Motion)

```tsx
// src/components/metric-card.tsx
"use client";

import { motion } from "motion/react";
import { formatCompact } from "@/lib/dates";

type Props = {
  label: string;
  value: number;
  change?: number;
};

export function MetricCard({ label, value, change }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6"
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold mt-2 font-mono tracking-tight">
        {formatCompact(value)}
      </p>
      {change !== undefined && (
        <p
          className={`text-sm mt-2 ${change >= 0 ? "text-success" : "text-destructive"}`}
          aria-label={`${change >= 0 ? "Up" : "Down"} ${Math.abs(change)} percent`}
        >
          {change >= 0 ? "+" : ""}{change}%
        </p>
      )}
    </motion.div>
  );
}
```

**Key change:** Import from `"motion/react"` not `"framer-motion"`. The package is now `motion` (v12.26.0).

### 3.4 URL State with `nuqs` (Type-Safe Search Params)

Instead of `useState` for filters, use **`nuqs`** for URL-persisted, type-safe state:

```tsx
// src/components/range-picker.tsx
"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const PRESETS = ["24h", "7d", "30d", "90d"] as const;

type Props = {
  onChange: (preset: (typeof PRESETS)[number]) => void;
};

export function RangePicker({ onChange }: Props) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsStringLiteral(PRESETS).withDefault("7d")
  );

  function handleSelect(preset: (typeof PRESETS)[number]) {
    setRange(preset);
    onChange(preset);
  }

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Date range">
      {PRESETS.map(function renderPreset(preset) {
        return (
          <button
            key={preset}
            onClick={function handleClick() { handleSelect(preset); }}
            role="radio"
            aria-checked={range === preset}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              range === preset
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {preset}
          </button>
        );
      })}
    </div>
  );
}
```

**Why `nuqs`:**
- Filter state lives in the URL (`?range=7d`)
- Shareable, bookmarkable dashboard URLs
- SSR-compatible (reads from searchParams on server)
- Type-safe with parsers (`parseAsStringLiteral`, `parseAsInteger`, etc.)
- No hydration mismatch

### 3.5 SWR for Client-Side Data

Use **SWR v2.4.0** for client-side data that needs to sync between components:

```tsx
// src/hooks/use-metrics.ts
import useSWR from "swr";
import { fetchMetrics } from "@/actions/analytics";
import type { DateRange } from "@/lib/dates";

export function useMetrics(projectId: string, range: DateRange) {
  return useSWR(
    ["metrics", projectId, range.start.toISOString(), range.end.toISOString()],
    function fetcher() {
      return fetchMetrics(projectId, range);
    },
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );
}
```

### 3.6 Zustand 5.x for Global Client State

```ts
// src/stores/dashboard.ts
import { create } from "zustand";

type DashboardState = {
  projectId: string;
  sidebarOpen: boolean;
};

type DashboardActions = {
  setProject: (id: string) => void;
  toggleSidebar: () => void;
};

export const useDashboard = create<DashboardState & DashboardActions>(
  function storeCreator(set) {
    return {
      projectId: "",
      sidebarOpen: true,
      setProject: function setProject(id) {
        set({ projectId: id });
      },
      toggleSidebar: function toggleSidebar() {
        set(function toggle(state) {
          return { sidebarOpen: !state.sidebarOpen };
        });
      },
    };
  }
);
```

**Zustand 5 changes:**
- No default export (use named `{ create }`)
- Uses native `useSyncExternalStore` (smaller bundle)
- Dropped React < 18, TypeScript < 4.5
- `useShallow` for shallow equality: `import { useShallow } from "zustand/shallow"`

---

## Phase 4: Dashboard Page Assembly

### 4.1 RSC + Suspense + `"use cache"` Pattern

```tsx
// src/app/page.tsx
import { Suspense } from "react";
import { cachedMetrics } from "@/actions/cached-analytics";
import { rangeFromPreset } from "@/lib/dates";
import { MetricsGrid } from "@/components/metrics-grid";
import { TimeseriesChart } from "@/components/timeseries-chart";
import { TopPagesTable } from "@/components/top-pages";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; project?: string }>;
}) {
  const params = await searchParams;
  const range = rangeFromPreset((params.range as "24h" | "7d" | "30d" | "90d") ?? "7d");
  const projectId = params.project ?? "default";

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          Analytics
        </h1>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardData projectId={projectId} range={range} />
        </Suspense>
      </div>
    </main>
  );
}

async function DashboardData({
  projectId,
  range,
}: {
  projectId: string;
  range: { start: Date; end: Date };
}) {
  const metrics = await cachedMetrics(projectId, range);

  return (
    <div className="space-y-8">
      <MetricsGrid
        pageviews={metrics.pageviews}
        visitors={metrics.visitors}
        sessions={metrics.sessions}
      />
      <TimeseriesChart data={metrics.timeseries} />
      <TopPagesTable data={metrics.topPages} />
    </div>
  );
}
```

**Critical Next.js 16 change:** `searchParams` is now a `Promise` and must be `await`ed.

### 4.2 Skeleton Component (Zero CLS)

```tsx
// src/components/dashboard-skeleton.tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }, function renderSkeleton(_, i) {
          return (
            <div key={i} className="h-28 rounded-lg bg-muted" />
          );
        })}
      </div>
      <div className="h-64 rounded-lg bg-muted" />
      <div className="h-96 rounded-lg bg-muted" />
    </div>
  );
}
```

### 4.3 `proxy.ts` (Replaces `middleware.ts`)

```ts
// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
```

**Key:** File is `proxy.ts`, function is named `proxy` (not `middleware`).

---

## Phase 5: React 19.2 Patterns

### 5.1 `use()` Hook (Replace `useEffect` for Promises)

```tsx
// Reading a promise in a client component
"use client";

import { use } from "react";

type Props = {
  metricsPromise: Promise<{ pageviews: number }>;
};

export function LiveMetric({ metricsPromise }: Props) {
  const metrics = use(metricsPromise);
  return <span className="font-mono">{metrics.pageviews}</span>;
}
```

### 5.2 `useOptimistic` (Instant UI Feedback)

```tsx
"use client";

import { useOptimistic, useTransition } from "react";

type Props = {
  initialRange: string;
  onRangeChange: (range: string) => Promise<void>;
};

export function OptimisticRange({ initialRange, onRangeChange }: Props) {
  const [optimisticRange, setOptimisticRange] = useOptimistic(initialRange);
  const [, startTransition] = useTransition();

  function handleChange(range: string) {
    startTransition(async function transition() {
      setOptimisticRange(range);
      await onRangeChange(range);
    });
  }

  return <div>{optimisticRange}</div>;
}
```

### 5.3 `useEffectEvent` (Non-Reactive Effect Logic)

```tsx
"use client";

import { useEffect, useEffectEvent } from "react";

type Props = {
  projectId: string;
  onConnect: () => void;
};

export function LiveConnection({ projectId, onConnect }: Props) {
  const handleConnect = useEffectEvent(function onConnected() {
    onConnect();
  });

  useEffect(function setupConnection() {
    const ws = new WebSocket(`wss://api.example.com/${projectId}`);
    ws.onopen = handleConnect;
    return function cleanup() { ws.close(); };
  }, [projectId]);

  return null;
}
```

### 5.4 `<Activity>` (Background Rendering)

```tsx
import { Activity } from "react";

type Props = {
  showSidebar: boolean;
  children: React.ReactNode;
};

export function SidebarWrapper({ showSidebar, children }: Props) {
  return (
    <Activity mode={showSidebar ? "visible" : "hidden"}>
      {children}
    </Activity>
  );
}
```

`<Activity>` hides with `display: none` while preserving state and cleaning up Effects. Use this for sidebar panels, tab content, and modals that should retain state.

---

## Phase 6: Performance Strategies

### 6.1 React Compiler (Auto-Memoization)

With `reactCompiler: true` in `next.config.ts`:
- **No manual `useMemo`, `useCallback`, `React.memo`** needed in most cases
- The compiler automatically detects and memoizes expensive computations
- Still use `useCallback` for functions passed to non-React APIs (event listeners, third-party libs)
- Install: `npm install babel-plugin-react-compiler@latest`

### 6.2 Bundle Splitting

```tsx
// Lazy-load heavy components (modals, charts)
import dynamic from "next/dynamic";

const GeoMap = dynamic(
  function loadGeo() { return import("@/components/geo-map"); },
  {
    loading: function GeoSkeleton() {
      return <div className="h-64 rounded-lg bg-muted animate-pulse" />;
    },
  }
);
```

### 6.3 `"use cache"` Granularity

```tsx
// Page-level cache
// src/app/dashboard/page.tsx
"use cache";

// Component-level cache
export async function ExpensiveWidget() {
  "use cache";
  cacheTag("widget");
  cacheLife("minutes");
  // ...
}

// Function-level cache
export async function heavyQuery() {
  "use cache";
  cacheTag("heavy");
  cacheLife("hours");
  // ...
}
```

### 6.4 Turbopack File System Caching

```ts
// next.config.ts
const config: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};
```

This caches Turbopack compiler artifacts to disk between dev server restarts. Significant speedup for large projects.

---

## File Structure (Your Engineering Principles Applied)

```
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    dashboard/
      page.tsx
      loading.tsx
  actions/
    analytics.ts
    cached-analytics.ts
    revalidate.ts
  components/
    metric-card.tsx
    metrics-grid.tsx
    timeseries-chart.tsx
    top-pages.tsx
    referrers-table.tsx
    geo-table.tsx
    range-picker.tsx
    project-selector.tsx
    dashboard-skeleton.tsx
    sidebar.tsx
    nav.tsx
  hooks/
    use-metrics.ts
  stores/
    dashboard.ts
  lib/
    db.ts
    schema.ts
    relations.ts
    dates.ts
proxy.ts
drizzle.config.ts
next.config.ts
```

**Enforced rules:**
- ALL code inside `src/` (except root config files)
- Kebab-case filenames
- Domain-oriented (actions, components, hooks, stores, lib)
- No barrel exports (direct imports only)

---

## Summary: Version Matrix

| Technology            | Old Version        | Current Version      | Key Change                           |
| --------------------- | ------------------ | -------------------- | ------------------------------------ |
| Next.js               | 14.x               | **16.1.6**           | Cache components, proxy.ts, async params |
| React                 | 18.x               | **19.2.x**           | `use()`, `useOptimistic`, `<Activity>`, `useEffectEvent` |
| Drizzle ORM           | 0.28-0.32          | **1.0.0-beta.2**     | Relational Queries v2, new index syntax |
| Drizzle Kit           | 0.20-0.23          | **1.0.0-beta.2**     | Matched with ORM version             |
| @neondatabase/serverless | pre-GA           | **1.0.0** (GA)       | Simplified API, Node 19+ required    |
| Tailwind CSS          | 3.x                | **4.1.x**            | CSS-first config, `@theme`, no config file |
| Motion (ex Framer)    | framer-motion 10.x  | **motion 12.26.0**   | New package name, import from `motion/react` |
| Zustand               | 4.x                | **5.x**              | No default exports, native `useSyncExternalStore` |
| Recharts              | 2.x                | **3.7.0**            | Use via shadcn/ui chart components   |
| SWR                   | not used            | **2.4.0**            | Client-side data fetching + mutation |
| nuqs                  | not used            | **2.4.0**            | Type-safe URL search params          |
| React Compiler        | not available       | **stable**           | Auto-memoization, zero manual memo   |
| TypeScript            | 5.x                | **5.7.x**            | Next.js 16 requires 5.1+            |
| Node.js               | 18.x               | **20.9+** (LTS)      | Next.js 16 dropped Node 18           |

---

## What to Build First (Phase 1 Checklist)

1. Initialize Next.js 16 project with `src/` directory
2. Configure `next.config.ts` with `cacheComponents` + `reactCompiler`
3. Set up Tailwind v4 with `@theme` in `globals.css` (dark neutral palette)
4. Configure fonts via `next/font/google` with CSS variables
5. Install and configure Drizzle ORM v1.0 + Neon serverless
6. Define schema in `src/lib/schema.ts`
7. Run `drizzle-kit push` to sync schema to Neon
8. Create `src/actions/analytics.ts` with `fetchMetrics` Server Action
9. Build skeleton loading states (zero CLS)
10. Assemble dashboard page with Suspense boundaries

This document replaces the old M3 instructions entirely. Every API, pattern, and version number is current as of February 2026.

---

## Phase 7: Repo Delta and Upgrade Path

Current repository state in `apps/dashboard`:

| Area | Current | Target |
| --- | --- | --- |
| Next.js | 15.1.x | 16.1.x |
| React | 19.0.x | 19.2.x |
| Drizzle ORM | 0.36.x | 1.0.0-beta.2 |
| Drizzle Kit | 0.28.x | 1.0.0-beta.2 |
| Neon serverless | 0.9.x | 1.x |
| Tailwind | 3.4.x | 4.1.x |
| Recharts | 2.12.x | 3.7.x |
| SWR | 2.2.x | 2.4.x |
| nuqs | 2.0.x | 2.4.x |
| Date utils | date-fns | Intl-only |

### 7.1 Immediate Dependency Upgrade

```bash
cd apps/dashboard
bun add next@^16.1.6 react@^19.2.0 react-dom@^19.2.0
bun add drizzle-orm@^1.0.0-beta.2 drizzle-kit@^1.0.0-beta.2
bun add @neondatabase/serverless@^1.0.0
bun add tailwindcss@^4.1.0 @tailwindcss/postcss@^4.1.0
bun add recharts@^3.7.0 swr@^2.4.0 nuqs@^2.4.0 motion@^12.26.0
bun remove date-fns geist autoprefixer
```

### 7.2 Config Delta to Apply

1. Update `apps/dashboard/next.config.ts`:
   - set `cacheComponents: true`
   - set `reactCompiler: true`
   - remove stale experimental flags
2. Move Tailwind config to CSS-first:
   - simplify `apps/dashboard/src/app/globals.css` to use `@import "tailwindcss"` and `@theme`
   - remove `apps/dashboard/tailwind.config.ts`
   - keep `apps/dashboard/postcss.config.mjs` aligned with `@tailwindcss/postcss`
3. Remove `date-fns` usage from:
   - `apps/dashboard/src/lib/date-utils.ts`
   - any dependent components or query helpers
4. Ensure all analytics query reads use shared schema from `packages/db` or an identical schema contract.

### 7.3 Required Files to Introduce

- `apps/dashboard/src/actions/analytics.ts`
- `apps/dashboard/src/actions/cached-analytics.ts`
- `apps/dashboard/src/actions/revalidate.ts`
- `apps/dashboard/src/components/metrics-grid.tsx`
- `apps/dashboard/src/components/timeseries-chart.tsx`
- `apps/dashboard/src/components/top-pages.tsx`
- `apps/dashboard/src/components/referrers-table.tsx`
- `apps/dashboard/src/components/geo-table.tsx`
- `apps/dashboard/src/components/dashboard-skeleton.tsx`
- `apps/dashboard/src/components/range-picker.tsx`

---

## Phase 8: Execution Sequence and Commits

Use branch naming from repo policy: `feature/*`, `fix/*`, `chore/*`.

### 8.1 Branch and PR Sequence

1. `chore/m3-dashboard-upgrades`
2. `feature/m3-dashboard-queries`
3. `feature/m3-dashboard-components`
4. `feature/m3-dashboard-assembly`
5. `chore/m3-dashboard-hardening`

### 8.2 Commit Plan

1. `chore(dashboard): upgrade next react drizzle tailwind and runtime deps`
2. `chore(dashboard): migrate tailwind to v4 css-first theme`
3. `feat(dashboard): add server actions for metrics and cached reads`
4. `feat(dashboard): add dashboard metric chart and table components`
5. `feat(dashboard): assemble dashboard page with suspense and skeletons`
6. `feat(dashboard): add revalidation actions and cache tags`
7. `test(dashboard): add query and component integration coverage`
8. `chore(dashboard): finalize m3 quality gates and docs`

### 8.3 Definition of Done for M3

- Dashboard shows pageviews, visitors, sessions for selected `projectId`
- Timeseries renders for `24h`, `7d`, `30d`, `90d`
- Top pages and top referrers tables are visible and sorted by count desc
- Geo dataset is rendered in table form and map-ready
- Query responses stay under 500ms p95 in local load tests
- No raw IP data is surfaced in dashboard logic or UI
- Build gates pass:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test`

---

## Phase 9: Verification Checklist

Run from repo root:

```bash
bun install
bun run typecheck
bun run lint
bun run test
```

Run dashboard app:

```bash
bun run -C apps/dashboard dev
```

Manual checks:

1. Switch range presets and confirm URL reflects `?range=...`
2. Switch `projectId` and confirm all cards/charts/tables refresh coherently
3. Confirm skeletons render before data and there is no layout shift
4. Confirm only server actions access database logic
5. Confirm dashboard has dark neutral UI across mobile and desktop widths

---

## Copy/Paste Build Prompt

Use this prompt when you want another coding agent to execute M3 in this repository:

```md
Implement M3 dashboard in this monorepo at `apps/dashboard` using `M3-PROMPT.md` as source of truth.

Constraints:
- Follow AGENTS.md rules: TypeScript, `type` keyword only, function declarations only, kebab-case files, no comments in code.
- Use server actions for query reads.
- Keep ingestion centralized; dashboard is read-only against analytics events.
- Never store or expose raw IP data.
- Use dark neutral UI only.

Deliverables:
1. Upgrade dashboard dependencies to the target matrix in M3-PROMPT Phase 7.
2. Implement query layer and caching actions.
3. Implement metrics, chart, top pages, referrers, and geo UI components.
4. Assemble `src/app/page.tsx` with Suspense and skeleton loading.
5. Add/update tests for query behavior and core component rendering.
6. Run `bun run typecheck`, `bun run lint`, `bun run test` and report results.

Report:
- List changed files.
- List any deviations from the prompt with justification.
- Include exact output summary of quality gates.
```
