---
"@remcostoeten/analytics-sdk": patch
---

Hash routers (`#/path` and `#!/path`) now report the path inside the hash instead of `/`, in pageviews and in the `engagement`, `scrollDepth` and `speedInsights` plugins. `computeRoute` turns the splat params of React Router (`*`) and TanStack Router (`_splat`) into `[...splat]` instead of falling back to the raw path. The Next adapter also sends a pageview when only the query string changes, as the default `pageviews` plugin already did.
