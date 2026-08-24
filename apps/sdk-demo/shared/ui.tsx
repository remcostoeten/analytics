import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const ROUTES = [
	{ href: "/", label: "Overview" },
	{ href: "/events", label: "Events" },
	{ href: "/provider", label: "Provider" },
	{ href: "/identity", label: "Identity" },
	{ href: "/consent", label: "Consent" },
	{ href: "/privacy", label: "Privacy" },
];

export const styles = {
	main: {
		padding: "40px 24px 80px",
		fontFamily: "system-ui, sans-serif",
		maxWidth: "820px",
		margin: "0 auto",
		lineHeight: 1.55,
	},
	nav: {
		display: "flex",
		flexWrap: "wrap",
		gap: "16px",
		padding: "16px 24px",
		borderBottom: "1px solid #e5e5e5",
		fontFamily: "system-ui, sans-serif",
		fontSize: "14px",
	},
	navLink: { color: "#0070f3", textDecoration: "none" },
	lead: { color: "#666", marginBottom: "32px" },
	section: { marginTop: "40px" },
	sectionTitle: { marginBottom: "4px" },
	sectionHint: { color: "#666", marginTop: 0, marginBottom: "16px", fontSize: "14px" },
	controls: { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" },
	button: {
		padding: "8px 14px",
		border: "1px solid #d4d4d4",
		borderRadius: "6px",
		background: "#fafafa",
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
		fontSize: "13px",
		cursor: "pointer",
	},
	input: {
		padding: "8px 10px",
		border: "1px solid #d4d4d4",
		borderRadius: "6px",
		fontSize: "13px",
		fontFamily: "inherit",
	},
	code: {
		background: "#f5f5f5",
		padding: "16px",
		overflow: "auto",
		borderRadius: "6px",
		fontSize: "13px",
		lineHeight: 1.5,
	},
	status: {
		marginTop: "14px",
		padding: "10px 12px",
		borderRadius: "6px",
		background: "#f0f7ff",
		border: "1px solid #cfe3ff",
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
		fontSize: "13px",
		minHeight: "20px",
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
	},
	statusIdle: { background: "#fafafa", border: "1px solid #e5e5e5", color: "#888" },
	table: { borderCollapse: "collapse", width: "100%", fontSize: "13px" },
	th: { textAlign: "left", borderBottom: "1px solid #e5e5e5", padding: "8px 10px" },
	td: {
		borderBottom: "1px solid #f0f0f0",
		padding: "8px 10px",
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	},
} satisfies Record<string, CSSProperties>;

export function Nav() {
	return (
		<nav style={styles.nav}>
			{ROUTES.map((route) => (
				<Link key={route.href} href={route.href} style={styles.navLink}>
					{route.label}
				</Link>
			))}
		</nav>
	);
}

type SectionProps = {
	title: string;
	hint?: ReactNode;
	children: ReactNode;
};

export function Section({ title, hint, children }: SectionProps) {
	return (
		<section style={styles.section}>
			<h2 style={styles.sectionTitle}>{title}</h2>
			{hint ? <p style={styles.sectionHint}>{hint}</p> : null}
			{children}
		</section>
	);
}

export function Code({ children }: { children: string }) {
	return <pre style={styles.code}>{children}</pre>;
}

export function Status({ message }: { message: string | null }) {
	const style = message ? styles.status : { ...styles.status, ...styles.statusIdle };
	return <div style={style}>{message ?? "No call made yet."}</div>;
}
