"use client";

import { ChevronDown, CircleDot } from "lucide-react";
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
import type { SignalEvent } from "@/lib/types";

type DashboardHeaderProps = {
	className?: string;
	typeFilter?: SignalEvent["type"] | "all";
	onTypeFilterChange?: (type: SignalEvent["type"] | "all") => void;
};

export function DashboardHeader({
	className,
	typeFilter = "all",
	onTypeFilterChange,
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
			</div>

			<div className="flex items-center gap-1">
				<TypeFilterDropdown value={typeFilter} onChange={onTypeFilterChange} />
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
		{ value: "all", label: "All Events" },
		{ value: "ok", label: "Healthy", color: "text-emerald-600 dark:text-emerald-400" },
		{ value: "info", label: "Info", color: "text-blue-600 dark:text-blue-400" },
		{ value: "warn", label: "Warnings", color: "text-amber-600 dark:text-amber-400" },
		{ value: "error", label: "Errors", color: "text-red-600 dark:text-red-400" },
	];

	const currentType = types.find((t) => t.value === value);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
					<CircleDot className="h-3 w-3" />
					<span className="text-muted-foreground">Event status</span>
					<span className={currentType?.color}>{currentType?.label}</span>
					<ChevronDown className="h-3 w-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				<DropdownMenuLabel className="text-[10px]">Event status</DropdownMenuLabel>
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
