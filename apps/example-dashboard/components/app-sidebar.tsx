"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
	LayoutDashboard,
	Activity,
	Users,
	Settings,
	Zap,
	Radio,
	Server,
	CalendarDays,
	Settings2,
	Search,
	ChevronDown,
} from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ProjectOption = {
	id: string;
	eventCount: number;
};

async function fetchProjects(url: string): Promise<ProjectOption[]> {
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
	const timeRange = searchParams.get("timeRange") || "30d";
	const { data: projects = [] } = useSWR("/api/analytics?metric=projects", fetchProjects, {
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

	function setSelectedProject(projectId: string | null) {
		const params = new URLSearchParams(searchParams.toString());
		if (projectId) {
			params.set("projectId", projectId);
		} else {
			params.delete("projectId");
		}
		router.push(`/?${params.toString()}`);
	}

	function setTimeRange(range: string) {
		const params = new URLSearchParams(searchParams.toString());
		if (range === "30d") {
			params.delete("timeRange");
		} else {
			params.set("timeRange", range);
		}
		router.push(`/?${params.toString()}`);
	}

	function viewHref(id: string) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("view", id);
		return `/?${params.toString()}`;
	}

	function openSearch() {
		window.dispatchEvent(new Event("open-command-palette"));
	}

	return (
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
						<TimeRangeSwitcher value={timeRange} onChange={setTimeRange} />
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
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="py-2 mt-auto">
					<SidebarGroupLabel className="text-[10px] px-2 uppercase tracking-wider font-semibold opacity-50">
						System
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									asChild
									tooltip="Service Health"
									className="h-8 text-xs font-medium"
								>
									<Link href="/health">
										<Server className="size-3.5" />
										<span>Health</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild tooltip="Settings" className="h-8 text-xs font-medium">
									<Link href="/settings">
										<Settings className="size-3.5" />
										<span>Settings</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-border p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" className="h-10 hover:bg-muted/50 transition-colors">
							<Avatar className="size-6 border border-border">
								<AvatarImage src="" />
								<AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium leading-none">
									JD
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col leading-tight ml-1">
								<span className="text-xs font-semibold">John Doe</span>
								<span className="text-[10px] text-muted-foreground">Admin</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

type TimeRangeProps = {
	value: string;
	onChange: (range: string) => void;
};

function TimeRangeSwitcher({ value, onChange }: TimeRangeProps) {
	const ranges = [
		{ value: "all", label: "All time" },
		{ value: "30d", label: "Last 30 days" },
		{ value: "60d", label: "Last 60 days" },
		{ value: "90d", label: "Last 90 days" },
		{ value: "180d", label: "Last 180 days" },
	];
	const currentRange = ranges.find((range) => range.value === value) || ranges[1];

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
						<div className="truncate text-xs font-medium leading-tight">{currentRange.label}</div>
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
						className={cn("text-[11px]", currentRange.value === range.value && "bg-muted")}
					>
						{range.label}
					</DropdownMenuItem>
				))}
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
