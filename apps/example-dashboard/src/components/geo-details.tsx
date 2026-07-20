"use client";

import { ChevronDown, Globe2, Inbox, MapPin, MousePointerClick } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
};

export function GeoDetails({ data, className }: GeoDetailsProps) {
	const [expandedCity, setExpandedCity] = useState<string | null>(null);
	const countries = data?.countries ?? [];
	const regions = data?.regions ?? [];
	const cities = data?.cities ?? [];
	const quality = data?.quality;
	const hasData = countries.length > 0 || regions.length > 0 || cities.length > 0;

	if (!hasData) {
		return (
			<div className={cn("rounded-sm border border-border bg-card", className)}>
				<div className="border-b border-border px-3 py-2">
					<h3 className="text-xs font-medium text-foreground">Location Detail</h3>
				</div>
				<div className="p-6 text-center">
					<Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
					<p className="text-[11px] text-muted-foreground">No detailed location data yet</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("rounded-sm border border-border bg-card", className)}>
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<div className="flex items-center gap-2">
					<Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Location Detail</h3>
				</div>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{quality?.total.toLocaleString() ?? 0} events
				</span>
			</div>

			{quality && quality.total > 0 && (
				<div className="grid grid-cols-3 gap-1 border-b border-border p-2">
					<QualityPill label="Country" value={quality.countryKnown} />
					{quality.regionKnown > 0 && <QualityPill label="Region" value={quality.regionKnown} />}
					{quality.cityKnown > 0 && <QualityPill label="City" value={quality.cityKnown} />}
				</div>
			)}

			<div className="grid gap-3 p-3 lg:grid-cols-3">
				{cities.length > 0 && (
					<section className="lg:col-span-2">
						<div className="mb-2 flex items-center justify-between">
							<h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Top Cities
							</h4>
							<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
								<MousePointerClick className="h-3 w-3" />
								details
							</span>
						</div>
						<div className="divide-y divide-border rounded-sm border border-border">
							{cities.slice(0, 8).map((city) => {
								const key = `${city.city}-${city.region}-${city.country}`;
								const expanded = expandedCity === key;
								const cityName = labelText(city.city);
								const regionName = city.region ? labelText(city.region) : null;
								const countryName = labelText(city.country);
								return (
									<button
										key={key}
										type="button"
										onClick={() => setExpandedCity(expanded ? null : key)}
										className="w-full px-2 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/40 active:scale-[0.99]"
									>
										<div className="flex items-center gap-2">
											<MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
											<div className="min-w-0 flex-1">
												<div className="truncate text-[11px] font-medium text-foreground">
													{cityName}
												</div>
												<div className="truncate text-[10px] text-muted-foreground">
													{[regionName, countryName].filter(Boolean).join(", ")}
												</div>
											</div>
											<div className="text-right">
												<div className="text-[11px] font-medium tabular-nums text-foreground">
													{city.count.toLocaleString()}
												</div>
												<div className="text-[10px] text-muted-foreground">events</div>
											</div>
											<ChevronDown
												className={cn(
													"h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ease-out",
													expanded && "rotate-180",
												)}
											/>
										</div>
										{expanded && (
											<div className="mt-2 grid grid-cols-2 gap-2 pl-5">
												<MiniStat label="Visitors" value={city.visitors} />
												<MiniStat label="Sessions" value={city.sessions} />
											</div>
										)}
									</button>
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
			<div className="text-[10px] text-muted-foreground">{label}</div>
			<div className="text-xs font-medium tabular-nums text-foreground">{value.toFixed(1)}%</div>
		</div>
	);
}

function MiniStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-sm bg-muted/40 px-2 py-1">
			<div className="text-[10px] text-muted-foreground">{label}</div>
			<div className="text-[11px] font-medium tabular-nums text-foreground">
				{value.toLocaleString()}
			</div>
		</div>
	);
}

function RankList({
	title,
	rows,
}: {
	title: string;
	rows: { label: string; meta: string; value: number }[];
}) {
	return (
		<section>
			<h4 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
				{title}
			</h4>
			<div className="space-y-1">
				{rows.map((row) => (
					<div key={`${title}-${row.label}`} className="rounded-sm bg-muted/30 px-2 py-1.5">
						<div className="flex items-center justify-between gap-2">
							<div className="min-w-0">
								<div className="truncate text-[11px] font-medium text-foreground">{row.label}</div>
								<div className="truncate text-[10px] text-muted-foreground">{row.meta}</div>
							</div>
							<div className="text-[11px] font-medium tabular-nums text-foreground">
								{row.value.toLocaleString()}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
