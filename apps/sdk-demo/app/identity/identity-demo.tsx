"use client";

import { useEffect, useState } from "react";
import {
	identify,
	identifyUser,
	setExperiment,
	getVisitorId,
	resetVisitorId,
	getSessionId,
	resetSessionId,
	extendSession,
} from "@remcostoeten/analytics";
import { Status, styles } from "@/shared/ui";

type Ids = {
	visitorId: string;
	sessionId: string;
};

export function IdentityDemo() {
	const [status, setStatus] = useState<string | null>(null);
	const [ids, setIds] = useState<Ids | null>(null);
	const [userId, setUserId] = useState("user_42");

	function refreshIds() {
		setIds({ visitorId: getVisitorId(), sessionId: getSessionId() });
	}

	useEffect(() => {
		refreshIds();
	}, []);

	function handleIdentify() {
		identify(userId, { plan: "pro", seats: 3 });
		refreshIds();
		setStatus(`identify("${userId}", { plan: "pro", seats: 3 }) — userId now rides on every event`);
	}

	function handleIdentifyUser() {
		identifyUser({ theme: "dark", betaTester: true });
		setStatus("identifyUser({ theme: \"dark\", betaTester: true }) — merged into stored traits");
	}

	function handleExperiment() {
		setExperiment("pricing_page", "variant_b");
		setStatus('setExperiment("pricing_page", "variant_b") — sends an experiment_exposure event');
	}

	function handleResetVisitor() {
		resetVisitorId();
		refreshIds();
		setStatus("resetVisitorId() — a brand new visitor from the next event on");
	}

	function handleResetSession() {
		resetSessionId();
		refreshIds();
		setStatus("resetSessionId() — subsequent events group into a new session");
	}

	function handleExtendSession() {
		extendSession();
		setStatus("extendSession() — pushed the 30-minute inactivity timeout forward");
	}

	return (
		<div>
			<table style={{ ...styles.table, marginBottom: "18px" }}>
				<tbody>
					<tr>
						<td style={styles.td}>visitorId</td>
						<td style={styles.td}>{ids?.visitorId ?? "…"}</td>
					</tr>
					<tr>
						<td style={styles.td}>sessionId</td>
						<td style={styles.td}>{ids?.sessionId ?? "…"}</td>
					</tr>
				</tbody>
			</table>

			<div style={styles.controls}>
				<input
					style={styles.input}
					value={userId}
					onChange={(event) => setUserId(event.target.value)}
					aria-label="User ID"
				/>
				<button style={styles.button} onClick={handleIdentify}>
					identify
				</button>
				<button style={styles.button} onClick={handleIdentifyUser}>
					identifyUser
				</button>
				<button style={styles.button} onClick={handleExperiment}>
					setExperiment
				</button>
			</div>

			<div style={{ ...styles.controls, marginTop: "12px" }}>
				<button style={styles.button} onClick={handleResetVisitor}>
					resetVisitorId
				</button>
				<button style={styles.button} onClick={handleResetSession}>
					resetSessionId
				</button>
				<button style={styles.button} onClick={handleExtendSession}>
					extendSession
				</button>
			</div>

			<Status message={status} />
		</div>
	);
}
