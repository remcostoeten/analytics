# M3: Dashboard - Quick Start Guide

**Status:** Ready to start  
**Prerequisites:** M1 ✅ M2 ✅  
**Duration:** 3-4 weeks  

---

## 🎯 Goal

Build a Next.js 14 dashboard to visualize analytics data with real-time metrics, charts, and tables.

---

## 📋 Quick Checklist

### Phase 1: Setup (Days 1-2)
- [ ] Initialize Next.js 14 app in `apps/dashboard/`
- [ ] Install dependencies: `@remcostoeten/db`, `recharts`, `date-fns`
- [ ] Configure Tailwind CSS dark theme
- [ ] Set up database connection
- [ ] Create folder structure (components, lib, types)

### Phase 2: Query Layer (Days 3-4)
- [ ] `getPageviews(projectId, dateRange)`
- [ ] `getUniqueVisitors(projectId, dateRange)`
- [ ] `getSessionCount(projectId, dateRange)`
- [ ] `getTimeseriesData(projectId, dateRange, granularity)`
- [ ] `getTopPages(projectId, dateRange, limit)`
- [ ] `getTopReferrers(projectId, dateRange, limit)`
- [ ] `getGeoDistribution(projectId, dateRange)`
- [ ] Date utility functions
- [ ] Write 5+ query tests

### Phase 3: UI Components (Days 5-10)
- [ ] `<MetricCard />` - Display single metric
- [ ] `<TimeseriesChart />` - Line chart with Recharts
- [ ] `<TopPagesTable />` - Table with sorting
- [ ] `<ReferrersTable />` - Referrer list
- [ ] `<GeoTable />` - Geographic breakdown
- [ ] `<DateRangePicker />` - 24h, 7d, 30d presets
- [ ] `<ProjectSelector />` - Multi-project support
- [ ] Loading states for all components
- [ ] Write 20+ component tests

### Phase 4: Dashboard Page (Days 11-14)
- [ ] Assemble components in `app/page.tsx`
- [ ] Add Suspense boundaries
- [ ] Implement filters (date range, project)
- [ ] Add navigation component
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Error boundaries

### Phase 5: Deploy (Days 15-18)
- [ ] Configure `vercel.json`
- [ ] Set environment variables
- [ ] Deploy to Vercel
- [ ] Test in production
- [ ] Performance optimization
- [ ] E2E tests with Playwright

---

## 🚀 Commands

```bash
# Initialize dashboard app
cd apps/
bun create next-app dashboard --typescript --tailwind --app

# Install dependencies
cd dashboard
bun add @remcostoeten/db date-fns recharts
bun add -D @types/node

# Run dev server
bun dev

# Type check
bun run typecheck

# Test
bun test

# Build
bun run build

# Deploy
vercel --prod
```

---

## 📊 Key Queries

```typescript
// Core metrics
const pageviews = await getPageviews(projectId, dateRange);
const visitors = await getUniqueVisitors(projectId, dateRange);
const sessions = await getSessionCount(projectId, dateRange);

// Timeseries
const timeseries = await getTimeseriesData(projectId, dateRange, "day");

// Top pages
const topPages = await getTopPages(projectId, dateRange, 10);

// Referrers
const referrers = await getTopReferrers(projectId, dateRange, 10);

// Geography
const geo = await getGeoDistribution(projectId, dateRange);
```

---

## 🎨 UI Components

```tsx
// Metric cards
<MetricCard label="Page Views" value={1234} change={12} />
<MetricCard label="Unique Visitors" value={567} />
<MetricCard label="Sessions" value={890} />

// Chart
<TimeseriesChart data={timeseries} />

// Tables
<TopPagesTable data={topPages} />
<ReferrersTable data={referrers} />
<GeoTable data={geo} />

// Filters
<DateRangePicker onChange={setDateRange} />
<ProjectSelector onChange={setProjectId} />
```

---

## 📁 File Structure

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with dark theme
│   │   ├── page.tsx            # Dashboard overview
│   │   └── globals.css         # Tailwind imports
│   ├── components/
│   │   ├── metric-card.tsx     # Single metric display
│   │   ├── timeseries-chart.tsx # Line chart
│   │   ├── top-pages-table.tsx  # Top pages
│   │   ├── referrers-table.tsx  # Top referrers
│   │   ├── geo-table.tsx        # Geographic data
│   │   ├── date-range-picker.tsx # Date filter
│   │   └── project-selector.tsx  # Project filter
│   ├── lib/
│   │   ├── queries.ts          # Database queries
│   │   ├── date-utils.ts       # Date helpers
│   │   └── db.ts               # DB client
│   └── types/
│       └── analytics.ts        # TypeScript types
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## ✅ Acceptance Criteria

### Functional
- [x] Shows real data from database
- [x] Metrics display correctly
- [x] Charts render without errors
- [x] Tables populate with data
- [x] Filters work (date range, project)
- [x] Mobile responsive
- [x] Dark theme throughout

### Performance
- [x] All queries < 500ms p95
- [x] Initial load < 2s
- [x] No layout shift
- [x] Suspense prevents blocking

### Quality
- [x] 0 TypeScript errors
- [x] 0 console errors
- [x] 20+ tests passing
- [x] Deployed to Vercel

---

## 🔗 Resources

- **Full Guide:** `M3-PROMPT.md`
- **TODO List:** `TODO.md` (M3 section)
- **Database Schema:** `packages/db/src/schema.ts`
- **Query Spec:** `docs/05-data-and-dashboard.md`
- **M1 Summary:** `M1-COMPLETE.md`
- **M2 Summary:** `M2-COMPLETE.md`

---

## 🏁 Start Here

1. Read `M3-PROMPT.md` for detailed implementation guide
2. Initialize Next.js app: `bun create next-app dashboard`
3. Set up database connection
4. Implement query layer (`lib/queries.ts`)
5. Build UI components
6. Assemble dashboard page
7. Deploy to Vercel

**Let's build M3!** 🚀