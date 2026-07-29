import { Suspense } from "react";
import type { Metadata } from "next";
import { GeoExplorer } from "@/components/geo/geo-explorer";
import { GeoSkeleton } from "@/components/dashboard-skeleton";

export const metadata: Metadata = {
	title: "Geo Explorer",
	description: "Drill into visitor geography: countries, regions, cities, and networks",
};

export default function GeoPage() {
	return (
		<main className="min-h-screen bg-background">
			<Suspense fallback={<GeoSkeleton />}>
				<GeoExplorer />
			</Suspense>
		</main>
	);
}
