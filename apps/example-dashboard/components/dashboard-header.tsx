"use client";

import { Search, Radio, ChevronDown, Filter } from "lucide-react";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { SignalEvent } from "@/lib/types";

type DashboardHeaderProps = {
	isLive?: boolean;
	className?: string;
	onSearchOpen?: () => void;
	activeTab?: string;
	onTabChange?: (tab: string) => void;
	typeFilter?: SignalEvent["type"] | "all";
	onTypeFilterChange?: (type: SignalEvent["type"] | "all") => void;
	timeRange?: string;
	onTimeRangeChange?: (range: string) => void;
	projects?: { id: string; eventCount: number }[];
	selectedProject?: string | null;
	onProjectChange?: (projectId: string | null) => void;
};

export function DashboardHeader({
	isLive = true,
	className,
	onSearchOpen,
	activeTab = "live",
	onTabChange,
	typeFilter = "all",
	onTypeFilterChange,
	timeRange = "24h",
	onTimeRangeChange,
	projects,
	selectedProject,
	onProjectChange,
}: DashboardHeaderProps) {
	return (
		<header
			className={cn(
				"flex items-center justify-between h-10 px-3 border-b border-border bg-card",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<SidebarTrigger className="h-6 w-6" />
				<div className="h-4 w-px bg-border" />
				{isLive && (
					<div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-600 dark:text-emerald-400">
						<Radio className="h-2.5 w-2.5 animate-pulse" />
						<span className="text-[10px] font-medium">Live</span>
					</div>
				)}
				<button
					onClick={onSearchOpen}
					className="flex items-center gap-2 h-6 px-2.5 bg-muted/50 border border-border rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-48 group"
				>
					<Search className="h-3 w-3 shrink-0" />
					<span className="text-[11px] flex-1 text-left">Search...</span>
					<kbd className="hidden sm:flex items-center gap-0.5 text-[9px] font-mono opacity-60 group-hover:opacity-80">
						<span>⌘</span>
						<span>K</span>
					</kbd>
				</button>
				<TypeFilterDropdown value={typeFilter} onChange={onTypeFilterChange} />
			</div>

			<div className="flex items-center gap-1">
				<NavTabs activeTab={activeTab} onTabChange={onTabChange} />
				<div className="h-4 w-px bg-border mx-1" />
				<TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
				<ProjectSelector
					projects={projects}
					selectedProject={selectedProject}
					onProjectChange={onProjectChange}
				/>
				<div className="h-4 w-px bg-border mx-1" />
				<ThemeToggle />
			</div>
		</header>
	);
}

type TypeFilterDropdownProps = {
	value?: SignalEvent["type"] | "all";
	onChange?: (type: SignalEvent["type"] | "all") => void;
};

function TypeFilterDropdown({ value = "all", onChange }: TypeFilterDropdownProps) {
	const types: { value: SignalEvent["type"] | "all"; label: string; color?: string }[] = [
		{ value: "all", label: "All Types" },
		{ value: "ok", label: "OK", color: "text-emerald-600 dark:text-emerald-400" },
		{ value: "info", label: "Info", color: "text-blue-600 dark:text-blue-400" },
		{ value: "warn", label: "Warning", color: "text-amber-600 dark:text-amber-400" },
		{ value: "error", label: "Error", color: "text-red-600 dark:text-red-400" },
	];

	const currentType = types.find((t) => t.value === value);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1">
					<Filter className="h-3 w-3" />
					<span className={currentType?.color}>{currentType?.label}</span>
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-32">
				<DropdownMenuLabel className="text-[10px]">Filter by type</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{types.map((type) => (
					<DropdownMenuItem
						key={type.value}
						onClick={() => onChange?.(type.value)}
						className={cn("text-[11px]", type.color, value === type.value && "bg-muted")}
					>
						{type.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type NavTabsProps = {
	activeTab?: string;
	onTabChange?: (tab: string) => void;
};

function NavTabs({ activeTab = "live", onTabChange }: NavTabsProps) {
	const tabs = [{ id: "live", label: "Live Dashboard" }];

	return (
		<nav className="flex items-center">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					onClick={() => onTabChange?.(tab.id)}
					className={cn(
						"px-2 py-1 text-[11px] font-medium transition-colors rounded",
						activeTab === tab.id
							? "text-foreground bg-muted"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{tab.label}
				</button>
			))}
		</nav>
	);
}

type TimeRangeSelectorProps = {
	value?: string;
	onChange?: (range: string) => void;
};

function TimeRangeSelector({ value = "24h", onChange }: TimeRangeSelectorProps) {
	const ranges = [
		{ value: "1h", label: "Last 1h" },
		{ value: "6h", label: "Last 6h" },
		{ value: "24h", label: "Last 24h" },
		{ value: "7d", label: "Last 7d" },
		{ value: "30d", label: "Last 30d" },
	];

	const currentRange = ranges.find((r) => r.value === value) || ranges[2];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1">
					{currentRange.label}
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-28">
				{ranges.map((range) => (
					<DropdownMenuItem
						key={range.value}
						onClick={() => onChange?.(range.value)}
						className={cn("text-[11px]", value === range.value && "bg-muted")}
					>
						{range.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type ProjectSelectorProps = {
	projects?: { id: string; eventCount: number }[];
	selectedProject?: string | null;
	onProjectChange?: (projectId: string | null) => void;
};

function ProjectSelector({ projects, selectedProject, onProjectChange }: ProjectSelectorProps) {
	const displayName = selectedProject
		? projects?.find((p) => p.id === selectedProject)?.id || selectedProject
		: "All Projects";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-6 px-2 text-[11px] gap-1">
					{displayName}
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel className="text-[10px]">Select Project</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => onProjectChange?.(null)}
					className={cn("text-[11px]", !selectedProject && "bg-muted")}
				>
					<span className="flex-1">All Projects</span>
				</DropdownMenuItem>
				{projects?.map((project) => (
					<DropdownMenuItem
						key={project.id}
						onClick={() => onProjectChange?.(project.id)}
						className={cn(
							"text-[11px] flex justify-between",
							selectedProject === project.id && "bg-muted",
						)}
					>
						<span className="truncate flex-1">{project.id}</span>
						<span className="text-muted-foreground text-[10px] ml-2">
							{project.eventCount.toLocaleString()}
						</span>
					</DropdownMenuItem>
				))}
				{(!projects || projects.length === 0) && (
					<DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
						No projects found
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
