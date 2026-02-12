# SDK Usage and API Documentation

Owner: Remco
Status: Draft

## Overview

Complete guide for integrating and using the `@remcostoeten/analytics` SDK in web applications.

## Installation

```bash
# Using bun
bun add @remcostoeten/analytics

# Using npm
npm install @remcostoeten/analytics

# Using yarn
yarn add @remcostoeten/analytics

# Using pnpm
pnpm add @remcostoeten/analytics
```

## Quick Start

### Next.js App Router

```typescript
// app/layout.tsx
import { Analytics } from '@remcostoeten/analytics'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Next.js Pages Router

```typescript
// pages/_app.tsx
import { Analytics } from '@remcostoeten/analytics'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

### React SPA

```typescript
// src/App.tsx
import { Analytics } from '@remcostoeten/analytics'

export default function App() {
  return (
    <div>
      <Analytics />
      {/* Your app content */}
    </div>
  )
}
```

## Component API

### Analytics Component

The main component that automatically tracks page views.

```typescript
import { Analytics } from '@remcostoeten/analytics'

function App() {
  return <Analytics />
}
```

#### Props

```typescript
type AnalyticsProps = {
  projectId?: string
  ingestUrl?: string
  disabled?: boolean
  debug?: boolean
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projectId` | `string` | `window.location.hostname` | Override project identifier |
| `ingestUrl` | `string` | Env var or default endpoint | Custom ingestion endpoint URL |
| `disabled` | `boolean` | `false` | Disable tracking completely |
| `debug` | `boolean` | `false` | Enable console logging |

#### Examples

```typescript
// Basic usage with defaults
<Analytics />

// Custom project ID
<Analytics projectId="my-app" />

// Custom ingestion URL
<Analytics ingestUrl="https://analytics.example.com/ingest" />

// Development mode (disable tracking)
<Analytics disabled={process.env.NODE_ENV === 'development'} />

// Debug mode
<Analytics debug={true} />

// Multiple options
<Analytics
  projectId="production-app"
  ingestUrl="https://analytics.example.com/ingest"
  disabled={false}
  debug={false}
/>
```

## Track Function API

Manual event tracking for custom events.

```typescript
import { track } from '@remcostoeten/analytics'

function handleButtonClick() {
  track('button_click', {
    button: 'signup',
    location: 'homepage',
  })
}
```

### Function Signature

```typescript
function track(
  eventType: string,
  meta?: Record<string, unknown>,
  options?: TrackOptions
): void

type TrackOptions = {
  projectId?: string
  ingestUrl?: string
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `eventType` | `string` | Yes | Event type identifier (lowercase, no spaces) |
| `meta` | `Record<string, unknown>` | No | Custom event metadata |
| `options` | `TrackOptions` | No | Override project ID or ingest URL |

### Examples

#### Simple Event

```typescript
track('newsletter_signup')
```

#### Event with Metadata

```typescript
track('purchase', {
  productId: 'prod_123',
  price: 99.99,
  currency: 'USD',
  quantity: 1,
})
```

#### Event with Options

```typescript
track('custom_event', { action: 'test' }, {
  projectId: 'custom-project',
  ingestUrl: 'https://custom.example.com/ingest',
})
```

## Common Use Cases

### Track Button Clicks

```typescript
import { track } from '@remcostoeten/analytics'

function SignupButton() {
  function handleClick() {
    track('button_click', {
      button: 'signup',
      location: 'header',
    })
  }
  
  return <button onClick={handleClick}>Sign Up</button>
}
```

### Track Form Submissions

```typescript
import { track } from '@remcostoeten/analytics'

function ContactForm() {
  async function handleSubmit(e) {
    e.preventDefault()
    
    track('form_submit', {
      form: 'contact',
      fields: ['name', 'email', 'message'],
    })
    
    // Submit form data
  }
  
  return <form onSubmit={handleSubmit}>{/* form fields */}</form>
}
```

### Track Errors

```typescript
import { track } from '@remcostoeten/analytics'

function ErrorBoundary({ children }) {
  function handleError(error) {
    track('error', {
      message: error.message,
      stack: error.stack,
      component: 'ErrorBoundary',
    })
  }
  
  return <ErrorBoundaryWrapper onError={handleError}>{children}</ErrorBoundaryWrapper>
}
```

### Track Search Queries

```typescript
import { track } from '@remcostoeten/analytics'

function SearchBar() {
  function handleSearch(query) {
    track('search', {
      query,
      results: results.length,
    })
  }
  
  return <input type="search" onChange={(e) => handleSearch(e.target.value)} />
}
```

### Track Video Play

```typescript
import { track } from '@remcostoeten/analytics'

