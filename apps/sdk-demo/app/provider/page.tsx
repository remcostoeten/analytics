import { Code, Section, styles } from "@/shared/ui";
import { ProviderDemo } from "./provider-demo";

export default function ProviderPage() {
	return (
		<main style={styles.main}>
			<h1>Provider</h1>
			<p style={styles.lead}>
				The bare <code>trackEvent</code> import works everywhere, but every call then has to repeat
				its options. <code>&lt;AnalyticsProvider&gt;</code> puts them in context once and{" "}
				<code>useTrack()</code> reads them back.
			</p>

			<Section title="Try it">
				<ProviderDemo />
			</Section>

			<Section
				title="Scoping options once"
				hint="Wrap a subtree, then every helper from useTrack() inherits projectId, ingestUrl, debug, path, and referrer."
			>
				<Code>{`<AnalyticsProvider projectId="sdk-demo-scoped" debug>
  <Checkout />
</AnalyticsProvider>

function Checkout() {
  const track = useTrack();
  return <button onClick={() => track.trackEvent("checkout_started", { step: 1 })}>Buy</button>;
}`}</Code>
			</Section>

			<Section
				title="Overriding per call"
				hint="Options passed to an individual call are merged over the context ones, so a single event can target a different project."
			>
				<Code>{`track.trackEvent("checkout_started", { step: 1 }, { projectId: "one-off-project" });`}</Code>
			</Section>

			<Section
				title="Catching render errors"
				hint={
					<>
						<code>trackErrors</code> on <code>&lt;Analytics /&gt;</code> catches window errors, but a
						React render that throws unmounts the tree instead.{" "}
						<code>&lt;AnalyticsErrorBoundary&gt;</code> reports those and renders a fallback.
					</>
				}
			>
				<Code>{`<AnalyticsErrorBoundary
  fallback={<p>Something broke.</p>}
  onError={(error) => console.error(error)}
>
  <RiskyWidget />
</AnalyticsErrorBoundary>`}</Code>
			</Section>
		</main>
	);
}
