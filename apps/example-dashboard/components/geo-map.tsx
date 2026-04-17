"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { cn } from "@/lib/utils";
import type { GeoDistribution } from "@/lib/types";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Map country names (from database) to ISO 3166-1 numeric codes used by TopoJSON
// These codes match the "id" field in the world-atlas TopoJSON
const countryNameToNumericCode: Record<string, string> = {
	Afghanistan: "004",
	Albania: "008",
	Algeria: "012",
	Argentina: "032",
	Armenia: "051",
	Australia: "036",
	Austria: "040",
	Azerbaijan: "031",
	Bangladesh: "050",
	Belarus: "112",
	Belgium: "056",
	Bolivia: "068",
	"Bosnia and Herzegovina": "070",
	Brazil: "076",
	Bulgaria: "100",
	Cambodia: "116",
	Cameroon: "120",
	Canada: "124",
	Chile: "152",
	China: "156",
	Colombia: "170",
	"Costa Rica": "188",
	Croatia: "191",
	Cuba: "192",
	Cyprus: "196",
	"Czech Republic": "203",
	Czechia: "203",
	Denmark: "208",
	"Dominican Republic": "214",
	Ecuador: "218",
	Egypt: "818",
	"El Salvador": "222",
	Estonia: "233",
	Ethiopia: "231",
	Finland: "246",
	France: "250",
	Georgia: "268",
	Germany: "276",
	Ghana: "288",
	Greece: "300",
	Guatemala: "320",
	Honduras: "340",
	"Hong Kong": "344",
	Hungary: "348",
	Iceland: "352",
	India: "356",
	Indonesia: "360",
	Iran: "364",
	Iraq: "368",
	Ireland: "372",
	Israel: "376",
	Italy: "380",
	Jamaica: "388",
	Japan: "392",
	Jordan: "400",
	Kazakhstan: "398",
	Kenya: "404",
	Kuwait: "414",
	Latvia: "428",
	Lebanon: "422",
	Libya: "434",
	Lithuania: "440",
	Luxembourg: "442",
	Malaysia: "458",
	Mexico: "484",
	Moldova: "498",
	Mongolia: "496",
	Morocco: "504",
	Myanmar: "104",
	Nepal: "524",
	Netherlands: "528",
	"New Zealand": "554",
	Nigeria: "566",
	"North Korea": "408",
	Norway: "578",
	Oman: "512",
	Pakistan: "586",
	Panama: "591",
	Paraguay: "600",
	Peru: "604",
	Philippines: "608",
	Poland: "616",
	Portugal: "620",
	"Puerto Rico": "630",
	Qatar: "634",
	Romania: "642",
	Russia: "643",
	"Saudi Arabia": "682",
	Senegal: "686",
	Serbia: "688",
	Singapore: "702",
	Slovakia: "703",
	Slovenia: "705",
	"South Africa": "710",
	"South Korea": "410",
	Spain: "724",
	"Sri Lanka": "144",
	Sudan: "736",
	Sweden: "752",
	Switzerland: "756",
	Syria: "760",
	Taiwan: "158",
	Tanzania: "834",
	Thailand: "764",
	Tunisia: "788",
	Turkey: "792",
	Ukraine: "804",
	"United Arab Emirates": "784",
	"United Kingdom": "826",
	"United States": "840",
	Uruguay: "858",
	Uzbekistan: "860",
	Venezuela: "862",
	Vietnam: "704",
	Yemen: "887",
	Zimbabwe: "716",
};

// Also map ISO 2-letter codes to numeric for fallback
const isoCodeToNumericCode: Record<string, string> = {
	AF: "004",
	AL: "008",
	DZ: "012",
	AR: "032",
	AM: "051",
	AU: "036",
	AT: "040",
	AZ: "031",
	BD: "050",
	BY: "112",
	BE: "056",
	BO: "068",
	BA: "070",
	BR: "076",
	BG: "100",
	KH: "116",
	CM: "120",
	CA: "124",
	CL: "152",
	CN: "156",
	CO: "170",
	CR: "188",
	HR: "191",
	CU: "192",
	CY: "196",
	CZ: "203",
	DK: "208",
	DO: "214",
	EC: "218",
	EG: "818",
	SV: "222",
	EE: "233",
	ET: "231",
	FI: "246",
	FR: "250",
	GE: "268",
	DE: "276",
	GH: "288",
	GR: "300",
	GT: "320",
	HN: "340",
	HK: "344",
	HU: "348",
	IS: "352",
	IN: "356",
	ID: "360",
	IR: "364",
	IQ: "368",
	IE: "372",
	IL: "376",
	IT: "380",
	JM: "388",
	JP: "392",
	JO: "400",
	KZ: "398",
	KE: "404",
	KW: "414",
	LV: "428",
	LB: "422",
	LY: "434",
	LT: "440",
	LU: "442",
	MY: "458",
	MX: "484",
	MD: "498",
	MN: "496",
	MA: "504",
	MM: "104",
	NP: "524",
	NL: "528",
	NZ: "554",
	NG: "566",
	KP: "408",
	NO: "578",
	OM: "512",
	PK: "586",
	PA: "591",
	PY: "600",
	PE: "604",
	PH: "608",
	PL: "616",
	PT: "620",
	PR: "630",
	QA: "634",
	RO: "642",
	RU: "643",
	SA: "682",
	SN: "686",
	RS: "688",
	SG: "702",
	SK: "703",
	SI: "705",
	ZA: "710",
	KR: "410",
	ES: "724",
	LK: "144",
	SD: "736",
	SE: "752",
	CH: "756",
	SY: "760",
	TW: "158",
	TZ: "834",
	TH: "764",
	TN: "788",
	TR: "792",
	UA: "804",
	AE: "784",
	GB: "826",
	US: "840",
	UY: "858",
	UZ: "860",
	VE: "862",
	VN: "704",
	YE: "887",
	ZW: "716",
};

