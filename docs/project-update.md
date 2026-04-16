- **[ @remcostoeten/analytics ]**  
  There was no real reason for this, besides me wanting to roll my own service and learn some more back-end. It's a privacy-first, event-sourced analytics engine built on **Bun**, **Hono**, and **Neon/Postgres**. It uses **Drizzle ORM** and leverages JSONB for a schema-less event stream that supports advanced forensics (Browser/OS parsing) out of the box.
  
  - **Possibilities**: Track Web Vitals, E-commerce revenue, A/B test variants, and full user funnels without migrations.
  - **Usage**:
    ```tsx
    <Analytics ingestUrl="https://ingest.remcostoeten.nl" />
    ```
  - **GitHub**: [remcostoeten/analytics](https://github.com/remcostoeten/analytics)
  - **Live Demo**: [analytics.remcostoeten.nl](https://analytics.remcostoeten.nl)

- **[ GitHub and Google OAuth automator ]**  
  I hate creating OAuth applications when using social providers. Thus I automated the process with a Python program. Authenticate once and from there you're able to create, (bulk) delete apps and test credentials. Write secret and client ID to clipboard, or straight in your environment variable.

## What changed while building it

Most things never ship exactly as planned. The interesting part is usually what changed in the process.

- I cut the complex relational schema for a flat JSONB event stream to speed up iteration.
- I rewrote the background beacon logic to use native `sendBeacon` for 100% reliability on page unloads.
- I kept the query layer thin, moving the analytical heavy lifting to Postgres window functions.

## What is still rough

Not everything is done, and that is fine.

- **Dashboard UI**: The visuals are still minimal; it needs more "wow" factor on the charts.
- **Attribution Models**: Currently only supports First-Touch; linear and decay models are postponed.
- **Query Performance**: At massive scales (1M+ events), the JSONB extractions will need functional indexes.

## What I learned

A few reminders from this cycle:

- Small releases (v1.1.0 -> v1.1.1) create clarity faster than private polishing.
- The boring version that works (native beacons) is usually more valuable than the ambitious version that stays unfinished.
- Writing down what changed (the Spec doc) makes the next iteration significantly easier.

## Next up

The next things I want to spend time on:

- **Funnel Builder**: A UI to define conversion steps on the fly.
- **User Retention**: Weekly/Monthly retention heatmap visualization.
- **Plugin System**: Allowing custom ingestion middleware.
