import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Globe, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VisitorInternalToggle } from "@/components/visitor-internal-toggle";
import { cn } from "@/lib/utils";

type Props = {
	params: Promise<{ id: string }>;
};

function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return "Unknown";
	return new Date(value).toLocaleString();
}

function formatDuration(ms: number | null): string {
	if (ms === null || Number.isNaN(ms)) return "—";
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
}

function flattenMetaSection(value: unknown): { key: string; value: string }[] {
	if (!value || typeof value !== "object") return [];
	return Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
		key,
		value: typeof v === "object" ? JSON.stringify(v) : String(v),
	}));
}

async function IdentityHeader({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorProfile } = await import("@/lib/queries");
	const profile = await getVisitorProfile(fingerprint);

	if (!profile) {
		return (
			<div className="bg-card border border-border rounded-sm p-6 text-center text-sm text-muted-foreground">
				Visitor not found.
			</div>
		);
	}

	const { visitor } = profile;

	return (
		<div className="bg-card border border-border rounded-sm p-4 space-y-4">
			<div className="flex items-start justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
						<User className="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h1 className="font-mono text-sm font-medium text-foreground">
							{visitor.fingerprint.slice(0, 12)}
						</h1>
						<p className="text-[11px] text-muted-foreground">
							{visitor.city ? `${visitor.city}, ` : ""}
							{visitor.country || "Unknown location"}
						</p>
					</div>
				</div>
				<VisitorInternalToggle
					fingerprint={visitor.fingerprint}
					initialIsInternal={visitor.isInternal}
				/>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-[11px]">
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">First seen</p>
					<p className="text-foreground">{formatDateTime(visitor.firstSeen)}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Last seen</p>
					<p className="text-foreground">{formatDateTime(visitor.lastSeen)}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Visit count</p>
					<p className="text-foreground tabular-nums">{visitor.visitCount}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Timezone</p>
					<p className="text-foreground">{visitor.timezone || "Unknown"}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Device</p>
					<p className="text-foreground">{visitor.deviceType || "Unknown"}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">OS</p>
					<p className="text-foreground">
						{visitor.os} {visitor.osVersion}
					</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Browser</p>
					<p className="text-foreground">
						{visitor.browser} {visitor.browserVersion}
					</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Language</p>
					<p className="text-foreground">{visitor.language || "Unknown"}</p>
				</div>
			</div>
		</div>
	);
}

