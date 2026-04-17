"use client"

import { Activity, Users, Globe, Zap, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveData {
  activeVisitors: number
  activeSessions: number
  eventsPerMinute: number
  activePages: { path: string; visitors: number }[]
  recentActivity: {
    type: string
    path: string
    country: string
    city: string
    timestamp: string
  }[]
  liveGeo: { country: string; visitors: number }[]
}

interface LiveNowWidgetProps {
  data: LiveData | null
}

export function LiveNowWidget({ data }: LiveNowWidgetProps) {
  if (!data) {
    return (
      <div className="bg-card border border-border rounded-sm">
        <div className="p-6">
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            <Activity className="h-5 w-5 animate-pulse mr-2" />
            Connecting to live stream...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-sm">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live Now
        </h3>
        <span className="text-[10px] text-muted-foreground">Last 5 minutes</span>
      </div>
      <div className="p-3">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="flex items-center justify-center gap-1.5 text-xl font-semibold text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              {data.activeVisitors}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Visitors</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="flex items-center justify-center gap-1.5 text-xl font-semibold text-foreground">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {data.liveGeo.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Countries</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="flex items-center justify-center gap-1.5 text-xl font-semibold text-foreground">
              <Zap className="h-4 w-4 text-muted-foreground" />
              {data.eventsPerMinute}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Events/min</p>
          </div>
        </div>

        {/* Active Pages */}
        <div className="mb-4">
          <h4 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Active Pages</h4>
          <div className="space-y-1">
            {data.activePages.slice(0, 5).map((page) => (
              <div key={page.path} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate flex-1">{page.path}</span>
                <span className="text-muted-foreground font-medium ml-2 tabular-nums">{page.visitors}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Geo */}
        <div className="mb-4">
          <h4 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Live Locations</h4>
          <div className="flex flex-wrap gap-1">
            {data.liveGeo.slice(0, 8).map((geo) => (
              <span 
                key={geo.country}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded text-[11px]"
              >
                <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                {geo.country}
                <span className="text-foreground font-medium tabular-nums">{geo.visitors}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div>
          <h4 className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Activity Stream</h4>
          <div className="space-y-0.5 max-h-28 overflow-y-auto">
            {data.recentActivity.slice(0, 8).map((activity, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center gap-2 text-[11px] py-0.5 animate-in slide-in-from-left-2",
                  i === 0 && "font-medium"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  activity.type === 'pageview' ? "bg-chart-1" :
                  activity.type === 'event' ? "bg-chart-4" :
                  activity.type === 'error' ? "bg-destructive" :
                  "bg-chart-2"
                )} />
                <span className="text-muted-foreground w-14 flex-shrink-0">{activity.type}</span>
                <span className="text-foreground truncate flex-1">{activity.path}</span>
                {activity.city && (
                  <span className="text-muted-foreground flex-shrink-0">{activity.city}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
