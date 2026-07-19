"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { cn } from "@/lib/utils";
import { isoCodeToNumericCode } from "@/components/geo-map";
import type { GeoBreakdownRow, GeoPoint } from "@/lib/queries/geo";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const numericToIsoCode: Record<string, string> = Object.fromEntries(
	Object.entries(isoCodeToNumericCode).map(([iso, numeric]) => [numeric, iso]),
);

type Props = {
	points: GeoPoint[];
	breakdown: GeoBreakdownRow[];
	scopedCountry: string | null;
	onCountryClick?: (code: string) => void;
	className?: string;
};

type Viewport = { center: [number, number]; zoom: number };

function computeViewport(points: GeoPoint[], scoped: boolean): Viewport {
	if (!scoped || points.length === 0) return { center: [10, 20], zoom: 1 };

	let minLat = 90;
	let maxLat = -90;
	let minLon = 180;
	let maxLon = -180;
	for (const p of points) {
		if (p.latitude < minLat) minLat = p.latitude;
		if (p.latitude > maxLat) maxLat = p.latitude;
		if (p.longitude < minLon) minLon = p.longitude;
		if (p.longitude > maxLon) maxLon = p.longitude;
	}
	const span = Math.max(maxLat - minLat, maxLon - minLon, 0.5);
	const zoom = Math.min(24, Math.max(2, 60 / span));
	return { center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2], zoom };
}

export function GeoDotMap({ points, breakdown, scopedCountry, onCountryClick, className }: Props) {
	const [hovered, setHovered] = useState<GeoPoint | null>(null);
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

	const viewport = useMemo(
		() => computeViewport(points, scopedCountry !== null),
		[points, scopedCountry],
	);

	const countriesWithData = useMemo(() => {
		const set = new Set<string>();
		for (const row of breakdown) {
			if (row.countryCode) {
				const numeric = isoCodeToNumericCode[row.countryCode];
				if (numeric) set.add(numeric);
			}
		}
		return set;
	}, [breakdown]);

	const maxCount = useMemo(() => Math.max(...points.map((p) => p.count), 1), [points]);

	return (
		<div
			className={cn("relative bg-muted/30 overflow-hidden", className)}
			onMouseLeave={() => setHovered(null)}
		>
			<ComposableMap projectionConfig={{ scale: 147 }} style={{ width: "100%", height: "100%" }}>
				<ZoomableGroup
					center={viewport.center}
					zoom={viewport.zoom}
					key={`${scopedCountry}-${viewport.zoom}`}
				>
					<Geographies geography={geoUrl}>
						{({ geographies }) =>
							geographies.map((geo) => {
								const numeric = String(geo.id);
								const iso = numericToIsoCode[numeric];
								const hasData = !scopedCountry && countriesWithData.has(numeric);
								const isScoped = scopedCountry !== null && iso === scopedCountry;
								return (
									<Geography
										key={geo.rsmKey}
										geography={geo}
										fill={
											isScoped
												? "var(--color-primary)"
												: hasData
													? "var(--color-primary)"
													: "var(--color-muted)"
										}
										stroke="var(--color-border)"
										strokeWidth={scopedCountry ? 0.2 : 0.5}
										onClick={() => {
											if (!scopedCountry && hasData && iso && onCountryClick) onCountryClick(iso);
										}}
										style={{
											default: {
												outline: "none",
												fillOpacity: isScoped ? 0.15 : hasData ? 0.12 : 1,
												cursor: hasData ? "pointer" : "default",
											},
											hover: {
												outline: "none",
												fillOpacity: isScoped ? 0.15 : hasData ? 0.3 : 1,
												cursor: hasData ? "pointer" : "default",
											},
											pressed: { outline: "none" },
										}}
									/>
								);
							})
						}
					</Geographies>
					{points.map((point) => {
						const radius = 2 + Math.sqrt(point.count / maxCount) * 8;
						return (
							<Marker
								key={`${point.latitude}-${point.longitude}`}
								coordinates={[point.longitude, point.latitude]}
								onMouseEnter={(e) => {
									setHovered(point);
									setTooltipPos({ x: e.clientX, y: e.clientY });
								}}
								onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
								onMouseLeave={() => setHovered(null)}
							>
								<circle
									r={radius / Math.sqrt(viewport.zoom)}
									fill="var(--color-primary)"
									fillOpacity={0.55}
									stroke="var(--color-primary)"
									strokeWidth={0.5}
								/>
							</Marker>
						);
					})}
				</ZoomableGroup>
			</ComposableMap>

			{hovered && (
				<div
					className="fixed z-50 px-2.5 py-1.5 bg-background border border-border rounded shadow-lg pointer-events-none"
					style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 40 }}
				>
					<p className="text-xs font-medium text-foreground">{hovered.city ?? "Unknown area"}</p>
					<p className="text-[10px] text-muted-foreground tabular-nums">
						{hovered.count.toLocaleString()} events · {hovered.visitors.toLocaleString()} visitors
					</p>
					<p className="text-[10px] text-muted-foreground tabular-nums">
						{hovered.latitude.toFixed(1)}, {hovered.longitude.toFixed(1)}
					</p>
				</div>
			)}

			{points.length === 0 && (
				<div className="absolute inset-0 flex items-center justify-center">
					<p className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded border border-border">
						No coordinate data yet — collected from the next deploy onward
					</p>
				</div>
			)}
		</div>
	);
}
