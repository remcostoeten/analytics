# @remcostoeten/analytics

Privacy-focused analytics SDK designed for high-performance tracking of page views and custom events in React and Next.js applications. It prioritizes user privacy by operating without cookies and utilizing secure, server-side IP hashing.

## Features

- **Privacy-First**: Operates without cookies or raw IP storage, ensuring GDPR and CCPA compliance.
- **Lightweight**: Minimal footprint (approx 1.6 KB gzipped) to maintain optimal page load performance.
- **Reliable Data Delivery**: Leverages the `sendBeacon` API for non-blocking background transmissions, with a robust `fetch` fallback.
- **TypeScript First**: First-class support with exhaustive type definitions for a better developer experience.
- **Framework Agnostic (React)**: Seamlessly integrates with Next.js (App and Pages Router) and standard React SPAs.
- **Compliance Built-in**: Native respect for "Do Not Track" (DNT) headers and user opt-out mechanisms.
- **Intelligent Deduplication**: Client-side logic prevents duplicate event firing during rapid interactions.

## How it Works

The SDK operates on a "thin client" philosophy. It captures minimal client-side signals (path, referrer, browser language) and combines them with a persistent `visitorId` (stored in `localStorage`) and a `sessionId` (stored in `sessionStorage`).

### Event Lifecycle

1. **Initialization**: The `<Analytics />` component initializes tracking and listens for route changes.
2. **Capture**: When an event occurs (page view or custom event), the SDK gathers environmental metadata.
3. **Dispatch**: Data is dispatched to the ingestion endpoint. The SDK uses `navigator.sendBeacon` to ensure the event is sent even if the user is navigating away from the page.
4. **Ingestion**: The server validates the payload, extracts geographical data from headers, hashes the IP address, and persists the event to the database.

## Installation

```bash
npm install @remcostoeten/analytics
# or
yarn add @remcostoeten/analytics
# or
pnpm add @remcostoeten/analytics
# or
bun add @remcostoeten/analytics
```

## Quick Start

### Next.js App Router

```tsx
import { Analytics } from "@remcostoeten/analytics";

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
```

### Next.js Pages Router

```tsx
// pages/_app.tsx
import { Analytics } from "@remcostoeten/analytics";

export default function App({ Component, pageProps }) {
	return (
		<>
			<Component {...pageProps} />
			<Analytics />
		</>
	);
}
```

### React SPA

```tsx
// App.tsx
import { Analytics } from "@remcostoeten/analytics";

function App() {
	return (
		<>
			<Analytics />
			{/* Your app content */}
		</>
	);
}
```

## Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_REMCO_ANALYTICS_URL=https://your-ingestion-url.com
```

### Component Props

```tsx
<Analytics
	projectId="my-project" // Optional: defaults to hostname
	ingestUrl="https://example.com" // Optional: override ingestion URL
	disabled={false} // Optional: disable tracking
	debug={false} // Optional: enable debug logging
/>
```

## API Reference

### `<Analytics />`

React component that automatically tracks page views.

**Props:**

- `projectId?: string` - Project identifier (defaults to `window.location.hostname`)
- `ingestUrl?: string` - Ingestion endpoint URL (defaults to env var or `http://localhost:3001`)
- `disabled?: boolean` - Disable all tracking (default: `false`)
- `debug?: boolean` - Enable debug console logging (default: `false`)

### `track(type, meta?, options?)`

Core tracking function for custom events.

```tsx
import { track } from "@remcostoeten/analytics";

track("event", { action: "button_click", label: "signup" });
```

**Parameters:**

- `type: 'pageview' | 'event' | 'click' | 'error'` - Event type
- `meta?: Record<string, unknown>` - Custom metadata
- `options?: TrackOptions` - Configuration options

### `trackPageView(meta?, options?)`

Track a page view event.

```tsx
import { trackPageView } from "@remcostoeten/analytics";

trackPageView({ source: "navigation" });
```

### `trackEvent(eventName, meta?, options?)`

Track a custom event with a name.

```tsx
import { trackEvent } from "@remcostoeten/analytics";

trackEvent("signup", { plan: "pro", trial: true });
```

### `trackClick(elementName, meta?, options?)`

Track a click event.

```tsx
import { trackClick } from "@remcostoeten/analytics";

trackClick("cta_button", { position: "hero" });
```

