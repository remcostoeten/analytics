import { Code, Section, styles } from "@/shared/ui";
import { IdentityDemo } from "./identity-demo";

export default function IdentityPage() {
	return (
		<main style={styles.main}>
			<h1>Identity</h1>
			<p style={styles.lead}>
				Every event already carries an anonymous visitor ID and a session ID. Identity APIs attach
				your own user ID and traits on top, and they persist — later events pick them up without you
				passing anything.
			</p>

			<Section title="Try it">
				<IdentityDemo />
			</Section>

			<Section
				title="Two levels of identity"
				hint={
					<>
						<code>identify</code> sets a known user ID plus traits. <code>identifyUser</code> sets
						traits only, which is what you want before someone signs up.
					</>
				}
			>
				<Code>{`identify("user_42", { plan: "pro", seats: 3 });
identifyUser({ theme: "dark", betaTester: true });`}</Code>
			</Section>

			<Section
				title="Experiments"
				hint="Assignments are stored and merged into the meta of every later event, so you can split any metric by variant after the fact."
			>
				<Code>{`setExperiment("pricing_page", "variant_b");`}</Code>
			</Section>

			<Section
				title="Visitor and session control"
				hint={
					<>
						The visitor ID lives in <code>localStorage</code> and outlives the tab. The session ID
						lives in <code>sessionStorage</code> and expires after 30 minutes of inactivity. Reset
						the visitor on logout so the next user is not merged into the previous one.
					</>
				}
			>
				<Code>{`getVisitorId();      // stable across sessions
resetVisitorId();    // call on logout

getSessionId();
extendSession();     // push the inactivity timeout forward
resetSessionId();    // force a new session`}</Code>
			</Section>
		</main>
	);
}
