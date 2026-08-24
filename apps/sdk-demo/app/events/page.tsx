import { Code, Section, styles } from "@/shared/ui";
import { DemoButtons } from "./demo-buttons";

export default function EventsPage() {
	return (
		<main style={styles.main}>
			<h1>Events</h1>
			<p style={styles.lead}>
				Manual tracking calls. Each button fires exactly one event and reports the call it made.
			</p>

			<Section
				title="Try it"
				hint={
					<>
						Watch the network tab for <code>POST /e</code>. With <code>debug</code> on, each call
						also logs its full payload to the console.
					</>
				}
			>
				<DemoButtons />
			</Section>

			<Section
				title="Named helpers"
				hint="trackEvent is the general escape hatch; the rest are typed shorthands that set a known eventName for you."
			>
				<Code>{`trackEvent("signup_clicked", { plan: "pro" });
trackClick("pricing_card", { tier: "pro" });
trackError(new Error("Something went wrong"), { context: "demo" });
trackTransaction(49, "USD", "order_1024", 1);
trackSearch("dark mode", 12);`}</Code>
			</Section>

			<Section
				title="Virtual pageviews"
				hint="Multi-step flows that never change the URL still deserve a pageview. Pass an explicit path."
			>
				<Code>{`trackPageView({ virtual: true }, { path: "/events/virtual-step-2" });`}</Code>
			</Section>

			<Section
				title="Declarative clicks"
				hint={
					<>
						<code>&lt;TrackClick&gt;</code> clones its single child and wraps the existing{" "}
						<code>onClick</code>, so it composes with handlers the child already has.
					</>
				}
			>
				<Code>{`<TrackClick name="hero_cta" meta={{ variant: "primary" }}>
  <button>Get started</button>
</TrackClick>`}</Code>
			</Section>

			<Section
				title="Server events"
				hint="Route handlers have no visitor storage, so pass projectId and path yourself."
			>
				<Code>{`import { trackServerEvent } from "@remcostoeten/analytics/server";

export async function POST() {
  await trackServerEvent(
    "purchase_completed",
    { plan: "pro", revenue: 49, currency: "USD" },
    { projectId: "sdk-demo", path: "/api/purchase" },
  );
  return Response.json({ ok: true });
}`}</Code>
			</Section>
		</main>
	);
}
