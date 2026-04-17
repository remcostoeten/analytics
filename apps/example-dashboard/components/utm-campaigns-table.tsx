"use client"

import { cn } from "@/lib/utils"
import { Inbox, ExternalLink } from "lucide-react"

interface UTMCampaign {
  source: string
  medium: string
  campaign: string
  visits: number
  visitors: number
  sessions: number
  percentage: number
}

interface UTMCampaignsTableProps {
  data: UTMCampaign[]
  className?: string
}

const sourceColors: Record<string, string> = {
  google: 'bg-red-500/15 text-red-600 dark:text-red-400',
  twitter: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  facebook: 'bg-blue-600/15 text-blue-700 dark:text-blue-300',
  linkedin: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  newsletter: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  email: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  direct: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

function getSourceColor(source: string): string {
  const lower = source.toLowerCase()
  for (const [key, color] of Object.entries(sourceColors)) {
    if (lower.includes(key)) return color
  }
  return 'bg-muted text-muted-foreground'
}

export function UTMCampaignsTable({ data, className }: UTMCampaignsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("bg-card border border-border rounded-sm", className)}>
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-xs font-medium text-foreground">UTM Campaigns</h3>
        </div>
        <div className="p-6 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">No campaign data available</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Add UTM parameters to your links to track campaigns
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-card border border-border rounded-sm", className)}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground">UTM Campaigns</h3>
        <span className="text-[10px] text-muted-foreground">
          {data.length} campaigns
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
                Source / Medium
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
                Campaign
              </th>
              <th className="px-3 py-1.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
                Visits
              </th>
              <th className="px-3 py-1.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
                %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.slice(0, 10).map((campaign, i) => (
              <tr key={i} className="hover:bg-muted/50 transition-colors">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium",
                      getSourceColor(campaign.source)
                    )}>
                      {campaign.source}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-foreground">{campaign.medium}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground truncate max-w-[120px]">
                      {campaign.campaign}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                  {campaign.visits.toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, campaign.percentage)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-muted-foreground w-10">
                      {campaign.percentage.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
