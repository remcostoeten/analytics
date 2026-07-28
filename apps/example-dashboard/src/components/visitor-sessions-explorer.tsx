"use client";

import { cn } from "@/lib/utils";
import { formatDuration, getFlagEmoji } from "@/lib/format";
import { ChevronRight, Clock, CornerDownRight, Globe, MousePointerClick, Zap } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

export type ExplorerSession = {
	sessionId: string | null;
	startedAt: string;
	endedAt: string;
	durationMs: number | null;
	entryPath: string | null;
	exitPath: string | null;
	referrer: string | null;
	pageviews: number;
	events: number;
	country: string | null;
	deviceType: string | null;
};

type TrailStep = {
	ts: string;
	kind: "pageview" | "event";
	path: string | null;
	name: string | null;
	dwellMs: number | null;
	scrollDepth: number | null;
	referrer: string | null;
};

type Props = {
	fingerprint: string;
	sessions: ExplorerSession[];
};

async function fetcher(url: string): Promise<{ steps: TrailStep[] }> {
	const response = await fetch(url);
	if (!response.ok) throw new Error("Failed to load session trail");
	return response.json();
}

function formatDateTime(value: string): string {
	return new Date(value).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatClock(value: string): string {
	return new Date(value).toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function gapLabel(prevEndedAt: string, startedAt: string): string | null {
	const gap = new Date(prevEndedAt).getTime() - new Date(startedAt).getTime();
	if (gap < 60_000) return null;
	return `${formatDuration(gap)} earlier`;
}

function SessionTrail({ fingerprint, sessionId }: { fingerprint: string; sessionId: string }) {
	const { data, isLoading, error } = useSWR(
		`/api/analytics?metric=visitor-session-trail&fingerprint=${encodeURIComponent(fingerprint)}&sessionId=${encodeURIComponent(sessionId)}`,
		fetcher,
	);

	if (isLoading) {
		return <p className="px-8 pb-3 text-[10px] text-muted-foreground">Loading trail…</p>;
	}
	if (error || !data) {
		return <p className="px-8 pb-3 text-[10px] text-muted-foreground">Could not load trail.</p>;
	}
	if (data.steps.length === 0) {
		return (
			<p className="px-8 pb-3 text-[10px] text-muted-foreground">No events in this session.</p>
		);
	}

	return (
		<div className="px-8 pb-3 space-y-0.5">
			{data.steps.map((step, i) => (
				<div key={`${step.ts}-${i}`} className="flex items-center gap-2 text-[10px] leading-5">
					<span className="text-muted-foreground tabular-nums w-14 shrink-0">
						{formatClock(step.ts)}
					</span>
					{step.kind === "pageview" ? (
						<>
							<CornerDownRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
							<span className="font-mono text-foreground truncate">{step.path || "/"}</span>
							<span className="text-muted-foreground shrink-0 ml-auto flex items-center gap-2 tabular-nums">
								{step.dwellMs !== null && (
									<span title="Time on page">{formatDuration(step.dwellMs)}</span>
								)}
								{step.scrollDepth !== null && (
									<span title="Max scroll depth">{step.scrollDepth}% scrolled</span>
								)}
							</span>
						</>
					) : (
						<>
							<Zap className="h-3 w-3 text-amber-500 shrink-0" />
							<span className="text-foreground truncate">{step.name}</span>
							{step.path && (
								<span className="font-mono text-muted-foreground truncate">on {step.path}</span>
							)}
						</>
					)}
				</div>
			))}
		</div>
	);
}

export function VisitorSessionsExplorer({ fingerprint, sessions }: Props) {
	const [expanded, setExpanded] = useState<string | null>(null);

	if (sessions.length === 0) {
		return (
			<div className="bg-card border border-border rounded-sm p-6 text-center text-sm text-muted-foreground">
				No sessions recorded yet.
			</div>
		);
	}

	return (
		<div className="bg-card border border-border rounded-sm">
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground">Session timeline</h3>
				<span className="text-[10px] text-muted-foreground">
					{sessions.length} session{sessions.length === 1 ? "" : "s"} · click to expand
				</span>
			</div>
			<div className="divide-y divide-border max-h-[520px] overflow-y-auto">
				{sessions.map((session, i) => {
					const key = session.sessionId ?? `s-${i}`;
					const isOpen = expanded === key;
					const previous = sessions[i + 1];
					const gap = previous ? gapLabel(session.startedAt, previous.endedAt) : null;

					return (
						<div key={key}>
							<button
								onClick={() => setExpanded(isOpen ? null : key)}
								disabled={!session.sessionId}
								className={cn(
									"w-full text-left p-3 space-y-1.5 text-[11px] transition-colors",
									session.sessionId && "hover:bg-muted/40 cursor-pointer",
									isOpen && "bg-muted/30",
								)}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="flex items-center gap-1.5 text-foreground font-medium">
										<ChevronRight
											className={cn(
												"h-3 w-3 text-muted-foreground transition-transform",
												isOpen && "rotate-90",
											)}
										/>
										<Clock className="h-3 w-3 text-muted-foreground" />
										{formatDateTime(session.startedAt)}
										{gap && (
											<span className="text-muted-foreground font-normal">
												· {gap} after previous
											</span>
										)}
									</span>
									<span className="text-muted-foreground tabular-nums">
										{formatDuration(session.durationMs)}
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground pl-[18px]">
									<span className="font-mono text-foreground truncate max-w-[160px]">
										{session.entryPath || "/"}
									</span>
									{session.exitPath && session.exitPath !== session.entryPath && (
										<>
											<ChevronRight className="h-3 w-3 shrink-0" />
											<span className="font-mono text-foreground truncate max-w-[160px]">
												{session.exitPath}
											</span>
										</>
									)}
								</div>
								<div className="flex items-center gap-3 text-muted-foreground pl-[18px]">
									<span className="flex items-center gap-1">
										<MousePointerClick className="h-3 w-3" />
										{session.pageviews} pageviews
									</span>
									<span>{session.events} events</span>
									{session.deviceType && <span>{session.deviceType}</span>}
									{session.country && (
										<span className="flex items-center gap-1">
											{getFlagEmoji(session.country) || <Globe className="h-3 w-3" />}
											{session.country}
										</span>
									)}
									{session.referrer && (
										<span className="truncate max-w-[180px]" title={session.referrer}>
											via {session.referrer}
										</span>
									)}
								</div>
							</button>
							{isOpen && session.sessionId && (
								<SessionTrail fingerprint={fingerprint} sessionId={session.sessionId} />
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
