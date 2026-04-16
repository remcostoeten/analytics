# Project Spotlight: @remcostoeten/analytics

## The "Why"
This project was born out of a desire to stop relying on heavy, black-box analytics providers and start learning the "guts" of back-end engineering. I wanted a service that was light (<5KB gzipped), privacy-focused (no cookies, IP hashing), and extremely flexible. Roll-your-own was the only way to get exactly what I wanted.

## Tech Talk & Architecture
The stack is built for speed and low-overhead:
- **Runtime**: **Bun** throughout (ingestion and dev tooling).
- **Ingestion**: **Hono** running on Vercel Edge/Serverless for sub-100ms p95 latency.
- **Database**: **Postgres on Neon** with the **Drizzle ORM**.
- **Forensics**: Server-side User-Agent parsing via `ua-parser-js` (extracting Browser, OS, and Versions).
- **Architecture**: **Event-Sourced**. Instead of rigid tables, everything is a flat event stream with a rich `meta` JSONB column. This allows us to track new metrics (like A/B tests or Revenue) without ever running a database migration.

## Key Possibilities
With the new **v1.1.1** release, the platform can now handle:
- **E-commerce Tracking**: Total revenue, AOV, and item counts via `trackTransaction()`.
- **Engagement Forensics**: Automatic tracking of Web Vitals (LCP, CLS, INP), max scroll depth, and active time-on-page.
- **A/B Testing**: Measuring variant conversion performance natively.
- **Funnels**: Building sequential drop-off charts (Pricing ➡️ Signup ➡️ Purchase).
- **Bot Detection**: Multi-layer detection including Vercel headers, UA fingerprints, and rate-limiting.

## Usage
Simply wrap your Next.js app or site with the Analytics component. It handles the tracking lifecycle automatically:
```tsx
import { Analytics } from "@remcostoeten/analytics";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics ingestUrl="https://your-ingestion-api.com" />
      </body>
    </html>
  );
}
```

---

## What changed while building it
- **Schema Simplification**: I originally planned for complex relational tables for every event type. I cut that and moved to a **JSONB-first architecture**. It felt "clever" but was fragile and slow to iterate. The flat event stream is significantly faster to query using Postgres window functions.
- **The "Boring" Reliability**: I rewrote the background beacon logic three times. Navigation-based `sendBeacon` is a bit "boring" compared to WebSockets, but it works 100% of the time on mobile and low-bandwidth connections where others fail.

## What is still rough
- **Dashboard UI**: The ingestion is robust and the database is seeded, but the visual "Wow" factor in the dashboard is still being polished.
- **Advanced Attribution**: I have the First-Touch data, but Multi-Touch attribution models are still on the roadmap.
- **CLI Tooling**: NPM publishing from restricted environments (GPG/2FA) was a major friction point that I'm looking to automate with a custom script.

## What I learned
- **Grains of Truth**: Small, versioned releases (v1.1.0 ➡️ v1.1.1) create clarity faster than private polishing.
- **Data First, UI Second**: Getting the query logic right in Drizzle (using window functions like `LEAD` and `LAG`) was more important than making the charts look pretty first.
- **Automation is Freedom**: The Python automator I built for Google/GitHub OAuth was a "side-quest" that saved me hours of manual dev-portal clicking.

## Next up
- **Funnel Builder**: A drag-and-drop UI to define conversion steps.
- **Automated Insights**: Alerting when Web Vitals or Conversion rates drop significantly.
- **Plugin System**: Allowing users to write custom server-side middle-ware for the ingestion pipeline.

**[GitHub Project](https://github.com/remcostoeten/analytics)** | **[Live Demo](https://analytics.remcostoeten.nl)**
