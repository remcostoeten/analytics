# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-02-12

### Added

#### Core Functionality
- `<Analytics />` React component for automatic page view tracking
- `track()` function for custom event tracking
- `trackPageView()` helper for manual page view tracking
- `trackEvent()` helper for named custom events
- `trackClick()` helper for click event tracking
- `trackError()` helper for error tracking

#### Identity Management
- `getVisitorId()` - Persistent visitor identification via localStorage
- `resetVisitorId()` - Generate new visitor ID
- `getSessionId()` - Session identification via sessionStorage with 30-minute timeout
- `resetSessionId()` - Generate new session ID
- `extendSession()` - Extend current session timeout

#### Privacy Controls
- `optOut()` - Disable tracking and clear visitor data
- `optIn()` - Re-enable tracking
- `isOptedOut()` - Check user opt-out status
- `checkDoNotTrack()` - Respect browser DNT setting

#### Features
- Client-side event deduplication (5-second window)
- SSR compatibility (Next.js App Router and Pages Router)
- `sendBeacon` API support with automatic fetch fallback
- Environment variable configuration support
- Debug mode for development
- TypeScript type definitions
- Zero dependencies (React as peer dependency only)

#### Privacy & Security
- No HTTP cookies
- No raw IP storage (hashing done server-side)
- localStorage/sessionStorage only for client-side IDs
- GDPR-friendly by design
- DNT (Do Not Track) respect
- User opt-out mechanism
- Ephemeral IDs when storage is blocked

#### Developer Experience
- Full TypeScript support
- Comprehensive test suite (63 tests, 92 assertions)
- ESM and CJS module formats
- Tree-shakeable exports
- Source maps included
- 1.6 KB gzipped bundle size

### Technical Details

#### Build Configuration
- tsup for bundling (ESM + CJS)
- TypeScript 5.x
- Target: ES2020
- Minified production builds

#### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

#### Package Metadata
- Scope: `@remcostoeten`
- License: MIT
- Repository: https://github.com/remcostoeten/analytics
- Author: Remco Stoeten

### Documentation
- Comprehensive README with examples
- API reference documentation
- Quick start guides for Next.js and React
- Privacy and security documentation
- TypeScript usage examples

---

[0.1.0]: https://github.com/remcostoeten/analytics/releases/tag/v0.1.0