function VideoPlayer({ videoId }) {
  function handlePlay() {
    track('video_play', {
      videoId,
      timestamp: Date.now(),
    })
  }
  
  function handleComplete() {
    track('video_complete', {
      videoId,
    })
  }
  
  return <video onPlay={handlePlay} onEnded={handleComplete} />
}
```

### Track External Link Clicks

```typescript
import { track } from '@remcostoeten/analytics'

function ExternalLink({ href, children }) {
  function handleClick() {
    track('external_link', {
      url: href,
      text: children,
    })
  }
  
  return (
    <a href={href} onClick={handleClick} target="_blank" rel="noopener">
      {children}
    </a>
  )
}
```

### Track Download Events

```typescript
import { track } from '@remcostoeten/analytics'

function DownloadButton({ file }) {
  function handleDownload() {
    track('download', {
      file: file.name,
      size: file.size,
      type: file.type,
    })
  }
  
  return <button onClick={handleDownload}>Download {file.name}</button>
}
```

## Environment Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_REMCO_ANALYTICS_URL=https://analytics.example.com/ingest
NEXT_PUBLIC_REMCO_ANALYTICS_PROJECT=my-app
```

### Usage Priority

1. Props passed to `<Analytics />` or `track()`
2. Environment variables
3. Default values

```typescript
// This will use the environment variable if set, otherwise defaults
<Analytics />

// This will override the environment variable
<Analytics projectId="custom-project" />
```

## Advanced Usage

### Conditional Tracking

```typescript
function App() {
  const shouldTrack = process.env.NODE_ENV === 'production'
  
  return (
    <>
      <Analytics disabled={!shouldTrack} />
      {/* app content */}
    </>
  )
}
```

### Multiple Projects

```typescript
// Track to different projects from same app
track('event_in_project_a', {}, { projectId: 'project-a' })
track('event_in_project_b', {}, { projectId: 'project-b' })
```

### Custom Hooks

```typescript
// hooks/use-track-page-view.ts
import { useEffect } from 'react'
import { track } from '@remcostoeten/analytics'

export function useTrackPageView(pageName: string) {
  useEffect(() => {
    track('pageview', { page: pageName })
  }, [pageName])
}

// Usage
function AboutPage() {
  useTrackPageView('about')
  return <div>About content</div>
}
```

### Track Navigation (React Router)

```typescript
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { track } from '@remcostoeten/analytics'

function App() {
  const location = useLocation()
  
  useEffect(() => {
    track('pageview', {
      path: location.pathname,
      search: location.search,
    })
  }, [location])
  
  return <div>{/* app content */}</div>
}
```

### Track with User Context

```typescript
import { track } from '@remcostoeten/analytics'

function trackWithUser(eventType: string, meta?: Record<string, unknown>) {
  const user = getCurrentUser()
  
  track(eventType, {
    ...meta,
    userId: user?.id,
    userPlan: user?.plan,
  })
}

// Usage
trackWithUser('feature_used', { feature: 'export' })
```

## TypeScript Support

### Type Definitions

```typescript
// Full type definitions
import type {
  Analytics,
  track,
  TrackOptions,
  AnalyticsProps,
} from '@remcostoeten/analytics'

// Event metadata types
type ButtonClickMeta = {
  button: string
  location: string
}

type PurchaseMeta = {
  productId: string
  price: number
  currency: string
}

// Typed track function
function trackButtonClick(meta: ButtonClickMeta) {
  track('button_click', meta)
}
```

### Strict Event Types

```typescript
// Define your event schema
type EventMap = {
  button_click: {
    button: string
    location: string
  }
  form_submit: {
    form: string
    fields: string[]
  }
  purchase: {
    productId: string
    price: number
  }
}

// Type-safe track function
function typedTrack<K extends keyof EventMap>(
  eventType: K,
  meta: EventMap[K],
  options?: TrackOptions
) {
  track(eventType, meta, options)
}

// Usage with autocomplete and type checking
typedTrack('button_click', {
  button: 'signup',
  location: 'header',
})

// TypeScript error: missing required fields
typedTrack('button_click', {
  button: 'signup',
  // Error: Property 'location' is missing
})
```

## Privacy and Opt-Out

### Check Opt-Out Status

```typescript
import { isOptedOut } from '@remcostoeten/analytics'

function App() {
  const optedOut = isOptedOut()
  
  return (
    <>
      {!optedOut && <Analytics />}
      {/* app content */}
    </>
  )
}
```

### Opt-Out Button

```typescript
import { optOut, optIn, isOptedOut } from '@remcostoeten/analytics'
import { useState } from 'react'

function PrivacyControls() {
  const [opted, setOpted] = useState(isOptedOut())
  
  function handleToggle() {
    if (opted) {
      optIn()
      setOpted(false)
    } else {
      optOut()
      setOpted(true)
    }
  }
  
  return (
    <button onClick={handleToggle}>
      {opted ? 'Enable' : 'Disable'} Analytics
    </button>
  )
}
```

