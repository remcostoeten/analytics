"use client";

import type { Route } from "next";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
	LayoutDashboard,
	Activity,
	Users,
	Zap,
	Radio,
	CalendarDays,
	Settings2,
	Search,
	ChevronDown,
	Globe,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ProjectOption = {
	id: string;
	eventCount: number;
};

type OriginOption = {
	host: string;
	eventCount: number;
};

async function fetchProjects(url: string): Promise<ProjectOption[]> {
	const response = await fetch(url);
	if (!response.ok) return [];
	return response.json();
}

async function fetchOrigins(url: string): Promise<OriginOption[]> {
	const response = await fetch(url);
	if (!response.ok) return [];
	return response.json();
}

export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const view = searchParams.get("view") || "overview";
	const selectedProject = searchParams.get("projectId");
	const selectedOrigin = searchParams.get("origin");
	const timeRange = searchParams.get("timeRange") || "30d";
	const fromParam = searchParams.get("from");
	const toParam = searchParams.get("to");
	const isCustomRange = !!(fromParam && toParam);

	const [showCustomPicker, setShowCustomPicker] = useState(false);
	const [customFromInput, setCustomFromInput] = useState(fromParam || "");
	const [customToInput, setCustomToInput] = useState(toParam || "");

	const { data: projects = [] } = useSWR("/api/analytics?metric=projects", fetchProjects, {
		fallbackData: [],
		refreshInterval: 60000,
	});

	const originsUrl = selectedProject
		? `/api/analytics?metric=origins&projectId=${selectedProject}`
		: "/api/analytics?metric=origins";
	const { data: origins = [] } = useSWR(originsUrl, fetchOrigins, {
		fallbackData: [],
		refreshInterval: 60000,
	});

	const dashboardItems = [
		{ id: "overview", label: "Overview", icon: LayoutDashboard },
		{ id: "realtime", label: "Live Data", icon: Radio },
		{ id: "audience", label: "Audience", icon: Users },
		{ id: "behavior", label: "Behavior", icon: Activity },
		{ id: "retention", label: "Retention", icon: CalendarDays },
		{ id: "technology", label: "Technology", icon: Settings2 },
	];

	function buildHref(path: string, params: URLSearchParams): Route {
		const query = params.toString();
		return (query ? `${path}?${query}` : path) as Route;
	}

	function setSelectedProject(projectId: string | null) {
		const params = new URLSearchParams(searchParams.toString());
		if (projectId) {
			params.set("projectId", projectId);
		} else {
			params.delete("projectId");
		}
		router.push(buildHref(pathname || "/", params));
	}

	function setSelectedOrigin(origin: string | null) {
		const params = new URLSearchParams(searchParams.toString());
		if (origin) {
			params.set("origin", origin);
		} else {
			params.delete("origin");
		}
		router.push(buildHref(pathname || "/", params));
	}

	function setTimeRange(range: string) {
		if (range === "custom") {
			setCustomFromInput(fromParam || "");
			setCustomToInput(toParam || "");
			setShowCustomPicker(true);
			return;
		}
		const params = new URLSearchParams(searchParams.toString());
		params.delete("from");
		params.delete("to");
		if (range === "30d") {
			params.delete("timeRange");
		} else {
			params.set("timeRange", range);
		}
		router.push(buildHref(pathname || "/", params));
	}

	function applyCustomRange() {
		if (!customFromInput || !customToInput) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set("from", customFromInput);
		params.set("to", customToInput);
		params.delete("timeRange");
		router.push(buildHref(pathname || "/", params));
		setShowCustomPicker(false);
	}

	function viewHref(id: string): Route {
		const params = new URLSearchParams(searchParams.toString());
		if (id === "overview") {
			params.delete("view");
		} else {
			params.set("view", id);
		}
		return buildHref(pathname || "/", params);
	}

	function openSearch() {
		window.dispatchEvent(new Event("open-command-palette"));
	}

	return (
		<>
			<Sidebar collapsible="icon" className="border-r border-border">
				<SidebarHeader className="border-b border-border">
					<SidebarMenu>
						<SidebarMenuItem>
							<ProjectSwitcher
								projects={projects}
								selectedProject={selectedProject}
								onProjectChange={setSelectedProject}
							/>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<OriginSwitcher
								origins={origins}
								selectedOrigin={selectedOrigin}
								onOriginChange={setSelectedOrigin}
							/>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<TimeRangeSwitcher
								value={isCustomRange ? "custom" : timeRange}
								customFrom={fromParam || undefined}
								customTo={toParam || undefined}
								onChange={setTimeRange}
							/>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								size="lg"
								className="h-9 text-xs font-medium"
								tooltip="Search"
								onClick={openSearch}
							>
								<Search className="size-3.5" />
								<span className="flex-1 text-left">Search</span>
								<kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground group-data-[collapsible=icon]:hidden">
									⌘K
								</kbd>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarContent className="px-2">
					<SidebarGroup className="py-2">
						<SidebarGroupLabel className="text-[10px] px-2 uppercase tracking-wider font-semibold opacity-50">
							Insights
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{dashboardItems.map((item) => (
									<SidebarMenuItem key={item.id}>
										<SidebarMenuButton
											asChild
											isActive={pathname === "/" && view === item.id}
											tooltip={item.label}
											className="h-8 text-xs font-medium"
										>
											<Link href={viewHref(item.id)}>
												<item.icon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
												<span className="text-foreground">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={pathname === "/geo"}
										tooltip="Geo Explorer"
										className="h-8 text-xs font-medium"
									>
										<Link href="/geo">
											<Globe className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
											<span className="text-foreground">Geo Explorer</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>

					<SidebarGroup className="py-2">
						<SidebarGroupLabel className="text-[10px] px-2 uppercase tracking-wider font-semibold opacity-50">
							Integrations
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={pathname === "/" && view === "posthog"}
										tooltip="PostHog"
										className="h-9 text-xs font-semibold data-[active=true]:bg-[#f9bd2b]/10 data-[active=true]:text-[#f9bd2b]"
									>
										<Link href={viewHref("posthog")}>
											<span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#f9bd2b]/15">
												<Zap className="size-3 text-[#f9bd2b]" />
											</span>
											<span className="text-foreground">PostHog</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>

			<Dialog open={showCustomPicker} onOpenChange={setShowCustomPicker}>
				<DialogContent className="sm:max-w-xs">
					<DialogHeader>
						<DialogTitle className="text-sm">Custom Date Range</DialogTitle>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-1">
							<label className="text-[11px] text-muted-foreground">From</label>
							<Input
								type="date"
								value={customFromInput}
								onChange={(e) => setCustomFromInput(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-[11px] text-muted-foreground">To</label>
							<Input
								type="date"
								value={customToInput}
								max={new Date().toISOString().split("T")[0]}
								onChange={(e) => setCustomToInput(e.target.value)}
								className="h-8 text-xs"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							size="sm"
							variant="outline"
							className="text-xs h-7"
							onClick={() => setShowCustomPicker(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							className="text-xs h-7"
							disabled={!customFromInput || !customToInput || customFromInput >= customToInput}
							onClick={applyCustomRange}
						>
							Apply
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

type TimeRangeProps = {
	value: string;
	onChange: (range: string) => void;
	customFrom?: string;
	customTo?: string;
};

function TimeRangeSwitcher({ value, customFrom, customTo, onChange }: TimeRangeProps) {
	const ranges = [
		{ value: "all", label: "All time" },
		{ value: "24h", label: "Last 24 hours" },
		{ value: "7d", label: "Last 7 days" },
		{ value: "30d", label: "Last 30 days" },
		{ value: "60d", label: "Last 60 days" },
		{ value: "90d", label: "Last 90 days" },
		{ value: "180d", label: "Last 180 days" },
	];

	const displayLabel =
		value === "custom" && customFrom && customTo
			? `${customFrom} → ${customTo}`
			: (ranges.find((r) => r.value === value) || ranges[1]).label;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-9 w-full justify-start gap-2 px-2 text-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
				>
					<div className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-transparent">
						<CalendarDays className="size-3.5 text-muted-foreground" />
					</div>
					<div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
						<div className="truncate text-xs font-medium leading-tight">{displayLabel}</div>
						<div className="text-[10px] text-muted-foreground leading-tight">Date range</div>
					</div>
					<ChevronDown className="size-3 text-muted-foreground group-data-[collapsible=icon]:hidden" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="right" className="w-44">
				<DropdownMenuLabel className="text-[10px]">Date range</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{ranges.map((range) => (
					<DropdownMenuItem
						key={range.value}
						onClick={() => onChange(range.value)}
						className={cn("text-[11px]", value === range.value && "bg-muted")}
					>
						{range.label}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => onChange("custom")}
					className={cn("text-[11px]", value === "custom" && "bg-muted")}
				>
					Custom range…
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type ProjectSwitcherProps = {
	projects: ProjectOption[];
	selectedProject: string | null;
	onProjectChange: (projectId: string | null) => void;
};

function ProjectSwitcher({ projects, selectedProject, onProjectChange }: ProjectSwitcherProps) {
	const displayName = selectedProject
		? projects.find((project) => project.id === selectedProject)?.id || selectedProject
		: "All Projects";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-10 w-full justify-start gap-2 px-2 text-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
				>
					<div className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-transparent">
						<Zap className="size-3.5 text-muted-foreground" />
					</div>
					<div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
						<div className="truncate text-xs font-semibold leading-tight">{displayName}</div>
						<div className="text-[10px] text-muted-foreground leading-tight">Project scope</div>
					</div>
					<ChevronDown className="size-3 text-muted-foreground group-data-[collapsible=icon]:hidden" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="right" className="w-56">
				<DropdownMenuLabel className="text-[10px]">Project scope</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => onProjectChange(null)}
					className={cn("text-[11px]", !selectedProject && "bg-muted")}
				>
					<span className="flex-1">All Projects</span>
				</DropdownMenuItem>
				{projects.map((project) => (
					<DropdownMenuItem
						key={project.id}
						onClick={() => onProjectChange(project.id)}
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
				{projects.length === 0 && (
					<DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
						No projects found
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type OriginSwitcherProps = {
	origins: OriginOption[];
	selectedOrigin: string | null;
	onOriginChange: (origin: string | null) => void;
};

function OriginSwitcher({ origins, selectedOrigin, onOriginChange }: OriginSwitcherProps) {
	const displayName = selectedOrigin || "All Origins";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="h-10 w-full justify-start gap-2 px-2 text-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
				>
					<div className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-transparent">
						{selectedOrigin ? (
							<img
								src={`https://www.google.com/s2/favicons?domain=${selectedOrigin}&sz=16`}
								alt=""
								className="size-3.5"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
								}}
							/>
						) : (
							<Globe className="size-3.5 text-muted-foreground" />
						)}
					</div>
					<div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
						<div className="truncate text-xs font-semibold leading-tight">{displayName}</div>
						<div className="text-[10px] text-muted-foreground leading-tight">Origin</div>
					</div>
					<ChevronDown className="size-3 text-muted-foreground group-data-[collapsible=icon]:hidden" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="right" className="w-56">
				<DropdownMenuLabel className="text-[10px]">Origin</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => onOriginChange(null)}
					className={cn("text-[11px]", !selectedOrigin && "bg-muted")}
				>
					<span className="flex-1">All Origins</span>
				</DropdownMenuItem>
				{origins.map((origin) => (
					<DropdownMenuItem
						key={origin.host}
						onClick={() => onOriginChange(origin.host)}
						className={cn(
							"text-[11px] flex items-center gap-2",
							selectedOrigin === origin.host && "bg-muted",
						)}
					>
						<img
							src={`https://www.google.com/s2/favicons?domain=${origin.host}&sz=16`}
							alt=""
							className="size-3.5 shrink-0"
							onError={(e) => {
								(e.target as HTMLImageElement).style.display = "none";
							}}
						/>
						<span className="truncate flex-1">{origin.host}</span>
						<span className="text-muted-foreground text-[10px]">
							{origin.eventCount.toLocaleString()}
						</span>
					</DropdownMenuItem>
				))}
				{origins.length === 0 && (
					<DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
						No origins found
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
