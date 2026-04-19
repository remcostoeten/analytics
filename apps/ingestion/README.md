# Ingestion Service

## Serverless Limitations

When deploying this service to a serverless environment (e.g. Vercel), be aware of the following architectural limitations due to the ephemeral nature of serverless functions:

1. **In-Memory Rate Limiting:** The rate limiter uses an in-memory cache (`Map`). In serverless, each invocation runs in a fresh environment, effectively disabling cross-request rate limiting.
2. **In-Memory Deduplication:** Similar to rate limiting, deduplication relies on an in-memory `Map`. It will only deduplicate events that occur within the lifecycle of a single function execution container.
3. **Cron Jobs / Scheduled Cleanup:** The `setInterval` used for data retention cleanup won't stay alive. You will need to ping the `/admin/cleanup` endpoint using an external CRON job (like Vercel Cron).
4. **Server-Sent Events (SSE):** The `/events` stream keeps connections open. Serverless functions typically have max execution timeouts (e.g., 10s or 60s), which will prematurely close the SSE connection. This feature is better suited for local development or long-running Node servers.
