"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const view = searchParams.get("view") || "overview";

	const dashboardItems = [
		{ id: "overview", label: "Overview", icon: LayoutDashboard },
		{ id: "realtime", label: "Live Data", icon: Radio },
		{ id: "audience", label: "Audience", icon: Users },
		{ id: "behavior", label: "Behavior", icon: Activity },
		{ id: "retention", label: "Retention", icon: CalendarDays },
		{ id: "technology", label: "Technology", icon: Settings2 },
	];

	return (
		<Sidebar collapsible="icon" className="border-r border-border">
			<SidebarHeader className="border-b border-border">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" className="h-10" asChild>
							<Link href="/">
								<div className="flex size-6 items-center justify-center rounded bg-foreground">
									<Zap className="size-3.5 text-background" />
								</div>
								<div className="flex flex-col leading-none">
									<span className="text-sm font-semibold">Analytics</span>
									<span className="text-[10px] text-muted-foreground">Premium Insights</span>
								</div>
							</Link>
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
										<Link href={`/?view=${item.id}`}>
											<item.icon className="size-3.5" />
											<span>{item.label}</span>
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
								<AvatarImage src="https://github.com/remcostoeten.png" />
								<AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-medium leading-none">
									RS
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col leading-tight ml-1">
								<span className="text-xs font-semibold">Remco Stoeten</span>
								<span className="text-[10px] text-muted-foreground">Admin</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
