"use client";

import { useState, useMemo } from "react";
import {
	Radio,
	Globe,
	Server,
	Clock,
	Hash,
	ExternalLink,
	ChevronDown,
	ChevronUp,
	Inbox,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SignalEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatTimeAgo(timestamp: Date | string): string {
	const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 5) return "just now";
	if (seconds < 60) return `${seconds}s ago`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

function stringMeta(value: unknown): string | null {
	if (typeof value === "string" && value.length > 0) return value;
	if (typeof value === "number") return String(value);
	return null;
}

function numberMeta(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

// Dark mode compatible badge styles
const badgeStyles: Record<SignalEvent["type"], string> = {
	ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
	info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
	warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
	error: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const badgeLabels: Record<SignalEvent["type"], string> = {
	ok: "OK",
	info: "INFO",
	warn: "WARN",
	error: "ERR",
};

interface SignalItemProps {
	signal: SignalEvent;
	isNew?: boolean;
	isExpanded?: boolean;
	onToggle?: () => void;
}

function SignalItem({ signal, isNew, isExpanded, onToggle }: SignalItemProps) {
	const timeAgo = formatTimeAgo(signal.timestamp);
	const metadata = signal.metadata || {};
	const endpoint = stringMeta(metadata.endpoint);
	const requestId = stringMeta(metadata.requestId);
	const method = stringMeta(metadata.method);
	const statusCode = numberMeta(metadata.statusCode);
	const duration = numberMeta(metadata.duration);
	const region = stringMeta(metadata.region);
	const userAgent = stringMeta(metadata.userAgent);
	const hasDetails = Object.keys(metadata).length > 0;

	return (
		<div
			className={cn(
				"transition-colors hover:bg-muted/50",
				isNew && "bg-muted/30",
				isExpanded && "bg-muted/40",
			)}
		>
			<div
				className={cn("flex items-start gap-2 px-3 py-2", hasDetails && "cursor-pointer")}
				onClick={onToggle}
			>
				<span
					className={cn(
						"inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-semibold rounded border shrink-0 mt-0.5",
						badgeStyles[signal.type],
					)}
				>
					{badgeLabels[signal.type]}
				</span>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-1.5">
						<p className="text-[11px] font-medium text-foreground leading-tight">
							{signal.category}
						</p>
						{endpoint && (
							<code className="text-[9px] px-1 py-0.5 bg-muted rounded text-muted-foreground font-mono">
								{endpoint}
							</code>
						)}
					</div>
					<p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{signal.message}</p>
					{requestId && (
						<div className="flex items-center gap-1 mt-1">
							<Hash className="h-2.5 w-2.5 text-muted-foreground/70" />
							<span className="text-[9px] text-muted-foreground/70 font-mono">
								{requestId.slice(0, 12)}...
							</span>
						</div>
					)}
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<span className="text-[10px] text-muted-foreground">{timeAgo}</span>
					{hasDetails &&
						(isExpanded ? (
							<ChevronUp className="h-3 w-3 text-muted-foreground" />
						) : (
							<ChevronDown className="h-3 w-3 text-muted-foreground" />
						))}
				</div>
			</div>

			{/* Expanded details panel */}
			{isExpanded && hasDetails && (
				<div className="px-3 pb-2 pt-0 ml-7">
					<div className="bg-muted/50 rounded-sm p-2 space-y-1.5 text-[10px]">
						{endpoint && (
							<div className="flex items-center gap-2">
								<Server className="h-3 w-3 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">Endpoint:</span>
								<code className="text-foreground font-mono bg-background/50 px-1 rounded">
									{endpoint}
								</code>
							</div>
						)}
						{method && (
							<div className="flex items-center gap-2">
								<ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">Method:</span>
								<span
									className={cn(
										"font-mono font-medium",
										method === "GET" && "text-emerald-600 dark:text-emerald-400",
										method === "POST" && "text-blue-600 dark:text-blue-400",
										method === "PUT" && "text-amber-600 dark:text-amber-400",
										method === "DELETE" && "text-red-600 dark:text-red-400",
									)}
								>
									{method}
								</span>
							</div>
						)}
						{statusCode && (
							<div className="flex items-center gap-2">
								<Hash className="h-3 w-3 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">Status:</span>
								<span
									className={cn(
										"font-mono font-medium",
										statusCode < 300 && "text-emerald-600 dark:text-emerald-400",
										statusCode >= 300 && statusCode < 400 && "text-blue-600 dark:text-blue-400",
										statusCode >= 400 && statusCode < 500 && "text-amber-600 dark:text-amber-400",
										statusCode >= 500 && "text-red-600 dark:text-red-400",
									)}
								>
									{statusCode}
								</span>
							</div>
						)}
						{duration && (
							<div className="flex items-center gap-2">
								<Clock className="h-3 w-3 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">Duration:</span>
								<span className="text-foreground font-mono">{duration}ms</span>
							</div>
						)}
						{region && (
							<div className="flex items-center gap-2">
								<Globe className="h-3 w-3 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">Region:</span>
								<span className="text-foreground">{region}</span>
							</div>
						)}
						{requestId && (
							<div className="flex items-center gap-2">
								<Hash className="h-3 w-3 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">Request ID:</span>
								<code className="text-foreground font-mono text-[9px] bg-background/50 px-1 rounded">
									{requestId}
								</code>
							</div>
						)}
						{userAgent && (
							<div className="flex items-start gap-2">
								<span className="text-muted-foreground shrink-0">UA:</span>
								<span className="text-foreground/70 text-[9px] break-all">
									{userAgent.slice(0, 80)}...
								</span>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

interface SignalStreamProps {
	signals: SignalEvent[];
	isStreaming?: boolean;
	filter?: string;
	typeFilter?: SignalEvent["type"] | "all";
	onSignalClick?: (signal: SignalEvent) => void;
	className?: string;
}

export function SignalStream({
	signals,
	isStreaming = false,
	filter = "",
	typeFilter = "all",
	onSignalClick,
	className,
}: SignalStreamProps) {
	const [expandedId, setExpandedId] = useState<string | number | null>(null);

	// Filter signals based on search and type filter
	const filteredSignals = useMemo(() => {
		return signals.filter((signal) => {
			// Type filter
			if (typeFilter !== "all" && signal.type !== typeFilter) return false;

			// Text filter
			if (filter) {
				const searchLower = filter.toLowerCase();
				const matchesCategory = signal.category.toLowerCase().includes(searchLower);
				const matchesMessage = signal.message.toLowerCase().includes(searchLower);
				const matchesEndpoint = signal.metadata?.endpoint
					?.toString()
					.toLowerCase()
					.includes(searchLower);
				const matchesType = signal.type.toLowerCase().includes(searchLower);

				if (!matchesCategory && !matchesMessage && !matchesEndpoint && !matchesType) {
					return false;
				}
			}

			return true;
		});
	}, [signals, filter, typeFilter]);

	return (
		<div className={cn("flex flex-col h-full bg-card border border-border rounded-sm", className)}>
			<div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
				<div className="flex items-center gap-2">
					<h3 className="text-xs font-medium text-foreground">Live signal stream</h3>
					<span className="text-[10px] text-muted-foreground tabular-nums">
						({filteredSignals.length})
					</span>
				</div>
				{isStreaming && (
					<div className="flex items-center gap-1">
						<Radio className="h-3 w-3 text-emerald-500 dark:text-emerald-400 animate-pulse" />
						<span className="text-[10px] text-muted-foreground">Streaming</span>
					</div>
				)}
			</div>
			<ScrollArea className="flex-1 min-h-0">
				<div className="divide-y divide-border">
					{signals.length === 0 ? (
						<div className="px-3 py-12 text-center">
							<Inbox className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
							<p className="text-[11px] font-medium text-muted-foreground">No signals yet</p>
							<p className="text-[10px] text-muted-foreground/70 mt-1">
								Signals will appear here when your endpoints receive traffic
							</p>
						</div>
					) : filteredSignals.length === 0 ? (
						<div className="px-3 py-8 text-center">
							<p className="text-[11px] text-muted-foreground">No signals match your filter</p>
						</div>
					) : (
						filteredSignals.map((signal, index) => (
							<SignalItem
								key={signal.id}
								signal={signal}
								isNew={index === 0}
								isExpanded={expandedId === signal.id}
								onToggle={() => {
									setExpandedId(expandedId === signal.id ? null : signal.id);
									onSignalClick?.(signal);
								}}
							/>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
