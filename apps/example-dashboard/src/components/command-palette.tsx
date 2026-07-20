"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSWRConfig } from "swr";
import { notify } from "@remcostoeten/notifier";
import { noop } from "@/lib/noop";
import {
	BarChart3,
	Users,
	Activity,
	Settings2,
	CalendarDays,
	Route,
	Radio,
	FileText,
	ExternalLink,
	Clock,
	Zap,
	ArrowRight,
	CornerDownLeft,
	SunMoon,
	EyeOff,
	Eye,
	RefreshCw,
	Globe,
	Link2,
	ListFilter,
	CircleCheck,
	Info,
	TriangleAlert,
	CircleAlert,
} from "lucide-react";
import {
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from "@/components/ui/command";

type DashboardView =
	| "overview"
	| "realtime"
	| "retention"
	| "behavior"
	| "technology"
	| "audience"
	| "posthog";

type SignalType = "ok" | "info" | "warn" | "error";

type CommandPaletteProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onViewChange: (view: DashboardView) => void;
	onTimeRangeChange: (range: string) => void;
	onProjectChange: (projectId: string | null) => void;
	onPageSelect: (path: string) => void;
	onReferrerSelect: (domain: string) => void;
	onTypeFilterChange: (type: SignalType | "all") => void;
	onSelfFilterChange: (enabled: boolean) => void;
	selfFilterEnabled: boolean;
	selfFilterAvailable: boolean;
	pages?: { path: string; views: number }[];
	referrers?: { domain: string; visits: number }[];
	projects?: { id: string; eventCount: number }[];
	currentView: DashboardView;
	currentTimeRange: string;
	currentTypeFilter: SignalType | "all";
};

type PaletteRowProps = {
	value: string;
	icon: React.ElementType;
	label: string;
	hint?: string;
	meta?: string;
	active?: boolean;
	onSelect: () => void;
};

function PaletteRow({ value, icon: Icon, label, hint, meta, active, onSelect }: PaletteRowProps) {
	return (
		<CommandItem
			value={value}
			onSelect={onSelect}
			className="group gap-2.5 rounded-md px-2.5 py-2 text-[13px] data-[selected=true]:bg-sidebar-accent data-[selected=true]:text-sidebar-accent-foreground"
		>
			<Icon
				className="h-4 w-4 shrink-0 text-muted-foreground group-data-[selected=true]:text-foreground"
				strokeWidth={1.7}
			/>
			<span className="truncate">{label}</span>
			{hint ? (
				<span className="min-w-0 truncate text-[11px] text-muted-foreground">{hint}</span>
			) : null}
			<span className="ml-auto flex shrink-0 items-center gap-1.5">
				{active ? (
					<span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
						active
					</span>
				) : null}
				{meta ? <span className="text-[11px] text-muted-foreground">{meta}</span> : null}
				<CornerDownLeft className="hidden h-3.5 w-3.5 text-muted-foreground group-data-[selected=true]:block" />
			</span>
		</CommandItem>
	);
}

const GROUP_HEADING =
	"[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground/70";

