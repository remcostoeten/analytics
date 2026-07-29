import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardContent } from "@/components/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { SESSION_COOKIE, isAuthEnabled, verifySessionToken } from "@/lib/auth";
import { mockDashboardData } from "@/lib/mock-data";
import type { DashboardData } from "@/lib/types";
import { cookies } from "next/headers";
import { Suspense } from "react";

type DashboardResult = {
	data: DashboardData;
	databaseReady: boolean;
	databaseIssue?: "missing_database_url" | "query_failed";
};

async function fetchDashboardData(): Promise<DashboardResult> {
	if (process.env.DATABASE_URL) {
		try {
			const { getDashboardData } = await import("@/lib/queries");
			const data = await getDashboardData();

			return {
				data,
				databaseReady: true,
			};
		} catch (error) {
			console.error("[v0] Database query failed, falling back to mock data:", error);

			return {
				data: mockDashboardData,
				databaseReady: false,
				databaseIssue: "query_failed",
			};
		}
	}

	return {
		data: mockDashboardData,
		databaseReady: false,
		databaseIssue: "missing_database_url",
	};
}

async function DashboardData() {
	const { data, databaseReady, databaseIssue } = await fetchDashboardData();
	const cookieStore = await cookies();
	const authUser = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);

	return (
		<DashboardContent
			data={data}
			databaseReady={databaseReady}
			databaseIssue={databaseIssue}
			breadcrumbs={[{ label: "Analytics", href: "/" }, { label: "Live operations" }]}
			description="Real-time sessions, regional load, and ingest health across your edge network"
			authUser={authUser}
			authEnabled={isAuthEnabled()}
		/>
	);
}

export default function DashboardPage() {
	return (
		<SidebarProvider>
			<Suspense fallback={<div className="w-64 border-r bg-muted/20" />}>
				<AppSidebar />
			</Suspense>
			<SidebarInset>
				<Suspense fallback={<DashboardSkeleton />}>
					<DashboardData />
				</Suspense>
			</SidebarInset>
		</SidebarProvider>
	);
}
