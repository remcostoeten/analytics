"use client";

import { cn } from "@/lib/utils";
import { Inbox, Monitor, Globe, Wifi, Languages, Maximize2 } from "lucide-react";
import { useState } from "react";

interface TechItem {
	name: string;
	version?: string;
	count: number;
	percentage: number;
}

interface TechnologyBreakdownProps {
	browsers?: TechItem[];
	operatingSystems?: TechItem[];
	languages?: TechItem[];
	screenSizes?: TechItem[];
	connectionTypes?: TechItem[];
	className?: string;
}

// Browser icons/colors
const browserColors: Record<string, string> = {
	Chrome: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
	Safari: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	Firefox: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
	Edge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
	Opera: "bg-red-500/15 text-red-600 dark:text-red-400",
};

// OS icons/colors
const osColors: Record<string, string> = {
	"Mac OS": "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
	macOS: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
	Windows: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	iOS: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
	Android: "bg-green-500/15 text-green-600 dark:text-green-400",
	Linux: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function getBrowserColor(browser: string): string {
	for (const [key, color] of Object.entries(browserColors)) {
		if (browser.includes(key)) return color;
	}
	return "bg-muted text-muted-foreground";
}

function getOSColor(os: string): string {
	for (const [key, color] of Object.entries(osColors)) {
		if (os.includes(key)) return color;
	}
	return "bg-muted text-muted-foreground";
}

type TabId = "browsers" | "os" | "languages" | "screens" | "network";

export function TechnologyBreakdown({
	browsers = [],
	operatingSystems = [],
	languages = [],
	screenSizes = [],
	connectionTypes = [],
	className,
}: TechnologyBreakdownProps) {
	const [activeTab, setActiveTab] = useState<TabId>("browsers");

	const tabs: { id: TabId; label: string; icon: React.ElementType; data: TechItem[] }[] = [
		{
			id: "browsers",
			label: "Browsers",
			icon: Globe,
			data: browsers.map((b) => ({
				name: b.name || (b as unknown as { browser: string }).browser,
				version: b.version,
				count: b.count,
				percentage: b.percentage,
			})),
		},
		{
			id: "os",
			label: "OS",
			icon: Monitor,
			data: operatingSystems.map((o) => ({
				name: o.name || (o as unknown as { os: string }).os,
				version: o.version,
				count: o.count,
				percentage: o.percentage,
			})),
		},
		{
			id: "languages",
			label: "Languages",
			icon: Languages,
			data: languages.map((l) => ({
				name: l.name || (l as unknown as { language: string }).language,
				count: l.count,
				percentage: l.percentage,
			})),
		},
		{
			id: "screens",
			label: "Screens",
			icon: Maximize2,
			data: screenSizes.map((s) => ({
				name: s.name || (s as unknown as { screenSize: string }).screenSize,
				count: s.count,
				percentage: s.percentage,
			})),
		},
		{
			id: "network",
			label: "Network",
			icon: Wifi,
			data: connectionTypes.map((c) => ({
				name: c.name || (c as unknown as { connectionType: string }).connectionType,
				count: c.count,
				percentage: c.percentage,
			})),
		},
	];

	const activeData = tabs.find((t) => t.id === activeTab)?.data || [];

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">Technology</h3>
			</div>

			{/* Tab bar */}
			<div className="flex border-b border-border overflow-x-auto">
				{tabs.map((tab) => {
					const hasData = tab.data.length > 0;
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors whitespace-nowrap",
								activeTab === tab.id
									? "text-foreground border-b-2 border-primary -mb-px"
									: "text-muted-foreground hover:text-foreground",
								!hasData && "opacity-50",
							)}
						>
							<tab.icon className="h-3 w-3" />
							{tab.label}
							{hasData && (
								<span className="text-[9px] text-muted-foreground">({tab.data.length})</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Content */}
			<div className="p-3">
				{activeData.length === 0 ? (
					<div className="py-6 text-center">
						<Inbox className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
						<p className="text-[10px] text-muted-foreground">No data available</p>
					</div>
				) : (
					<div className="space-y-2">
						{activeData.slice(0, 8).map((item, i) => {
							const colorClass =
								activeTab === "browsers"
									? getBrowserColor(item.name)
									: activeTab === "os"
										? getOSColor(item.name)
										: "bg-muted text-foreground";

							return (
								<div key={i} className="space-y-1">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span
												className={cn(
													"inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium",
													colorClass,
												)}
											>
												{item.name}
											</span>
											{item.version && (
												<span className="text-[9px] text-muted-foreground">v{item.version}</span>
											)}
										</div>
										<div className="flex items-center gap-2 text-[10px]">
											<span className="text-muted-foreground tabular-nums">
												{item.count.toLocaleString()}
											</span>
											<span className="text-foreground tabular-nums w-10 text-right">
												{item.percentage.toFixed(1)}%
											</span>
										</div>
									</div>
									<div className="h-1 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-primary/60 rounded-full"
											style={{ width: `${Math.min(100, item.percentage)}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