export function CommandPalette({
	open,
	onOpenChange,
	onViewChange,
	onTimeRangeChange,
	onProjectChange,
	onPageSelect,
	onReferrerSelect,
	onTypeFilterChange,
	onSelfFilterChange,
	selfFilterEnabled,
	selfFilterAvailable,
	pages = [],
	referrers = [],
	projects = [],
	currentView,
	currentTimeRange,
	currentTypeFilter,
}: CommandPaletteProps) {
	const router = useRouter();
	const { resolvedTheme, setTheme } = useTheme();
	const { mutate } = useSWRConfig();

	function runAndClose(fn: () => void) {
		fn();
		onOpenChange(false);
	}

	async function copyDashboardLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			notify.success("Link copied", { description: "Current view and filters included" });
		} catch {
			notify.error("Could not copy link");
		}
	}

	async function refreshData() {
		try {
			await notify.promise(
				mutate(() => true),
				{
					loading: "Refreshing data...",
					success: "Data refreshed",
					error: "Refresh failed",
				},
			);
		} catch {
			noop();
		}
	}

	const views: {
		id: DashboardView;
		label: string;
		icon: React.ElementType;
		description: string;
	}[] = [
		{
			id: "overview",
			label: "Overview",
			icon: BarChart3,
			description: "KPIs, trends, geo, top pages",
		},
		{ id: "realtime", label: "Live", icon: Radio, description: "Active visitors and sessions" },
		{
			id: "retention",
			label: "Retention",
			icon: CalendarDays,
			description: "Cohort and retention heatmap",
		},
		{ id: "behavior", label: "Behavior", icon: Route, description: "Session paths and engagement" },
		{
			id: "technology",
			label: "Technology",
			icon: Settings2,
			description: "Browsers, OS, screen sizes",
		},
		{ id: "audience", label: "Audience", icon: Users, description: "Geo and segmentation" },
		{ id: "posthog", label: "PostHog", icon: Zap, description: "Insights and events from PostHog" },
	];

	const signalTypes: { value: SignalType | "all"; label: string; icon: React.ElementType }[] = [
		{ value: "all", label: "All signals", icon: ListFilter },
		{ value: "ok", label: "OK", icon: CircleCheck },
		{ value: "info", label: "Info", icon: Info },
		{ value: "warn", label: "Warnings", icon: TriangleAlert },
		{ value: "error", label: "Errors", icon: CircleAlert },
	];

	const timeRanges = [
		{ value: "all", label: "All time" },
		{ value: "24h", label: "Last 24 hours" },
		{ value: "7d", label: "Last 7 days" },
		{ value: "30d", label: "Last 30 days" },
		{ value: "60d", label: "Last 60 days" },
		{ value: "90d", label: "Last 90 days" },
		{ value: "180d", label: "Last 180 days" },
	];

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Command Palette"
			description="Search pages, referrers, switch views or change time range"
			showCloseButton={false}
			className="sm:max-w-xl top-[12vh] translate-y-0 gap-0 rounded-xl shadow-2xl shadow-black/40"
		>
			<div className="[&_[data-slot=command-input-wrapper]]:h-auto [&_[data-slot=command-input-wrapper]]:px-3.5 [&_[data-slot=command-input-wrapper]]:py-1 [&_[data-slot=command-input-wrapper]_svg]:h-4 [&_[data-slot=command-input-wrapper]_svg]:w-4">
				<CommandInput placeholder="Search pages, views, actions..." className="h-10 text-[14px]" />
			</div>
			<CommandList className={`max-h-[52vh] py-1.5 ${GROUP_HEADING}`}>
				<CommandEmpty>
					<span className="text-[13px] text-muted-foreground">No results found</span>
				</CommandEmpty>

				<CommandGroup heading="Views" className="px-1.5 pb-1">
					{views.map((view) => (
						<PaletteRow
							key={view.id}
							value={`view ${view.label} ${view.description}`}
							icon={view.icon}
							label={view.label}
							hint={view.description}
							active={currentView === view.id}
							onSelect={() => runAndClose(() => onViewChange(view.id))}
						/>
					))}
				</CommandGroup>

				<CommandGroup heading="Actions" className="px-1.5 pb-1">
					<PaletteRow
						value="action toggle theme dark light mode"
						icon={SunMoon}
						label="Toggle theme"
						hint={resolvedTheme === "dark" ? "Switch to light" : "Switch to dark"}
						onSelect={() =>
							runAndClose(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
						}
					/>
					{selfFilterAvailable ? (
						<PaletteRow
							value="action exclude my visits self filter"
							icon={selfFilterEnabled ? Eye : EyeOff}
							label={selfFilterEnabled ? "Include my visits" : "Exclude my visits"}
							hint="Filter your own traffic out of the data"
							active={selfFilterEnabled}
							onSelect={() => runAndClose(() => onSelfFilterChange(!selfFilterEnabled))}
						/>
					) : null}
					<PaletteRow
						value="action refresh reload data"
						icon={RefreshCw}
						label="Refresh data"
						hint="Refetch all dashboard metrics"
						onSelect={() => runAndClose(() => void refreshData())}
					/>
					<PaletteRow
						value="action copy share dashboard link url"
						icon={Link2}
						label="Copy dashboard link"
						hint="Share the current view and filters"
						onSelect={() => runAndClose(() => void copyDashboardLink())}
					/>
					<PaletteRow
						value="action geo map countries world"
						icon={Globe}
						label="Open geo map"
						hint="Full-screen world map"
						onSelect={() => runAndClose(() => router.push("/geo"))}
					/>
				</CommandGroup>

				<CommandGroup heading="Signals" className="px-1.5 pb-1">
					{signalTypes.map((type) => (
						<PaletteRow
							key={type.value}
							value={`signal filter ${type.label}`}
							icon={type.icon}
							label={type.label}
							active={currentTypeFilter === type.value}
							onSelect={() => runAndClose(() => onTypeFilterChange(type.value))}
						/>
					))}
				</CommandGroup>

				<CommandGroup heading="Time Range" className="px-1.5 pb-1">
					{timeRanges.map((range) => (
						<PaletteRow
							key={range.value}
							value={`time ${range.label} ${range.value}`}
							icon={Clock}
							label={range.label}
							meta={range.value}
							active={currentTimeRange === range.value}
							onSelect={() => runAndClose(() => onTimeRangeChange(range.value))}
						/>
					))}
				</CommandGroup>

				{pages.length > 0 && (
					<CommandGroup heading="Top Pages" className="px-1.5 pb-1">
						{pages.slice(0, 6).map((page) => (
							<PaletteRow
								key={page.path}
								value={`page ${page.path}`}
								icon={FileText}
								label={page.path}
								meta={`${page.views.toLocaleString()} views`}
								onSelect={() => runAndClose(() => onPageSelect(page.path))}
							/>
						))}
					</CommandGroup>
				)}

				{referrers.length > 0 && (
					<CommandGroup heading="Top Referrers" className="px-1.5 pb-1">
						{referrers.slice(0, 5).map((ref) => (
							<PaletteRow
								key={ref.domain}
								value={`referrer ${ref.domain}`}
								icon={ExternalLink}
								label={ref.domain}
								meta={`${ref.visits.toLocaleString()} visits`}
								onSelect={() => runAndClose(() => onReferrerSelect(ref.domain))}
							/>
						))}
					</CommandGroup>
				)}

				{projects.length > 0 && (
					<CommandGroup heading="Projects" className="px-1.5 pb-1">
						<PaletteRow
							value="project all projects"
							icon={Zap}
							label="All Projects"
							onSelect={() => runAndClose(() => onProjectChange(null))}
						/>
						{projects.map((project) => (
							<PaletteRow
								key={project.id}
								value={`project ${project.id}`}
								icon={Activity}
								label={project.id}
								meta={`${project.eventCount.toLocaleString()} events`}
								onSelect={() => runAndClose(() => onProjectChange(project.id))}
							/>
						))}
					</CommandGroup>
				)}
			</CommandList>

			<div className="flex items-center gap-4 border-t border-border px-3.5 py-2 text-[11px] text-muted-foreground">
				<span className="flex items-center gap-1">
					<ArrowRight className="h-3 w-3 rotate-90" />
					<ArrowRight className="h-3 w-3 -rotate-90" />
					navigate
				</span>
				<span className="flex items-center gap-1">
					<CornerDownLeft className="h-3 w-3" />
					select
				</span>
				<span className="ml-auto flex items-center gap-1">
					<kbd className="rounded border border-border bg-muted px-1 text-[10px]">⌘K</kbd>
					command palette
				</span>
			</div>
		</CommandDialog>
	);
}

export function useCommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handler(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		}
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	return { open, setOpen };
}
