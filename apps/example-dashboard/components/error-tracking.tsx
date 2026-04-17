"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Bug, Users, Clock, Monitor } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface ErrorGroup {
  message: string
  errorType: string | null
  path: string | null
  count: number
  affectedUsers: number
  firstSeen: string
  lastSeen: string
}

interface ErrorData {
  totalErrors: number
  uniqueErrors: number
  affectedUsers: number
  groups: ErrorGroup[]
  trend: { hour: string; errors: number }[]
  byDevice: { device: string; count: number }[]
}

interface ErrorTrackingProps {
  data: ErrorData | null
}

function formatTimeAgo(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return `${Math.floor(diffMins / 1440)}d ago`
}

export function ErrorTracking({ data }: ErrorTrackingProps) {
  if (!data) {
    return (
      <Card className="border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bug className="h-4 w-4 text-rose-500" />
            Error Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Loading error data...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Error Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50 bg-rose-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data.totalErrors}</p>
                <p className="text-xs text-muted-foreground">Total Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data.uniqueErrors}</p>
                <p className="text-xs text-muted-foreground">Unique Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{data.affectedUsers}</p>
                <p className="text-xs text-muted-foreground">Affected Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Trend */}
      {data.trend.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Error Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <XAxis 
                    dataKey="hour" 
                    tick={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelFormatter={(v) => new Date(v).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Groups */}
      <Card className="border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Error Messages</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.groups.slice(0, 10).map((error, i) => (
              <div 
                key={i}
                className={cn(
                  "p-3 rounded-lg border border-border/50 bg-muted/20",
                  error.count >= 10 && "border-rose-500/30 bg-rose-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-rose-400 truncate" title={error.message}>
                      {error.message || 'Unknown Error'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {error.path && <span>{error.path}</span>}
                      {error.errorType && (
                        <span className="px-1.5 py-0.5 bg-muted rounded">{error.errorType}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-rose-500">{error.count}</span>
                    <p className="text-xs text-muted-foreground">{error.affectedUsers} users</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    First: {formatTimeAgo(error.firstSeen)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last: {formatTimeAgo(error.lastSeen)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Errors by Device */}
      {data.byDevice.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Errors by Device/Browser
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {data.byDevice.map((device) => {
                const maxCount = Math.max(...data.byDevice.map(d => d.count))
                const width = maxCount > 0 ? (device.count / maxCount) * 100 : 0
                return (
                  <div key={device.device} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-muted-foreground truncate">{device.device}</span>
                    <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{device.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