### Respect Do Not Track

```typescript
// This is handled automatically by the SDK
// Users with DNT=1 are not tracked
```

## Testing

### Mock for Unit Tests

```typescript
// __mocks__/@remcostoeten/analytics.ts
export const Analytics = () => null

export const track = jest.fn()

export const isOptedOut = jest.fn(() => false)

export const optOut = jest.fn()

export const optIn = jest.fn()
```

### Usage in Tests

```typescript
import { track } from '@remcostoeten/analytics'
import { render, fireEvent } from '@testing-library/react'

jest.mock('@remcostoeten/analytics')

test('tracks button click', () => {
  const { getByText } = render(<SignupButton />)
  
  fireEvent.click(getByText('Sign Up'))
  
  expect(track).toHaveBeenCalledWith('button_click', {
    button: 'signup',
    location: 'header',
  })
})
```

## Troubleshooting

### Events Not Appearing

1. Check browser console for errors
2. Enable debug mode: `<Analytics debug={true} />`
3. Verify ingestion endpoint is accessible
4. Check if tracking is disabled
5. Verify JavaScript is executing (check visitor/session IDs)

### Duplicate Events

The SDK includes client-side dedupe protection. If you see duplicates:
1. Avoid calling `track()` in render functions
2. Use `useEffect` with proper dependencies
3. Check for multiple `<Analytics />` components

### localStorage Blocked

If localStorage is unavailable (Safari private mode, restrictive browsers):
- SDK falls back to ephemeral IDs
- Analytics still works, but visitor tracking is per-session
- No action required, SDK handles this automatically

### CORS Issues

If you see CORS errors:
1. Ensure ingestion endpoint allows your origin
2. Check ingestion server CORS configuration
3. Use `credentials: 'omit'` if needed

### TypeScript Errors

If you get type errors:
1. Ensure `@remcostoeten/analytics` is installed
2. Check TypeScript version compatibility
3. Add to `tsconfig.json` if needed:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Performance Considerations

### Bundle Size

- Core SDK: ~3KB gzipped
- Zero dependencies
- Tree-shakeable exports

### Load Impact

- Non-blocking: Uses `sendBeacon` API
- Fallback to `fetch` with `keepalive`
- No impact on page load times
- No layout shift

### Network Usage

- Single request per event
- JSON payload: typically < 1KB
- No cookies sent (smaller headers)
- Batching not needed for low volume

## Migration Guide

### From Google Analytics

```typescript
// Before (Google Analytics)
gtag('event', 'button_click', {
  event_category: 'engagement',
  event_label: 'signup',
})

// After (Remco Analytics)
track('button_click', {
  category: 'engagement',
  label: 'signup',
})
```

### From Plausible

```typescript
// Before (Plausible)
plausible('Signup', { props: { plan: 'pro' } })

// After (Remco Analytics)
track('signup', { plan: 'pro' })
```

### From Mixpanel

```typescript
// Before (Mixpanel)
mixpanel.track('Button Clicked', {
  button_name: 'signup',
})

// After (Remco Analytics)
track('button_click', {
  button: 'signup',
})
```

## Best Practices

### Event Naming

- Use lowercase with underscores: `button_click`, `form_submit`
- Be specific: `checkout_started` not `action`
- Keep consistent: `video_play`, `video_pause`, `video_complete`

### Metadata Structure

- Use flat objects when possible
- Keep keys descriptive
- Avoid deeply nested objects
- Don't include sensitive data

### Performance

- Track user actions, not render cycles
- Use `useEffect` with proper dependencies
- Debounce high-frequency events (scrolling, typing)
- Don't track in loops

### Privacy

- Never track PII (emails, names, addresses)
- Don't include passwords or tokens
- Respect user opt-out
- Be transparent about tracking

## API Reference Summary

### Components

- `<Analytics />` - Main component for automatic page view tracking

### Functions

- `track(eventType, meta?, options?)` - Manual event tracking
- `trackPageView(options?)` - Explicit page view tracking
- `getVisitorId()` - Get current visitor ID
- `getSessionId()` - Get current session ID
- `resetVisitorId()` - Clear visitor ID from localStorage
- `resetSessionId()` - Clear session ID from sessionStorage
- `optOut()` - Disable tracking for user
- `optIn()` - Enable tracking for user
- `isOptedOut()` - Check if user has opted out

### Types

- `AnalyticsProps` - Props for Analytics component
- `TrackOptions` - Options for track function
- `EventMeta` - Generic event metadata type

## Support

For issues, questions, or contributions:
- GitHub: github.com/remcostoeten/analytics
- Documentation: docs.remcostoeten.com/analytics
- License: MIT