### `trackError(error, meta?, options?)`

Track an error event.

```tsx
import { trackError } from "@remcostoeten/analytics";

try {
	// Some code
} catch (error) {
	trackError(error as Error, { context: "checkout" });
}
```

### Identity Management

```tsx
import {
	getVisitorId,
	resetVisitorId,
	getSessionId,
	resetSessionId,
} from "@remcostoeten/analytics";

const visitorId = getVisitorId(); // Get current visitor ID
resetVisitorId(); // Generate new visitor ID

const sessionId = getSessionId(); // Get current session ID (30min timeout)
resetSessionId(); // Generate new session ID
```

### Privacy Controls

```tsx
import { optOut, optIn, isOptedOut } from "@remcostoeten/analytics";

optOut(); // Disable tracking for this user
optIn(); // Re-enable tracking
isOptedOut(); // Check opt-out status (returns boolean)
```

## Examples

### Track Custom Events

```tsx
"use client";

import { trackEvent } from "@remcostoeten/analytics";

export function SignupButton() {
	function handleSignup() {
		trackEvent("signup_initiated", {
			plan: "premium",
			source: "pricing_page",
		});
	}

	return <button onClick={handleSignup}>Sign Up</button>;
}
```

### Track Errors

```tsx
"use client";

import { useEffect } from "react";
import { trackError } from "@remcostoeten/analytics";

export function ErrorBoundary({ children }) {
	useEffect(() => {
		function handleError(event: ErrorEvent) {
			trackError(event.error, {
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
			});
		}

		window.addEventListener("error", handleError);
		return () => window.removeEventListener("error", handleError);
	}, []);

	return <>{children}</>;
}
```

### Privacy Controls UI

```tsx
"use client";

import { useState, useEffect } from "react";
import { optOut, optIn, isOptedOut } from "@remcostoeten/analytics";

export function PrivacySettings() {
	const [opted, setOpted] = useState(false);

	useEffect(() => {
		setOpted(isOptedOut());
	}, []);

	function handleToggle() {
		if (opted) {
			optIn();
			setOpted(false);
		} else {
			optOut();
			setOpted(true);
		}
	}

	return (
		<label>
			<input type="checkbox" checked={opted} onChange={handleToggle} />
			Opt out of analytics
		</label>
	);
}
```

### Conditional Tracking

```tsx
<Analytics
	projectId="my-app"
	disabled={process.env.NODE_ENV === "development"}
	debug={process.env.NODE_ENV === "development"}
/>
```

## How It Works

### Visitor Identification

- **Visitor ID**: Generated on first visit, stored in `localStorage`
- **Session ID**: Generated per session, stored in `sessionStorage` with 30-minute timeout
- **Fallback**: If storage is blocked, ephemeral IDs are generated

### Data Sent

Each tracking call sends:

```typescript
{
  type: 'pageview' | 'event' | 'click' | 'error',
  projectId: string,
  path: string,
  referrer: string | null,
  origin: string,
  host: string,
  ua: string,          // User agent
  lang: string,        // Browser language
  visitorId: string,   // Persistent visitor ID
  sessionId: string,   // Session ID
  meta?: object        // Custom metadata
}
```

### Privacy Features

- **No HTTP cookies**: Uses localStorage/sessionStorage only.
- **No raw IPs**: IPs are hashed server-side with daily salt rotation.
- **Opt-out support**: Users can disable tracking permanently.
- **DNT respect**: Honors Do Not Track browser setting.
- **Client deduplication**: Prevents duplicate events within 5 seconds.
- **SSR safe**: Automatically skips tracking on server.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

Uses `navigator.sendBeacon` with automatic fallback to `fetch` with `keepalive`.

## TypeScript Support

Full TypeScript support included. Types are automatically exported:

```typescript
import type { TrackOptions, EventPayload } from "@remcostoeten/analytics";
```

## Performance

- **Bundle size**: 1.6 KB gzipped (ESM)
- **Runtime overhead**: < 1ms per event
- **Network**: Uses `sendBeacon` for non-blocking requests
- **Tree-shakeable**: Only import what you need

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Repository

[https://github.com/remcostoeten/analytics](https://github.com/remcostoeten/analytics)

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/remcostoeten/analytics/issues).
