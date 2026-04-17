import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { mockDashboardData } from "@/lib/mock-data"
import type { DashboardData } from "@/lib/types"
import { Suspense } from "react"

// =============================================================================
// DATA FETCHING
// Uses Neon PostgreSQL when DATABASE_URL is set, falls back to mock data
// =============================================================================
async function fetchDashboardData(): Promise<DashboardData> {
  // Check if DATABASE_URL is configured
  if (process.env.DATABASE_URL) {
    try {
      // Dynamic import to avoid errors when DATABASE_URL is not set
      const { getDashboardData } = await import("@/lib/queries")
      return await getDashboardData()
    } catch (error) {
      console.error("[v0] Database query failed, falling back to mock data:", error)
      return mockDashboardData
    }
  }

  // No database configured, use mock data
  return mockDashboardData
}

export default async function DashboardPage() {
  const data = await fetchDashboardData()

  return (
    <SidebarProvider>
      <Suspense fallback={<div className="w-64 border-r bg-muted/20" />}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<div className="flex-1 p-4">Loading dashboard...</div>}>
          <DashboardContent
            data={data}
            breadcrumbs={[
              { label: "Analytics", href: "#" },
              { label: "Live operations" },
            ]}
            description="Real-time sessions, regional load, and ingest health across your edge network"
          />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}
