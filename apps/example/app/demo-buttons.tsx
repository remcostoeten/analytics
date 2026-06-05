"use client";

import { trackEvent, trackError, TrackClick } from "@remcostoeten/analytics";

export function DemoButtons() {
	function handleSignup() {
		trackEvent("signup_clicked", { plan: "pro" });
	}

	function handleError() {
		trackError(new Error("Something went wrong"), { context: "demo" });
	}

	async function handleServerEvent() {
		const res = await fetch("/api/purchase", { method: "POST" });
		const data = await res.json() as { ok: boolean };
		if (data.ok) {
			alert("Server event sent — check your ingestion logs");
		}
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "320px" }}>
			{/* Manual client event */}
			<button onClick={handleSignup}>
				trackEvent("signup_clicked")
			</button>

			{/* Declarative click tracking — no onClick needed */}
			<TrackClick name="hero_cta" meta={{ variant: "primary" }}>
				<button>TrackClick wrapper</button>
			</TrackClick>

			{/* Error tracking */}
			<button onClick={handleError}>
				trackError(new Error(...))
			</button>

			{/* Triggers a server-side trackServerEvent */}
			<button onClick={handleServerEvent}>
				Server: trackServerEvent("purchase_completed")
			</button>
		</div>
	);
}
