# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2024-02-13

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
- `checkDoNotTrack()` - Respect browser Do Not Track setting

#### Technical Features
- Client-side deduplication (5-second window)
- `sendBeacon` API with `fetch` fallback
- SSR compatibility (Next.js App Router + Pages Router)
- TypeScript definitions included
- Zero runtime dependencies
- 1.6 KB gzipped bundle

### Notes

This is the first alpha release of the SDK. Feedback and bug reports welcome!
