"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, CircleDot } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem, SignalEvent } from "@/lib/types";

type DashboardHeaderProps = {
	title: string;
	breadcrumbs?: BreadcrumbItem[];
	liveVisitors?: number | null;
	className?: string;
	typeFilter?: SignalEvent["type"] | "all";
	onTypeFilterChange?: (type: SignalEvent["type"] | "all") => void;
	authUser?: string | null;
	authEnabled?: boolean;
};

export function DashboardHeader({
	title,
	breadcrumbs = [],
	liveVisitors,
	className,
	typeFilter = "all",
	onTypeFilterChange,
	authUser,
	authEnabled = false,
}: DashboardHeaderProps) {
	return (
		<header
			className={cn(
				"sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60",
				className,
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<SidebarTrigger className="h-7 w-7 -ml-1" />
				<div className="h-4 w-px bg-border" />
				<nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs">
					{breadcrumbs.map((item, i) => (
						<span key={i} className="flex items-center gap-1 text-muted-foreground">
							{i > 0 && <ChevronRight className="h-3 w-3" />}
							{item.href ? (
								<Link href={item.href} className="transition-colors hover:text-foreground">
									{item.label}
								</Link>
							) : (
								<span>{item.label}</span>
							)}
						</span>
					))}
					{breadcrumbs.length > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
					<h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
				</nav>
			</div>

			<div className="flex items-center gap-1.5">
				<LivePill count={liveVisitors} />
				<TypeFilterDropdown value={typeFilter} onChange={onTypeFilterChange} />
				<AuthUser login={authUser} authEnabled={authEnabled} />
			</div>
		</header>
	);
}

type LivePillProps = {
	count?: number | null;
};

function LivePill({ count }: LivePillProps) {
	if (count === null || count === undefined) return null;

	const active = count > 0;

	return (
		<span
			title="Active visitors in the last 5 minutes"
			className="mr-1 hidden items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground sm:inline-flex"
		>
			<span className="relative flex h-1.5 w-1.5">
				{active && (
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
				)}
				<span
					className={cn(
						"relative inline-flex h-1.5 w-1.5 rounded-full",
						active ? "bg-emerald-500" : "bg-muted-foreground/40",
					)}
				/>
			</span>
			<span className="font-medium text-foreground">{count}</span> live
		</span>
	);
}

type AuthUserProps = {
	login?: string | null;
	authEnabled?: boolean;
};

function AuthUser({ login, authEnabled }: AuthUserProps) {
	if (!login) {
		if (!authEnabled) return null;

		return (
			<Button variant="outline" size="sm" asChild className="h-7 px-2.5 text-xs">
				<a href="/api/auth/login">Admin sign in</a>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
					{login}
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				<DropdownMenuLabel className="text-[11px]">Signed in as {login}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild className="text-xs">
					<a href="/api/auth/logout">Sign out</a>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type TypeFilterDropdownProps = {
	value?: SignalEvent["type"] | "all";
	onChange?: (type: SignalEvent["type"] | "all") => void;
};

function TypeFilterDropdown({ value = "all", onChange }: TypeFilterDropdownProps) {
	const types: { value: SignalEvent["type"] | "all"; label: string; color?: string }[] = [
		{ value: "all", label: "All events" },
		{ value: "ok", label: "Healthy", color: "text-emerald-600 dark:text-emerald-400" },
		{ value: "info", label: "Info", color: "text-blue-600 dark:text-blue-400" },
		{ value: "warn", label: "Warnings", color: "text-amber-600 dark:text-amber-400" },
		{ value: "error", label: "Errors", color: "text-red-600 dark:text-red-400" },
	];

	const currentType = types.find((t) => t.value === value);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
					<CircleDot className={cn("h-3 w-3", currentType?.color ?? "text-muted-foreground")} />
					<span className={cn("hidden sm:inline", currentType?.color)}>{currentType?.label}</span>
					<ChevronDown className="h-3 w-3 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				<DropdownMenuLabel className="text-[11px]">Event status</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{types.map((type) => (
					<DropdownMenuItem
						key={type.value}
						onClick={() => onChange?.(type.value)}
						className={cn("text-xs", type.color, value === type.value && "bg-muted")}
					>
						{type.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