interface GeoMapProps {
	data: GeoDistribution[];
	className?: string;
	onCountryClick?: (country: GeoDistribution) => void;
}

export function GeoMap({ data, className, onCountryClick }: GeoMapProps) {
	const [tooltipContent, setTooltipContent] = useState<GeoDistribution | null>(null);
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

	// Create a lookup map from numeric code to data
	const dataByNumericCode = useMemo(() => {
		const map = new Map<string, GeoDistribution>();
		data.forEach((d) => {
			// Try country name first (full names like "United States")
			let numericCode = countryNameToNumericCode[d.country];
			// Then try ISO code from countryCode field
			if (!numericCode && d.countryCode) {
				numericCode = isoCodeToNumericCode[d.countryCode.toUpperCase()];
			}
			// Also try the country field as an ISO code (some DBs store codes directly)
			if (!numericCode && d.country && d.country.length === 2) {
				numericCode = isoCodeToNumericCode[d.country.toUpperCase()];
			}
			if (numericCode) {
				map.set(numericCode, d);
			}
		});
		return map;
	}, [data]);

	// Calculate color intensity based on percentage
	const maxPercentage = useMemo(() => Math.max(...data.map((d) => d.percentage), 1), [data]);

	return (
		<div className={cn("bg-card border border-border rounded-sm overflow-hidden", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground">Geographic Distribution</h3>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{data.length} countries
				</span>
			</div>
			<div
				className="relative aspect-[2/1] bg-muted/30"
				onMouseLeave={() => setTooltipContent(null)}
			>
				<ComposableMap
					projectionConfig={{
						rotate: [-10, 0, 0],
						scale: 147,
					}}
					style={{ width: "100%", height: "100%" }}
				>
					<Geographies geography={geoUrl}>
						{({ geographies }) => {
							return geographies.map((geo) => {
								const numericCode = String(geo.id);
								const countryData = dataByNumericCode.get(numericCode);
								const hasData = !!countryData;

								return (
									<Geography
										key={geo.rsmKey}
										geography={geo}
										fill={hasData ? "var(--color-primary)" : "var(--color-muted)"}
										fillOpacity={hasData ? 0.2 + (countryData.percentage / maxPercentage) * 0.8 : 1}
										stroke="var(--color-border)"
										strokeWidth={0.5}
										onMouseEnter={(e) => {
											if (countryData) {
												setTooltipContent(countryData);
												setTooltipPos({ x: e.clientX, y: e.clientY });
											}
										}}
										onMouseMove={(e) => {
											if (countryData) {
												setTooltipPos({ x: e.clientX, y: e.clientY });
											}
										}}
										onMouseLeave={() => setTooltipContent(null)}
										onClick={() => {
											if (countryData && onCountryClick) {
												onCountryClick(countryData);
											}
										}}
										style={{
											default: {
												outline: "none",
												cursor: hasData ? "pointer" : "default",
											},
											hover: {
												fill: hasData
													? "hsl(var(--primary))"
													: "hsl(var(--muted-foreground) / 0.2)",
												outline: "none",
												cursor: hasData ? "pointer" : "default",
											},
											pressed: { outline: "none" },
										}}
									/>
								);
							});
						}}
					</Geographies>
				</ComposableMap>

				{/* Tooltip */}
				{tooltipContent && (
					<div
						className="fixed z-50 px-2 py-1.5 bg-popover border border-border rounded shadow-lg pointer-events-none"
						style={{
							left: tooltipPos.x + 10,
							top: tooltipPos.y - 40,
						}}
					>
						<div className="flex items-center gap-2">
							{tooltipContent.countryCode && (
								<span className="text-sm">{getFlagEmoji(tooltipContent.countryCode)}</span>
							)}
							<div>
								<p className="text-xs font-medium text-foreground">{tooltipContent.country}</p>
								<p className="text-[10px] text-muted-foreground">
									{tooltipContent.count.toLocaleString()} visits (
									{tooltipContent.percentage.toFixed(1)}%)
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Legend with gradient */}
			<div className="px-3 py-2 border-t border-border">
				<div className="flex items-center gap-3 mb-2">
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 rounded-sm bg-muted" />
						<span className="text-[10px] text-muted-foreground">No data</span>
					</div>
					<div className="flex items-center gap-1">
						<div
							className="w-16 h-3 rounded-sm"
							style={{
								background:
									"linear-gradient(to right, hsl(var(--primary) / 0.2), hsl(var(--primary)))",
							}}
						/>
						<span className="text-[10px] text-muted-foreground">Traffic</span>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{data.slice(0, 6).map((d) => (
						<button
							key={d.countryCode || d.country}
							onClick={() => onCountryClick?.(d)}
							className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
						>
							{d.countryCode && <span className="text-[10px]">{getFlagEmoji(d.countryCode)}</span>}
							<span className="text-[10px] text-foreground">{d.country}</span>
							<span className="text-[10px] text-muted-foreground tabular-nums">
								{d.percentage.toFixed(1)}%
							</span>
						</button>
					))}
					{data.length > 6 && (
						<span className="text-[10px] text-muted-foreground self-center">
							+{data.length - 6} more
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function getFlagEmoji(countryCode: string): string {
	const codePoints = countryCode
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}
