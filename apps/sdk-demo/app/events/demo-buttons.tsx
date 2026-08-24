"use client";

import { useState } from "react";
import {
	trackEvent,
	trackClick,
	trackError,
	trackTransaction,
	trackSearch,
	trackPageView,
	TrackClick,
} from "@remcostoeten/analytics";
import { Status, styles } from "@/shared/ui";

export function DemoButtons() {
	const [status, setStatus] = useState<string | null>(null);
	const [query, setQuery] = useState("dark mode");

	function handleEvent() {
		trackEvent("signup_clicked", { plan: "pro" });
		setStatus('trackEvent("signup_clicked", { plan: "pro" })');
	}

	function handleClick() {
		trackClick("pricing_card", { tier: "pro" });
		setStatus('trackClick("pricing_card", { tier: "pro" })');
	}

	function handleError() {
		trackError(new Error("Something went wrong"), { context: "demo" });
		setStatus('trackError(new Error("Something went wrong"), { context: "demo" })');
	}

	function handleTransaction() {
		trackTransaction(49, "USD", "order_1024", 1);
		setStatus('trackTransaction(49, "USD", "order_1024", 1)');
	}

	function handleSearch() {
		trackSearch(query, 12);
		setStatus(`trackSearch("${query}", 12)`);
	}

	function handleVirtualPageView() {
		trackPageView({ virtual: true }, { path: "/events/virtual-step-2" });
		setStatus('trackPageView({ virtual: true }, { path: "/events/virtual-step-2" })');
	}

	async function handleServerEvent() {
		setStatus("POST /api/purchase …");
		try {
			const res = await fetch("/api/purchase", { method: "POST" });
			const data = (await res.json()) as { ok: boolean };
			setStatus(
				data.ok
					? 'trackServerEvent("purchase_completed") sent — check your ingestion logs'
					: "Server responded without ok:true",
			);
		} catch (error) {
			setStatus(`Request failed: ${(error as Error).message}`);
		}
	}

	return (
		<div>
			<div style={styles.controls}>
				<button style={styles.button} onClick={handleEvent}>
					trackEvent
				</button>
				<button style={styles.button} onClick={handleClick}>
					trackClick
				</button>
				<button style={styles.button} onClick={handleError}>
					trackError
				</button>
				<button style={styles.button} onClick={handleTransaction}>
					trackTransaction
				</button>
				<button style={styles.button} onClick={handleVirtualPageView}>
					trackPageView
				</button>
				<TrackClick name="hero_cta" meta={{ variant: "primary" }}>
					<button style={styles.button}>&lt;TrackClick&gt;</button>
				</TrackClick>
				<button style={styles.button} onClick={handleServerEvent}>
					trackServerEvent
				</button>
			</div>

			<div style={{ ...styles.controls, marginTop: "12px" }}>
				<input
					style={styles.input}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					aria-label="Search query"
				/>
				<button style={styles.button} onClick={handleSearch}>
					trackSearch
				</button>
			</div>

			<Status message={status} />
		</div>
	);
}
