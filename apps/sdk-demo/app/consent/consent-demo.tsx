"use client";

import { useEffect, useState } from "react";
import {
	setConsentRequired,
	setConsentGranted,
	isConsentRequired,
	hasConsent,
	canTrack,
	trackEvent,
} from "@remcostoeten/analytics";
import { Status, styles } from "@/shared/ui";

type ConsentState = {
	required: boolean;
	granted: boolean;
	tracking: boolean;
};

function readConsentState(): ConsentState {
	return { required: isConsentRequired(), granted: hasConsent(), tracking: canTrack() };
}

export function ConsentDemo() {
	const [status, setStatus] = useState<string | null>(null);
	const [state, setState] = useState<ConsentState | null>(null);
	const [banner, setBanner] = useState(false);

	useEffect(() => {
		setState(readConsentState());
	}, []);

	function apply(message: string) {
		setState(readConsentState());
		setStatus(message);
	}

	function handleRequire() {
		setConsentRequired(true);
		setBanner(true);
		apply("setConsentRequired(true) — tracking is idle until consent is granted");
	}

	function handleAccept() {
		setConsentGranted(true);
		setBanner(false);
		apply("setConsentGranted(true) — events flow again");
	}

	function handleReject() {
		setConsentGranted(false);
		setBanner(false);
		apply("setConsentGranted(false) — stored IDs and traits were cleared");
	}

	function handleTestEvent() {
		trackEvent("consent_probe");
		setStatus(
			canTrack()
				? 'trackEvent("consent_probe") — sent'
				: 'trackEvent("consent_probe") — dropped, no consent',
		);
	}

	return (
		<div>
			<table style={{ ...styles.table, marginBottom: "18px" }}>
				<tbody>
					<tr>
						<td style={styles.td}>isConsentRequired()</td>
						<td style={styles.td}>{String(state?.required ?? "…")}</td>
					</tr>
					<tr>
						<td style={styles.td}>hasConsent()</td>
						<td style={styles.td}>{String(state?.granted ?? "…")}</td>
					</tr>
					<tr>
						<td style={styles.td}>canTrack()</td>
						<td style={styles.td}>{String(state?.tracking ?? "…")}</td>
					</tr>
				</tbody>
			</table>

			{banner ? (
				<div
					style={{
						border: "1px solid #d4d4d4",
						borderRadius: "8px",
						padding: "16px",
						marginBottom: "16px",
						background: "#fafafa",
					}}
				>
					<p style={{ marginTop: 0, fontSize: "14px" }}>
						We measure page performance and usage. No cookies, no cross-site tracking.
					</p>
					<div style={styles.controls}>
						<button style={styles.button} onClick={handleAccept}>
							Accept
						</button>
						<button style={styles.button} onClick={handleReject}>
							Reject
						</button>
					</div>
				</div>
			) : null}

			<div style={styles.controls}>
				<button style={styles.button} onClick={handleRequire}>
					Require consent
				</button>
				<button
					style={styles.button}
					onClick={() => {
						setConsentRequired(false);
						setBanner(false);
						apply("setConsentRequired(false) — back to tracking by default");
					}}
				>
					Stop requiring consent
				</button>
				<button style={styles.button} onClick={handleTestEvent}>
					Fire a test event
				</button>
			</div>

			<Status message={status} />
		</div>
	);
}
