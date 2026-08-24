import { Code, Section, styles } from "@/shared/ui";
import { ConsentDemo } from "./consent-demo";

export default function ConsentPage() {
	return (
		<main style={styles.main}>
			<h1>Consent</h1>
			<p style={styles.lead}>
				By default the SDK tracks immediately. Under GDPR that is only defensible because it stores
				no cookies and hashes IPs server-side — if your regulator or legal team disagrees, gate it.
				Consent is off by default, so this is the one thing you have to wire up yourself.
			</p>

			<Section title="Try it">
				<ConsentDemo />
			</Section>

			<Section
				title="Declaring it on the component"
				hint="Drive both props from whatever your banner persists. While consent is required and not granted, no observers are attached at all."
			>
				<Code>{`const [granted, setGranted] = useState(() => readStoredChoice());

<Analytics
  projectId="sdk-demo"
  consentRequired
  consentGranted={granted}
/>`}</Code>
			</Section>

			<Section
				title="Driving it imperatively"
				hint="Useful when the banner lives outside the React tree that renders <Analytics />."
			>
				<Code>{`setConsentRequired(true);
setConsentGranted(userClickedAccept);

canTrack();   // false until granted`}</Code>
			</Section>

			<Section
				title="Revocation clears storage"
				hint={
					<>
						Going from granted to not granted calls <code>clearAnalyticsStorage()</code> for you:
						visitor ID, session, traits, experiments, and any queued offline events are dropped.
						Persistence is also blocked while consent is withheld, so nothing accumulates in the
						meantime.
					</>
				}
			>
				<Code>{`setConsentGranted(false);   // storage wiped, tracking stops`}</Code>
			</Section>

			<Section
				title="Consent is not opt-out"
				hint={
					<>
						These two systems are independent. Consent is a session-level gate you drive from a
						banner and it resets on reload. Opt-out is a persisted user preference — see the{" "}
						<a href="/privacy" style={styles.navLink}>
							privacy page
						</a>
						.
					</>
				}
			>
				<Code>{`hasConsent();   // banner state, in memory
isOptedOut();   // user preference, localStorage`}</Code>
			</Section>
		</main>
	);
}
