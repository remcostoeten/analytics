import { DemoButtons } from "./demo-buttons";

export default function Home() {
	return (
		<main style={{ padding: "40px", fontFamily: "system-ui, sans-serif" }}>
			<h1>Analytics SDK Example</h1>
			<p style={{ color: "#666", marginBottom: "32px" }}>
				Pageviews, web vitals, scroll depth, and time-on-page track automatically via{" "}
				<code>&lt;Analytics /&gt;</code> in layout.tsx.
			</p>

			<h2>Manual tracking</h2>
			<p style={{ color: "#666", marginBottom: "16px" }}>
				Each button fires a different tracking call. Open DevTools network tab to see{" "}
				<code>POST /e</code> requests.
			</p>

			<DemoButtons />

			<h2 style={{ marginTop: "40px" }}>How it works</h2>
			<pre style={{ background: "#f5f5f5", padding: "16px", overflow: "auto" }}>
				{`// layout.tsx — automatic tracking
<Analytics projectId="example-app" />

// client component — manual event
trackEvent("signup_clicked", { plan: "pro" });

// declarative click
<TrackClick name="hero_cta">
  <button>Click me</button>
</TrackClick>

// API route — server-side event
import { trackServerEvent } from "@remcostoeten/analytics/server";
await trackServerEvent("purchase_completed", {
  projectId: "example-app",
  path: "/api/purchase",
});`}
			</pre>
		</main>
	);
}
