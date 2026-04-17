"use client";

import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country name to ISO code mapping for common countries
const countryToCode: Record<string, string> = {
	"United States": "USA",
	"United Kingdom": "GBR",
	Germany: "DEU",
	France: "FRA",
	Canada: "CAN",
	Australia: "AUS",
	Japan: "JPN",
	China: "CHN",
	India: "IND",
	Brazil: "BRA",
	Russia: "RUS",
	Mexico: "MEX",
	Spain: "ESP",
	Italy: "ITA",
	Netherlands: "NLD",
	"South Korea": "KOR",
	Sweden: "SWE",
	Norway: "NOR",
	Denmark: "DNK",
	Finland: "FIN",
	Poland: "POL",
	Singapore: "SGP",
	"Hong Kong": "HKG",
	Taiwan: "TWN",
	Indonesia: "IDN",
	Thailand: "THA",
	Vietnam: "VNM",
	Philippines: "PHL",
	Malaysia: "MYS",
	"New Zealand": "NZL",
	Ireland: "IRL",
	Switzerland: "CHE",
	Austria: "AUT",
	Belgium: "BEL",
	Portugal: "PRT",
	"Czech Republic": "CZE",
	Romania: "ROU",
	Ukraine: "UKR",
	Argentina: "ARG",
	Chile: "CHL",
	Colombia: "COL",
	Peru: "PER",
	"South Africa": "ZAF",
	Nigeria: "NGA",
	Egypt: "EGY",
	Israel: "ISR",
	"United Arab Emirates": "ARE",
	"Saudi Arabia": "SAU",
	Turkey: "TUR",
	Greece: "GRC",
	Hungary: "HUN",
};

interface GeoData {
	country: string;
	count: number;
	visitors: number;
	percentage: number;
	cities?: number;
}

interface WorldMapProps {
	data: GeoData[];
	onCountryClick?: (country: string) => void;
	selectedCountry?: string | null;
	className?: string;
}

export function WorldMap({ data, onCountryClick, selectedCountry, className }: WorldMapProps) {
	const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

	// Create a lookup map for fast access
	const dataByCountry = useMemo(() => {
		const map = new Map<string, GeoData>();
		data.forEach((d) => {
			map.set(d.country, d);
			// Also map by common variations
			const code = countryToCode[d.country];
			if (code) map.set(code, d);
		});
		return map;
	}, [data]);

	// Calculate max for color scaling
	const maxCount = useMemo(() => {
		return Math.max(...data.map((d) => d.count), 1);
	}, [data]);

	const getCountryColor = (countryName: string, countryCode: string) => {
		const countryData = dataByCountry.get(countryName) || dataByCountry.get(countryCode);

		if (!countryData) {
			return "hsl(var(--muted))";
		}

		// Scale from light to dark based on count
		const intensity = Math.min(countryData.count / maxCount, 1);
		const lightness = 75 - intensity * 45; // 75% to 30%

		if (selectedCountry === countryName || selectedCountry === countryCode) {
			return "hsl(var(--chart-1))";
		}

		if (hoveredCountry === countryName || hoveredCountry === countryCode) {
			return `hsl(210, 80%, ${lightness - 10}%)`;
		}

		return `hsl(210, 70%, ${lightness}%)`;
	};

	const getCountryData = (countryName: string, countryCode: string): GeoData | null => {
		return dataByCountry.get(countryName) || dataByCountry.get(countryCode) || null;
	};

	return (
		<div className={cn("bg-card border border-border rounded-sm overflow-hidden", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground">Geographic Distribution</h3>
				<span className="text-[10px] text-muted-foreground">{data.length} countries</span>
			</div>
			<TooltipProvider>
				<div className="relative aspect-[2/1] min-h-[200px]">
					<ComposableMap
						projectionConfig={{
							scale: 140,
							center: [0, 20],
						}}
						style={{ width: "100%", height: "100%" }}
					>
						<ZoomableGroup>
							<Geographies geography={GEO_URL}>
								{({ geographies }) =>
									geographies.map((geo) => {
										const countryName = geo.properties.name;
										const countryCode = geo.id;
										const countryData = getCountryData(countryName, countryCode);

										return (
											<Tooltip key={geo.rsmKey}>
												<TooltipTrigger asChild>
													<Geography
														geography={geo}
														fill={getCountryColor(countryName, countryCode)}
														stroke="hsl(var(--border))"
														strokeWidth={0.5}
														style={{
															default: { outline: "none" },
															hover: {
																outline: "none",
																cursor: countryData ? "pointer" : "default",
															},
															pressed: { outline: "none" },
														}}
														onMouseEnter={() => setHoveredCountry(countryName)}
														onMouseLeave={() => setHoveredCountry(null)}
														onClick={() => {
															if (countryData && onCountryClick) {
																onCountryClick(countryName);
															}
														}}
													/>
												</TooltipTrigger>
												{countryData && (
													<TooltipContent side="top" className="text-xs">
														<div className="font-medium">{countryName}</div>
														<div className="text-muted-foreground mt-1 space-y-0.5">
															<div>{countryData.count.toLocaleString()} events</div>
															<div>{countryData.visitors.toLocaleString()} visitors</div>
															<div>{countryData.percentage.toFixed(1)}% of traffic</div>
														</div>
													</TooltipContent>
												)}
											</Tooltip>
										);
									})
								}
							</Geographies>
						</ZoomableGroup>
					</ComposableMap>
				</div>
			</TooltipProvider>

			{/* Legend */}
			<div className="px-3 py-2 border-t border-border flex items-center justify-between">
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span>Low</span>
					<div className="flex gap-0.5">
						{[75, 60, 45, 30].map((l) => (
							<div
								key={l}
								className="w-4 h-2 rounded-sm"
								style={{ backgroundColor: `hsl(210, 70%, ${l}%)` }}
							/>
						))}
					</div>
					<span>High</span>
				</div>
				{selectedCountry && (
					<button
						onClick={() => onCountryClick?.(selectedCountry)}
						className="text-[10px] text-muted-foreground hover:text-foreground"
					>
						Clear selection
					</button>
				)}
			</div>
		</div>
	);
}

// Country list variant for sidebar/details
interface CountryListProps {
	data: GeoData[];
	onCountryClick?: (country: string) => void;
	selectedCountry?: string | null;
	className?: string;
}

export function CountryList({
	data,
	onCountryClick,
	selectedCountry,
	className,
}: CountryListProps) {
	return (
		<div className={cn("space-y-1", className)}>
			{data.slice(0, 10).map((item, i) => (
				<button
					key={item.country}
					onClick={() => onCountryClick?.(item.country)}
					className={cn(
						"w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
						selectedCountry === item.country ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
					)}
				>
					<span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
					<span className="flex-1 text-[11px] truncate">{item.country}</span>
					<span className="text-[10px] text-muted-foreground tabular-nums">
						{item.count.toLocaleString()}
					</span>
					<span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
						{item.percentage.toFixed(1)}%
					</span>
				</button>
			))}
		</div>
	);
}
