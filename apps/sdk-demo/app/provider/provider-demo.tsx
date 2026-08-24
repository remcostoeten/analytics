"use client";

import { useState } from "react";
import {
	AnalyticsProvider,
	AnalyticsErrorBoundary,
	useTrack,
} from "@remcostoeten/analytics";
import { Status, styles } from "@/shared/ui";

type Props = {
	onTracked: (message: string) => void;
};

function ScopedButtons({ onTracked }: Props) {
	const track = useTrack();

	function handleEvent() {
		track.trackEvent("checkout_started", { step: 1 });
		onTracked('track.trackEvent("checkout_started", { step: 1 }) — projectId came from context');
	}

	function handleOverride() {
		track.trackEvent("checkout_started", { step: 1 }, { projectId: "one-off-project" });
		onTracked('Per-call override won: projectId "one-off-project"');
	}

	return (
		<div style={styles.controls}>
			<button style={styles.button} onClick={handleEvent}>
				useTrack() with context options
			</button>
			<button style={styles.button} onClick={handleOverride}>
				Override projectId for one call
			</button>
		</div>
	);
}

function Exploder({ shouldThrow }: { shouldThrow: boolean }) {
	if (shouldThrow) {
		throw new Error("Render blew up inside AnalyticsErrorBoundary");
	}
	return <span style={{ fontSize: "14px", color: "#666" }}>Child rendering normally.</span>;
}

export function ProviderDemo() {
	const [status, setStatus] = useState<string | null>(null);
	const [shouldThrow, setShouldThrow] = useState(false);

	return (
		<div>
			<AnalyticsProvider projectId="sdk-demo-scoped" debug>
				<ScopedButtons onTracked={setStatus} />

				<div style={{ ...styles.controls, marginTop: "20px" }}>
					<button style={styles.button} onClick={() => setShouldThrow(true)}>
						Throw inside the boundary
					</button>
					<span style={{ fontSize: "13px", color: "#888" }}>
						The boundary exposes no reset API — reload the page to try again.
					</span>
				</div>

				<div style={{ marginTop: "12px" }}>
					<AnalyticsErrorBoundary
						fallback={
							<span style={{ fontSize: "14px", color: "#b00" }}>
								Fallback rendered — the error was sent as an error event.
							</span>
						}
						onError={(error) => setStatus(`AnalyticsErrorBoundary caught: ${error.message}`)}
					>
						<Exploder shouldThrow={shouldThrow} />
					</AnalyticsErrorBoundary>
				</div>
			</AnalyticsProvider>

			<Status message={status} />
		</div>
	);
}
