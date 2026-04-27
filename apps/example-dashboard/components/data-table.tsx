"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import type { ContentMetric, ReferrerMetric, GeoDistribution } from "@/lib/types";

interface DataTableProps<T extends object> {
	data: T[];
	columns: {
		key: keyof T | string;
		label: string;
		width?: string;
		align?: "left" | "right" | "center";
		render?: (value: unknown, row: T) => React.ReactNode;
	}[];
	title?: string;
	maxRows?: number;
	className?: string;
	onRowClick?: (row: T) => void;
}

export function DataTable<T extends object>({
	data,
	columns,
	title,
	maxRows = 8,
	className,
	onRowClick,
}: DataTableProps<T>) {
	const displayData = data.slice(0, maxRows);
	const hasData = data && data.length > 0;

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			{title && (
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">{title}</h3>
				</div>
			)}
			{!hasData ? (
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No data available</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-[11px]">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								{columns.map((col) => (
									<th
										key={String(col.key)}
										className={cn(
											"px-3 py-1.5 font-medium text-muted-foreground uppercase tracking-wide",
											col.align === "right"
												? "text-right"
												: col.align === "center"
													? "text-center"
													: "text-left",
										)}
										style={{ width: col.width }}
									>
										{col.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{displayData.map((row, i) => (
								<tr
									key={i}
									className={cn(
										"border-b border-border/50 hover:bg-muted/30 transition-colors",
										onRowClick && "cursor-pointer",
									)}
									onClick={() => onRowClick?.(row)}
								>
									{columns.map((col) => {
										const value = row[col.key as keyof T];
										return (
<td
											key={String(col.key)}
											className={cn(
												"px-3 py-1.5 text-foreground",
												col.align === "right"
													? "text-right tabular-nums font-medium"
													: col.align === "center"
														? "text-center"
														: "text-left",
											)}
										>
												{col.render ? col.render(value, row) : String(value ?? "")}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// Pre-configured tables for common use cases

interface TopPagesTableProps {
	data: ContentMetric[];
	className?: string;
}

export function TopPagesTable({ data, className }: TopPagesTableProps) {
	return (
		<DataTable
			data={data}
			title="Top Pages"
			className={className}
			columns={[
				{
					key: "host",
					label: "Domain",
					width: "120px",
					render: (v) => (
						<span className="text-[10px] truncate block text-muted-foreground">
							{(v as string) || "—"}
						</span>
					),
				},
				{
					key: "path",
					label: "Path",
					render: (_, row) => (
						<span className="font-mono text-[10px] truncate block max-w-[200px]">
							{(row as ContentMetric).path}
						</span>
					),
				},
				{
					key: "views",
					label: "Views",
					align: "right",
					render: (v) => Number(v).toLocaleString(),
				},
				{
					key: "uniqueVisitors",
					label: "Visitors",
					align: "right",
					render: (v) => Number(v).toLocaleString(),
				},
				{
					key: "bounceRate",
					label: "Bounce",
					align: "right",
					render: (v) => `${((Number(v) || 0) * 100).toFixed(0)}%`,
				},
			]}
		/>
	);
}

interface ReferrersTableProps {
	data: ReferrerMetric[];
	className?: string;
	onDomainClick?: (domain: string) => void;
}

export function ReferrersTable({ data, className, onDomainClick }: ReferrersTableProps) {
	return (
		<DataTable
			data={data}
			title="Top Referrers"
			className={className}
			onRowClick={
				onDomainClick ? (row) => onDomainClick((row as ReferrerMetric).domain) : undefined
			}
			columns={[
				{
					key: "domain",
					label: "Source",
					render: (_, row) => {
						const domain = (row as ReferrerMetric).domain;
						return (
							<div className="flex items-center gap-2">
								<img
									src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
									alt=""
									className="w-3.5 h-3.5"
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = "none";
									}}
								/>
								<span
									className={cn(
										"truncate block max-w-[140px]",
										onDomainClick && "text-primary hover:underline",
									)}
								>
									{domain}
								</span>
							</div>
						);
					},
				},
				{
					key: "visits",
					label: "Visits",
					align: "right",
					render: (v) => Number(v).toLocaleString(),
				},
				{
					key: "percentage",
					label: "%",
					align: "right",
					width: "50px",
					render: (v) => `${Number(v).toFixed(1)}%`,
				},
			]}
		/>
	);
}

interface GeoTableProps {
	data: GeoDistribution[];
	className?: string;
}

export function GeoTable({ data, className }: GeoTableProps) {
	return (
		<DataTable
			data={data}
			title="Geography"
			className={className}
			columns={[
				{
					key: "country",
					label: "Country",
					render: (_, row) => {
						const geo = row as GeoDistribution;
						return (
							<div className="flex items-center gap-1.5">
								{geo.countryCode && (
									<span className="text-[10px]">{getFlagEmoji(geo.countryCode)}</span>
								)}
								<span className="truncate max-w-[120px]">{geo.country}</span>
							</div>
						);
					},
				},
				{
					key: "count",
					label: "Visits",
					align: "right",
					render: (v) => Number(v).toLocaleString(),
				},
				{
					key: "percentage",
					label: "%",
					align: "right",
					width: "50px",
					render: (v) => `${Number(v).toFixed(1)}%`,
				},
			]}
		/>
	);
}

function getFlagEmoji(countryCode: string): string {
	const codePoints = countryCode
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}
