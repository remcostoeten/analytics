import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardContent } from "@/components/dashboard-content";
import { mockDashboardData } from "@/lib/mock-data";
import type { DashboardData } from "@/lib/types";
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

export default async function DashboardPage() {
	const { data, databaseReady, databaseIssue } = await fetchDashboardData();

	return (
		<SidebarProvider>
			<Suspense fallback={<div className="w-64 border-r bg-muted/20" />}>
				<AppSidebar />
			</Suspense>
			<SidebarInset>
				<Suspense fallback={<div className="flex-1 p-4">Loading dashboard...</div>}>
					<DashboardContent
						data={data}
						databaseReady={databaseReady}
						databaseIssue={databaseIssue}
						breadcrumbs={[{ label: "Analytics", href: "#" }, { label: "Live operations" }]}
						description="Real-time sessions, regional load, and ingest health across your edge network"
					/>
				</Suspense>
			</SidebarInset>
		</SidebarProvider>
	);
}
