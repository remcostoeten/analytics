import Link from "next/link";
import { Code, Section, styles } from "@/shared/ui";

const SURFACES = [
	{
		href: "/events",
		label: "Events",
		covers: "trackEvent, trackClick, trackError, trackTransaction, trackSearch, TrackClick",
	},
	{
		href: "/provider",
		label: "Provider",
		covers: "AnalyticsProvider, useTrack, AnalyticsErrorBoundary",
	},
	{
		href: "/identity",
		label: "Identity",
		covers: "identify, identifyUser, setExperiment, visitor and session IDs",
	},
	{
		href: "/consent",
		label: "Consent",
		covers: "consentRequired, consentGranted, setConsentGranted, canTrack",
	},
	{
		href: "/privacy",
		label: "Privacy",
		covers: "optOut, optIn, checkDoNotTrack, getStoredKeys, offline queue",
	},
];

export default function Home() {
	return (
		<main style={styles.main}>
			<h1>Analytics SDK Demo</h1>
			<p style={styles.lead}>
				A working consumer of <code>@remcostoeten/analytics</code>. Every page here exercises a
				different part of the public API. Open DevTools and watch <code>POST /e</code> to see the
				events leave the browser.
			</p>

			<Section
				title="Automatic tracking"
				hint={
					<>
						Mounting <code>&lt;Analytics /&gt;</code> once in <code>app/layout.tsx</code> covers
						every route in the app.
					</>
				}
			>
				<p style={{ fontSize: "14px" }}>
					Pageviews, web vitals, scroll depth, and time-on-page start with no configuration. Clicks,
					outbound links, form submissions, and uncaught errors are opt-in props — this demo turns
					all four on.
				</p>
				<Code>{`<Analytics
  projectId="sdk-demo"
  debug={process.env.NODE_ENV === "development"}
  trackClicks
  trackOutbound
  trackForms
  trackErrors
/>`}</Code>
			</Section>

			<Section title="What each page covers">
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>Page</th>
							<th style={styles.th}>API surface</th>
						</tr>
					</thead>
					<tbody>
						{SURFACES.map((surface) => (
							<tr key={surface.href}>
								<td style={styles.td}>
									<Link href={surface.href} style={styles.navLink}>
										{surface.label}
									</Link>
								</td>
								<td style={styles.td}>{surface.covers}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Section>

			<Section
				title="Server-side tracking"
				hint={
					<>
						<code>trackServerEvent</code> runs from a route handler, so it needs{" "}
						<code>ANALYTICS_URL</code> and <code>INGEST_SECRET</code> rather than the public URL.
					</>
				}
			>
				<Code>{`import { trackServerEvent } from "@remcostoeten/analytics/server";

await trackServerEvent(
  "purchase_completed",
  { plan: "pro", revenue: 49, currency: "USD" },
  { projectId: "sdk-demo", path: "/api/purchase" },
);`}</Code>
			</Section>
		</main>
	);
}
