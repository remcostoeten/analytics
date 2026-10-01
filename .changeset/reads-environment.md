---
"@remcostoeten/analytics-contract": minor
---

Reads take `environment` (`production`, the default, `preview` or `all`) next to `traffic`, and every read that echoes `traffic` echoes `environment`. `traffic=human` no longer leaves preview deployments out by itself; the default `environment=production` does. `SpeedEnvironment` is now the shared `Environment`.
