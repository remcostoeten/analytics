import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { GeoExplorer } from "@/components/geo/geo-explorer";
import { GeoSkeleton } from "@/components/dashboard-skeleton";
import { SESSION_COOKIE, isAuthEnabled, verifySessionToken } from "@/lib/auth";

export const metadata: Metadata = {
	title: "Geo Explorer",
	description: "Drill into visitor geography: countries, regions, cities, and networks",
};

async function GeoHeader() {
	const cookieStore = await cookies();
	const authUser = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

	return (
		<DashboardHeader
			title="Geo Explorer"
			breadcrumbs={[{ label: "Analytics", href: "/" }]}
			authUser={authUser}
			authEnabled={isAuthEnabled()}
		/>
	);
}

export default function GeoPage() {
	return (
		<SidebarProvider>
			<Suspense
				fallback={
					<div className="w-(--sidebar-width) shrink-0 border-r border-border bg-sidebar" />
				}
			>
				<AppSidebar />
			</Suspense>
			<SidebarInset>
				<Suspense fallback={<div className="h-12 border-b border-border" />}>
					<GeoHeader />
				</Suspense>
				<Suspense fallback={<GeoSkeleton />}>
					<GeoExplorer />
				</Suspense>
			</SidebarInset>
		</SidebarProvider>
	);
}