async function SessionTimeline({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorSessions } = await import("@/lib/queries");
	const sessions = await getVisitorSessions(fingerprint);

	if (sessions.length === 0) {
		return (
			<div className="bg-card border border-border rounded-sm p-6 text-center text-sm text-muted-foreground">
				No sessions recorded yet.
			</div>
		);
	}

	return (
		<div className="bg-card border border-border rounded-sm">
			<div className="px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">Session timeline</h3>
			</div>
			<div className="divide-y divide-border max-h-[420px] overflow-y-auto">
				{sessions.map((session, i) => (
					<div key={session.sessionId ?? i} className="p-3 space-y-1.5 text-[11px]">
						<div className="flex items-center justify-between gap-2">
							<span className="flex items-center gap-1.5 text-foreground font-medium">
								<Clock className="h-3 w-3 text-muted-foreground" />
								{formatDateTime(session.startedAt)}
							</span>
							<span className="text-muted-foreground tabular-nums">
								{formatDuration(session.durationMs)}
							</span>
						</div>
						<div className="flex items-center gap-1.5 text-muted-foreground">
							<span className="font-mono text-foreground truncate max-w-[140px]">
								{session.entryPath || "/"}
							</span>
							<ArrowLeft className="h-3 w-3 rotate-180 shrink-0" />
							<span className="font-mono text-foreground truncate max-w-[140px]">
								{session.exitPath || session.entryPath || "/"}
							</span>
						</div>
						<div className="flex items-center gap-3 text-muted-foreground">
							<span>{session.pageviews} pageviews</span>
							<span>{session.events} events</span>
							{session.deviceType && <span>{session.deviceType}</span>}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

async function TopPagesAndReferrers({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorProfile } = await import("@/lib/queries");
	const profile = await getVisitorProfile(fingerprint);
	if (!profile) return null;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Top pages</h3>
				</div>
				<div className="divide-y divide-border">
					{profile.topPages.length === 0 && (
						<p className="p-3 text-[11px] text-muted-foreground">No pageviews yet.</p>
					)}
					{profile.topPages.map((page) => (
						<div
							key={page.path}
							className="flex items-center justify-between px-3 py-1.5 text-[11px]"
						>
							<span className="font-mono text-foreground truncate max-w-[220px]">{page.path}</span>
							<span className="text-muted-foreground tabular-nums">{page.count}</span>
						</div>
					))}
				</div>
			</div>
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Referrer history</h3>
				</div>
				<div className="divide-y divide-border">
					{profile.referrers.length === 0 && (
						<p className="p-3 text-[11px] text-muted-foreground">No referrers recorded.</p>
					)}
					{profile.referrers.map((ref) => (
						<div
							key={ref.referrer}
							className="flex items-center justify-between px-3 py-1.5 text-[11px]"
						>
							<span className="flex items-center gap-1.5 text-foreground truncate max-w-[220px]">
								<Globe className="h-3 w-3 text-muted-foreground shrink-0" />
								{ref.referrer}
							</span>
							<span className="text-muted-foreground tabular-nums">{ref.count}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

async function IdentityAndExperiments({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorProfile } = await import("@/lib/queries");
	const profile = await getVisitorProfile(fingerprint);
	if (!profile) return null;

	const meta = (profile.visitor.meta ?? {}) as Record<string, unknown>;
	const identity = flattenMetaSection(meta.identity);
	const experiments = flattenMetaSection(meta.experiments);

	if (identity.length === 0 && experiments.length === 0) return null;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			{identity.length > 0 && (
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border">
						<h3 className="text-xs font-medium text-foreground">Identity</h3>
					</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3 text-[11px]">
						{identity.map((entry) => (
							<div key={entry.key} className="space-y-0.5 min-w-0">
								<p className="text-muted-foreground uppercase tracking-wide text-[10px] truncate">
									{entry.key}
								</p>
								<p className="text-foreground truncate">{entry.value}</p>
							</div>
						))}
					</div>
				</div>
			)}
			{experiments.length > 0 && (
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border">
						<h3 className="text-xs font-medium text-foreground">Experiments</h3>
					</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3 text-[11px]">
						{experiments.map((entry) => (
							<div key={entry.key} className="space-y-0.5 min-w-0">
								<p className="text-muted-foreground uppercase tracking-wide text-[10px] truncate">
									{entry.key}
								</p>
								<p className="text-foreground truncate">{entry.value}</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function HeaderSkeleton() {
	return (
		<div className="bg-card border border-border rounded-sm p-4 space-y-4">
			<div className="flex items-center gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-3 w-24" />
				</div>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		</div>
	);
}

function PanelSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("bg-card border border-border rounded-sm p-4 space-y-2", className)}>
			<Skeleton className="h-4 w-32" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
		</div>
	);
}

export default function VisitorProfilePage({ params }: Props) {
	return (
		<div className="max-w-5xl mx-auto p-4 space-y-3">
			<Link
				href="/"
				className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-3 w-3" />
				Back to dashboard
			</Link>

			<Suspense fallback={<HeaderSkeleton />}>
				<IdentityHeader params={params} />
			</Suspense>

			<Suspense fallback={<PanelSkeleton />}>
				<SessionTimeline params={params} />
			</Suspense>

			<Suspense
				fallback={
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<PanelSkeleton />
						<PanelSkeleton />
					</div>
				}
			>
				<TopPagesAndReferrers params={params} />
			</Suspense>

			<Suspense fallback={null}>
				<IdentityAndExperiments params={params} />
			</Suspense>
		</div>
	);
}
