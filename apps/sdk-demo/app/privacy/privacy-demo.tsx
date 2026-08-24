"use client";

import { useEffect, useState } from "react";
import {
	optIn,
	optOut,
	isOptedOut,
	checkDoNotTrack,
	getStoredKeys,
	flushOfflineQueue,
	clearOfflineQueue,
	trackEvent,
	type StorageKeyInfo,
} from "@remcostoeten/analytics";
import { noop } from "@/shared/lib/noop";
import { Status, styles } from "@/shared/ui";

type StoredKeyRow = StorageKeyInfo & {
	present: boolean;
};

function readStoredValue(info: StorageKeyInfo): boolean {
	try {
		const store = info.storage === "localStorage" ? localStorage : sessionStorage;
		return store.getItem(info.key) !== null;
	} catch {
		noop();
		return false;
	}
}

export function PrivacyDemo() {
	const [status, setStatus] = useState<string | null>(null);
	const [optedOut, setOptedOut] = useState<boolean | null>(null);
	const [dnt, setDnt] = useState<boolean | null>(null);
	const [rows, setRows] = useState<StoredKeyRow[]>([]);

	function refresh() {
		setOptedOut(isOptedOut());
		setDnt(checkDoNotTrack());
		setRows(getStoredKeys().map((info) => ({ ...info, present: readStoredValue(info) })));
	}

	useEffect(() => {
		refresh();
	}, []);

	function handleOptOut() {
		optOut();
		refresh();
		setStatus("optOut() — every stored key cleared and future events dropped");
	}

	function handleOptIn() {
		optIn();
		refresh();
		setStatus("optIn() — tracking allowed again, IDs regenerate on the next event");
	}

	function handleProbe() {
		trackEvent("privacy_probe");
		refresh();
		setStatus(
			isOptedOut() || checkDoNotTrack()
				? 'trackEvent("privacy_probe") — dropped'
				: 'trackEvent("privacy_probe") — sent',
		);
	}

	return (
		<div>
			<table style={{ ...styles.table, marginBottom: "18px" }}>
				<tbody>
					<tr>
						<td style={styles.td}>isOptedOut()</td>
						<td style={styles.td}>{String(optedOut ?? "…")}</td>
					</tr>
					<tr>
						<td style={styles.td}>checkDoNotTrack()</td>
						<td style={styles.td}>{String(dnt ?? "…")}</td>
					</tr>
				</tbody>
			</table>

			<div style={styles.controls}>
				<button style={styles.button} onClick={handleOptOut}>
					optOut
				</button>
				<button style={styles.button} onClick={handleOptIn}>
					optIn
				</button>
				<button style={styles.button} onClick={handleProbe}>
					Fire a test event
				</button>
				<button
					style={styles.button}
					onClick={() => {
						flushOfflineQueue();
						refresh();
						setStatus("flushOfflineQueue() — retried anything queued while offline");
					}}
				>
					flushOfflineQueue
				</button>
				<button
					style={styles.button}
					onClick={() => {
						clearOfflineQueue();
						refresh();
						setStatus("clearOfflineQueue() — dropped queued events without sending");
					}}
				>
					clearOfflineQueue
				</button>
			</div>

			<Status message={status} />

			<h3 style={{ marginTop: "32px", marginBottom: "8px" }}>getStoredKeys()</h3>
			<table style={styles.table}>
				<thead>
					<tr>
						<th style={styles.th}>Key</th>
						<th style={styles.th}>Storage</th>
						<th style={styles.th}>Set</th>
						<th style={styles.th}>Purpose</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.key}>
							<td style={styles.td}>{row.key}</td>
							<td style={styles.td}>{row.storage}</td>
							<td style={styles.td}>{row.present ? "yes" : "no"}</td>
							<td style={{ ...styles.td, fontFamily: "inherit" }}>{row.purpose}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
