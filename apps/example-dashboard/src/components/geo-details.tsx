"use client";

import {
	ArrowUpRight,
	ChevronDown,
	ChevronRight,
	Globe2,
	Inbox,
	MapPin,
	MousePointerClick,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toCountryCode } from "@/lib/geo-names";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

type CountryRow = {
	country: string;
	count: number;
	visitors: number;
	sessions: number;
};

type RegionRow = {
	region: string;
	country: string;
	count: number;
	visitors: number;
};

type CityRow = {
	city: string;
	region: string | null;
	country: string;
	count: number;
	visitors: number;
	sessions: number;
};

type GeoDetailData = {
	countries: CountryRow[];
	regions: RegionRow[];
	cities: CityRow[];
	quality: {
		total: number;
		countryKnown: number;
		regionKnown: number;
		cityKnown: number;
	};
};

type GeoDetailsProps = {
	data?: GeoDetailData | null;
	className?: string;
	onCountrySelect?: (country: string) => void;
};

type RankRow = {
	label: string;
	meta: string;
	value: number;
	href?: Route;
	onClick?: () => void;
};

export function GeoDetails({
	data,
	className,
	onCountrySelect,
}: GeoDetailsProps) {
	const [expandedCity, setExpandedCity] = useState<string | null>(null);
	const searchParams = useSearchParams();
	const timeRange = searchParams.get("timeRange");
	const projectId = searchParams.get("projectId");

	function explorerHref(country: string, region?: string | null): Route {
		const params = new URLSearchParams();
		params.set("country", toCountryCode(country) ?? country);
		if (region) params.set("region", region);
		if (timeRange) params.set("timeRange", timeRange);
		if (projectId) params.set("projectId", projectId);
		return `/geo?${params.toString()}` as Route;
	}
	const countries = data?.countries ?? [];
	const regions = data?.regions ?? [];
	const cities = data?.cities ?? [];
	const quality = data?.quality;
	const hasData =
		countries.length > 0 || regions.length > 0 || cities.length > 0;

	if (!hasData) {
		return (
			<div
				className={cn(
					"rounded-lg border border-border bg-card",
					className,
				)}
			>
				<div className="border-b border-border px-3 py-2">
					<h3 className="text-xs font-medium text-foreground">
						Location Detail
					</h3>
				</div>
				<div className="flex items-center gap-2.5 px-3 py-3">
					<Inbox className="h-4 w-4 shrink-0 text-muted-foreground/50" />
					<p className="text-xs text-muted-foreground">
						No detailed location data yet — city and region
						breakdowns appear once geo-enriched events arrive.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn("rounded-lg border border-border bg-card", className)}
		>
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<div className="flex items-center gap-2">
					<Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">
						Location Detail
					</h3>
				</div>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{quality?.total.toLocaleString() ?? 0} events
				</span>
			</div>

			{quality && quality.total > 0 && (
				<div className="grid grid-cols-3 gap-1 border-b border-border p-2">
					<QualityPill label="Country" value={quality.countryKnown} />
					{quality.regionKnown > 0 && (
						<QualityPill
							label="Region"
							value={quality.regionKnown}
						/>
					)}
					{quality.cityKnown > 0 && (
						<QualityPill label="City" value={quality.cityKnown} />
					)}
				</div>
			)}

			<div className="grid gap-3 p-3 lg:grid-cols-3">
				{cities.length > 0 && (
					<section className="lg:col-span-2">
						<div className="mb-2 flex items-center justify-between">
							<h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Top Cities
							</h4>
							<span className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<MousePointerClick className="h-3 w-3" />
								details
							</span>
						</div>
						<div className="divide-y divide-border rounded-sm border border-border">
							{cities.slice(0, 8).map((city) => {
								const key = `${city.city}-${city.region}-${city.country}`;
								const expanded = expandedCity === key;
								const cityName = labelText(city.city);
								const regionName = city.region
									? labelText(city.region)
									: null;
								const countryName = labelText(city.country);
								return (
									<Collapsible
										key={key}
										open={expanded}
										asChild
									>
										<div className="px-2 py-2">
											<button
												type="button"
												onClick={() =>
													setExpandedCity(
														expanded ? null : key,
													)
												}
												className="-mx-2 -my-2 flex w-[calc(100%+1rem)] items-center gap-2 px-2 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40 active:scale-[0.99]"
											>
												<MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
												<div className="min-w-0 flex-1">
													<div className="truncate text-xs font-medium text-foreground">
														{cityName}
													</div>
													<div className="truncate text-[11px] text-muted-foreground">
														{[
															regionName,
															countryName,
														]
															.filter(Boolean)
															.join(", ")}
													</div>
												</div>
												<div className="text-right">
													<div className="text-xs font-medium tabular-nums text-foreground">
														{city.count.toLocaleString()}
													</div>
													<div className="text-[11px] text-muted-foreground">
														events
													</div>
												</div>
												<ChevronDown
													className={cn(
														"h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out",
														expanded &&
															"rotate-180",
													)}
												/>
											</button>
											<CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none">
												<div className="mt-2 grid grid-cols-2 gap-2 pl-5">
													<MiniStat
														label="Visitors"
														value={city.visitors}
													/>
													<MiniStat
														label="Sessions"
														value={city.sessions}
													/>
												</div>
												<Link
													href={explorerHref(
														city.country,
														city.region,
													)}
													className="mt-2 ml-5 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
												>
													Explore{" "}
													{regionName ?? countryName}{" "}
													in geo view
													<ArrowUpRight className="h-3 w-3" />
												</Link>
											</CollapsibleContent>
										</div>
									</Collapsible>
								);
							})}
						</div>
					</section>
				)}

				<div className="space-y-3">
					{regions.length > 0 && (
						<RankList
							title="Top Regions"
							rows={regions.slice(0, 6).map((region) => ({
								label: labelText(region.region),
								meta: labelText(region.country),
								value: region.count,
								href: explorerHref(
									region.country,
									region.region,
								),
							}))}
						/>
					)}
					{countries.length > 0 && (
						<RankList
							title="Top Countries"
							rows={countries.slice(0, 6).map((country) => ({
								label: labelText(country.country),
								meta: `${country.visitors.toLocaleString()} visitors`,
								value: country.count,
								href: onCountrySelect
									? undefined
									: explorerHref(country.country),
								onClick: onCountrySelect
									? () => onCountrySelect(country.country)
									: undefined,
							}))}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function labelText(value: string) {
	try {
		return decodeURIComponent(value.replace(/\+/g, " "));
	} catch {
		return value;
	}
}

function QualityPill({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-sm bg-muted/40 px-2 py-1">
			<div className="text-[11px] text-muted-foreground">{label}</div>
			<div className="text-xs font-medium tabular-nums text-foreground">
				{value.toFixed(1)}%
			</div>
		</div>
	);
}

function MiniStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-sm bg-muted/40 px-2 py-1">
			<div className="text-[11px] text-muted-foreground">{label}</div>
			<div className="text-xs font-medium tabular-nums text-foreground">
				{value.toLocaleString()}
			</div>
		</div>
	);
}

function RankList({ title, rows }: { title: string; rows: RankRow[] }) {
	return (
		<section>
			<h4 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{title}
			</h4>
			<div className="space-y-1">
				{rows.map((row) => (
					<RankRowItem key={`${title}-${row.label}`} row={row} />
				))}
			</div>
		</section>
	);
}

const rankRowClass =
	"block w-full rounded-sm bg-muted/30 px-2 py-1.5 text-left transition-colors duration-150 ease-out";
const rankRowInteractiveClass = "group hover:bg-muted/60 active:scale-[0.99]";

function RankRowItem({ row }: { row: RankRow }) {
	const interactive = Boolean(row.href || row.onClick);
	const content = (
		<div className="flex items-center justify-between gap-2">
			<div className="min-w-0">
				<div className="truncate text-xs font-medium text-foreground">
					{row.label}
				</div>
				<div className="truncate text-[11px] text-muted-foreground">
					{row.meta}
				</div>
			</div>
			<div className="flex items-center gap-1">
				<div className="text-xs font-medium tabular-nums text-foreground">
					{row.value.toLocaleString()}
				</div>
				{interactive && (
					<ChevronRight className="h-3 w-3 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/70" />
				)}
			</div>
		</div>
	);

	if (row.href) {
		return (
			<Link
				href={row.href}
				className={cn(rankRowClass, rankRowInteractiveClass)}
			>
				{content}
			</Link>
		);
	}
	if (row.onClick) {
		return (
			<button
				type="button"
				onClick={row.onClick}
				className={cn(rankRowClass, rankRowInteractiveClass)}
			>
				{content}
			</button>
		);
	}
	return <div className={rankRowClass}>{content}</div>;
}
