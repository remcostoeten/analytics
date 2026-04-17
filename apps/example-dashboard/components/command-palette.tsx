"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Users,
  Activity,
  Settings2,
  CalendarDays,
  Route,
  Radio,
  Globe,
  FileText,
  ExternalLink,
  Clock,
  TrendingUp,
  Search,
  Zap,
  Filter,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command"

type DashboardView = "overview" | "realtime" | "retention" | "behavior" | "technology" | "audience"

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewChange: (view: DashboardView) => void
  onTimeRangeChange: (range: string) => void
  onProjectChange: (projectId: string | null) => void
  pages?: { path: string; views: number }[]
  referrers?: { domain: string; visits: number }[]
  projects?: { id: string; eventCount: number }[]
  currentView: DashboardView
  currentTimeRange: string
}

export function CommandPalette({
  open,
  onOpenChange,
  onViewChange,
  onTimeRangeChange,
  onProjectChange,
  pages = [],
  referrers = [],
  projects = [],
  currentView,
  currentTimeRange,
}: CommandPaletteProps) {
  function runAndClose(fn: () => void) {
    fn()
    onOpenChange(false)
  }

  const views: { id: DashboardView; label: string; icon: React.ElementType; description: string }[] = [
    { id: "overview", label: "Overview", icon: BarChart3, description: "KPIs, trends, geo, top pages" },
    { id: "realtime", label: "Live", icon: Radio, description: "Active visitors and sessions" },
    { id: "retention", label: "Retention", icon: CalendarDays, description: "Cohort and retention heatmap" },
    { id: "behavior", label: "Behavior", icon: Route, description: "Session paths and engagement" },
    { id: "technology", label: "Technology", icon: Settings2, description: "Browsers, OS, screen sizes" },
    { id: "audience", label: "Audience", icon: Users, description: "Geo and segmentation" },
  ]

  const timeRanges = [
    { value: "1h", label: "Last 1 hour" },
    { value: "6h", label: "Last 6 hours" },
    { value: "24h", label: "Last 24 hours" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search pages, referrers, switch views or change time range"
      showCloseButton={false}
      className="max-w-xl top-[30%]"
    >
      <CommandInput placeholder="Search pages, views, actions..." />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <Search className="h-8 w-8 opacity-30" />
            <span className="text-sm">No results found</span>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Views">
          {views.map((view) => (
            <CommandItem
              key={view.id}
              value={`view ${view.label} ${view.description}`}
              onSelect={() => runAndClose(() => onViewChange(view.id))}
              className="gap-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
                <view.icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{view.label}</span>
                <span className="text-[11px] text-muted-foreground">{view.description}</span>
              </div>
              {currentView === view.id && (
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  active
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Time Range">
          {timeRanges.map((range) => (
            <CommandItem
              key={range.value}
              value={`time ${range.label} ${range.value}`}
              onSelect={() => runAndClose(() => onTimeRangeChange(range.value))}
              className="gap-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm">{range.label}</span>
              {currentTimeRange === range.value && (
                <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  active
                </span>
              )}
              <CommandShortcut>{range.value}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {pages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Top Pages">
              {pages.slice(0, 6).map((page) => (
                <CommandItem
                  key={page.path}
                  value={`page ${page.path}`}
                  onSelect={() => onOpenChange(false)}
                  className="gap-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-mono truncate">{page.path}</span>
                  </div>
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                    {page.views.toLocaleString()} views
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {referrers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Top Referrers">
              {referrers.slice(0, 5).map((ref) => (
                <CommandItem
                  key={ref.domain}
                  value={`referrer ${ref.domain}`}
                  onSelect={() => onOpenChange(false)}
                  className="gap-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm">{ref.domain}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {ref.visits.toLocaleString()} visits
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              <CommandItem
                value="project all projects"
                onSelect={() => runAndClose(() => onProjectChange(null))}
                className="gap-3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm">All Projects</span>
              </CommandItem>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project ${project.id}`}
                  onSelect={() => runAndClose(() => onProjectChange(project.id))}
                  className="gap-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm">{project.id}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {project.eventCount.toLocaleString()} events
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">↑↓</kbd>
          navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">↵</kbd>
          select
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">esc</kbd>
          close
        </span>
      </div>
    </CommandDialog>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return { open, setOpen }
}
