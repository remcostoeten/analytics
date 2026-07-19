import { Suspense } from "react";
import type { Metadata } from "next";
import { GeoExplorer } from "@/components/geo/geo-explorer";

export const metadata: Metadata = {
	title: "Geo Explorer",
	description: "Drill into visitor geography: countries, regions, cities, and networks",
};

export default function GeoPage() {
	return (
		<main className="min-h-screen bg-background">
			<Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading geo explorer…</div>}>
				<GeoExplorer />
			</Suspense>
		</main>
	);
}
