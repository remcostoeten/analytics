# Analytics implementation prompt

Use this prompt to add Remco Analytics to any React or Next.js project.

## Prompt

Install and configure `@remcostoeten/analytics` in this project.

Requirements:

- Install `@remcostoeten/analytics`.
- Set the ingestion URL to `https://ingestion.remcostoeten.nl/`.
- Add the `Analytics` component once near the root of the app.
- Use the current hostname as the default `projectId` unless the project needs a
  custom ID.
- Keep tracking privacy-focused: no cookies, respect DNT, and don't track users
  who opt out.
- Add a small custom event example for one important user action.

For Next.js App Router, add this near the root layout:

```tsx
import { Analytics } from "@remcostoeten/analytics";

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				{children}
				<Analytics ingestUrl="https://ingestion.remcostoeten.nl/" />
			</body>
		</html>
	);
}
```

For React, add this once near the app root:

```tsx
import { Analytics } from "@remcostoeten/analytics";

export function App() {
	return (
		<>
			<YourApp />
			<Analytics ingestUrl="https://ingestion.remcostoeten.nl/" />
		</>
	);
}
```

Add custom events for meaningful product actions, not every click. Good examples:

- `signup_started`
- `signup_completed`
- `checkout_started`
- `checkout_completed`
- `project_created`
- `invite_sent`
- `search_performed`

Example custom event:

```tsx
import { trackEvent } from "@remcostoeten/analytics";

function handleCreateProject(projectType: string) {
	trackEvent(
		"project_created",
		{
			projectType,
			source: "dashboard",
		},
		{
			ingestUrl: "https://ingestion.remcostoeten.nl/",
		},
	);
}
```

Use event names in `snake_case`, keep metadata small, and avoid sending personal
data such as names, email addresses, raw IP addresses, access tokens, or full
form contents.
