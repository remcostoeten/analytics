"use client"

import { X, ExternalLink, TrendingUp, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface ReferrerDetailPanelProps {
  domain: string | null
  timeRange: string
  onClose: () => void
  className?: string
}

export function ReferrerDetailPanel({ 
  domain, 
  timeRange,
  onClose, 
  className 
}: ReferrerDetailPanelProps) {
  const { data, isLoading } = useSWR(
    domain ? `/api/analytics?metric=referrer-detail&domain=${encodeURIComponent(domain)}&timeRange=${timeRange}` : null,
    fetcher
  )

  if (!domain) return null

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-xl z-50 flex flex-col",
        "animate-in slide-in-from-right-full duration-200",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
              alt=""
              className="w-4 h-4"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <div>
            <h2 className="text-sm font-medium text-foreground">{domain}</h2>
            <p className="text-[10px] text-muted-foreground">Referrer Analytics</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-20 bg-muted/50 rounded animate-pulse" />
            <div className="h-20 bg-muted/50 rounded animate-pulse" />
            <div className="h-32 bg-muted/50 rounded animate-pulse" />
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Visits"
                value={data.totalVisits?.toLocaleString() || "0"}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label="Unique Visitors"
                value={data.uniqueVisitors?.toLocaleString() || "0"}
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>

            {/* Traffic Share */}
            <div className="p-3 bg-muted/50 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Traffic Share</span>
                <span className="text-sm font-semibold text-foreground">
                  {(data.percentage || 0).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, data.percentage || 0)}%` }}
                />
              </div>
            </div>

            {/* Top Landing Pages */}
            {data.topLandingPages && data.topLandingPages.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Top Landing Pages from {domain}
                </label>
                <div className="space-y-1">
                  {data.topLandingPages.map((page: { path: string; visits: number }) => (
                    <div
                      key={page.path}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono text-foreground truncate">
                          {page.path}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                        {page.visits.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Link */}
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded hover:bg-muted transition-colors text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit {domain}
            </a>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No data available for this referrer</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  icon 
}: { 
  label: string
  value: string
  icon: React.ReactNode 
}) {
  return (
    <div className="p-3 bg-muted/50 rounded space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
