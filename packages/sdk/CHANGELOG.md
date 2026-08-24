# Changelog

All notable changes to `@remcostoeten/analytics` are documented here.

## [1.7.1] - 2026-08-24

### Added

- React-free `@remcostoeten/analytics/browser` entry for framework-agnostic browser apps
- Explicit `path` and `referrer` overrides for sensitive URL normalization

### Changed

- React is now an optional peer dependency

## [1.5.0] - 2026-06-06

### Added

- `@remcostoeten/analytics/server` subpath with `trackServer`, `trackServerEvent`, `trackServerError`, `createServerTrack`
- `ServerAnalyticsOptions`, `TrackServerResult`, `ServerTrackHelpers` types
- `ingest-url` utilities for URL resolution across Next.js, Vite, and Node environments
- Consent gating: `consentRequired` / `consentGranted` props on `<Analytics />`
- `PRIVACY_DISCLOSURE` and `getStoredKeys()` privacy exports
- `TrackClick` declarative click tracking component
- `AnalyticsProvider` and `useTrack` hook for shared config
- `AnalyticsErrorBoundary` for React render error tracking

## [1.4.0] - 2025-01-01

### Added

- Initial public release
- `<Analytics />` component with automatic pageviews, web vitals, scroll depth, time on page
- `trackEvent`, `trackError`, `trackPageView`, `trackClick` client functions
- `optOut`, `optIn`, `checkDoNotTrack` privacy controls
- Brave browser detection via client hints
