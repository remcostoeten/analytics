"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import { isoCodeToNumericCode } from "@/components/geo-map";
import type { CityPoint } from "@/components/geo-map";
import { cn } from "@/lib/utils";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WIDTH = 480;
const HEIGHT = 170;
const PADDING = 10;

async function fetchTopology(url: string): Promise<Topology> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to load map data");
	}
	return response.json();
}

type Props = {
	countryCode: string;
	points?: CityPoint[];
	className?: string;
};

export function CountryMiniMap({ countryCode, points = [], className }: Props) {
	const { data: topology } = useSWR(geoUrl, fetchTopology, {
		revalidateOnFocus: false,
		revalidateIfStale: false,
	});

	const map = useMemo(() => {
		if (!topology) return null;
		const numericCode = isoCodeToNumericCode[countryCode.toUpperCase()];
		if (!numericCode) return null;

		const collection = feature(topology, topology.objects.countries as GeometryCollection);
		const country = collection.features.find(
			(f: Feature<Geometry>) => String(f.id) === numericCode,
		);
		if (!country) return null;

		const projection = geoMercator().fitExtent(
			[
				[PADDING, PADDING],
				[WIDTH - PADDING, HEIGHT - PADDING],
			],
			country,
		);
		const path = geoPath(projection)(country);
		return path ? { path, projection } : null;
	}, [topology, countryCode]);
	const cityPoints = useMemo(() => {
		if (!map) return [];
		const maxEvents = Math.max(...points.map((point) => point.events), 1);
		return points.reduce<{ point: CityPoint; x: number; y: number; radius: number }[]>(
			(result, point) => {
				const coordinates = map.projection([point.longitude, point.latitude]);
				if (!coordinates) return result;
				result.push({
					point,
					x: coordinates[0],
					y: coordinates[1],
					radius: 2 + Math.sqrt(point.events / maxEvents) * 5,
				});
				return result;
			},
			[],
		);
	}, [map, points]);

	if (!map) {
		return <div className={cn("h-[120px] rounded-md bg-muted/30 animate-pulse", className)} />;
	}

	return (
		<div className={cn("rounded-md bg-muted/30 overflow-hidden", className)}>
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="w-full h-auto"
				role="img"
				aria-label={`Map of ${countryCode}`}
			>
				<path
					d={map.path}
					className="fill-primary/15 stroke-primary/70"
					strokeWidth={1}
					strokeLinejoin="round"
				/>
				{cityPoints.map(({ point, x, y, radius }, index) => (
					<g key={`${point.region}-${point.city}`}>
						<circle
							cx={x}
							cy={y}
							r={radius}
							className="fill-foreground stroke-background"
							fillOpacity={0.8}
							strokeWidth={1}
						/>
						{index < 3 && (
							<text
								x={x + radius + 3}
								y={y - radius - 2}
								className="fill-muted-foreground text-[8px]"
							>
								{point.city}
							</text>
						)}
					</g>
				))}
			</svg>
		</div>
	);
}
