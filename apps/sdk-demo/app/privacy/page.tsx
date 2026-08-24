import { PRIVACY_DISCLOSURE } from "@remcostoeten/analytics";
import { Code, Section, styles } from "@/shared/ui";
import { PrivacyDemo } from "./privacy-demo";

export default function PrivacyPage() {
	return (
		<main style={styles.main}>
			<h1>Privacy</h1>
			<p style={styles.lead}>
				Opt-out is a persisted user preference, separate from the consent gate. Once set it survives
				reloads and silently drops every event until it is cleared.
			</p>

			<Section title="Try it">
				<PrivacyDemo />
			</Section>

			<Section
				title="Opting out"
				hint="optOut() clears storage first, then writes the flag — so opting out does not leave the old visitor ID behind."
			>
				<Code>{`optOut();       // clears storage, sets __analytics_opt_out
optIn();        // removes the flag
isOptedOut();   // read it back for your settings UI`}</Code>
			</Section>

			<Section
				title="Do Not Track"
				hint={
					<>
						<code>checkDoNotTrack()</code> reads the browser signal and is honoured automatically
						inside <code>track()</code>. You do not have to wire it up; call it only if you want to
						reflect the state in your own UI.
					</>
				}
			>
				<Code>{`checkDoNotTrack();   // true when the browser sends DNT`}</Code>
			</Section>

			<Section
				title="Offline queue"
				hint="Events that fail to send, or that are fired while the browser reports itself offline, are queued in localStorage and retried. Both controls are exposed if you need to drive that yourself."
			>
				<Code>{`flushOfflineQueue();   // retry now
clearOfflineQueue();   // discard without sending`}</Code>
			</Section>

			<Section
				title="Disclosure"
				hint={
					<>
						<code>PRIVACY_DISCLOSURE</code> is a ready-made string you can drop into a privacy
						policy, and <code>getStoredKeys()</code> above is its machine-readable counterpart.
					</>
				}
			>
				<p style={{ ...styles.code, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
					{PRIVACY_DISCLOSURE}
				</p>
			</Section>
		</main>
	);
}
