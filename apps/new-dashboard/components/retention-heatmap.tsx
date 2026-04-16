"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

interface RetentionData {
  cohorts: {
    cohort: string
    size: number
    retention: {
      week: number
      visitors: number
      rate: number
    }[]
  }[]
}

interface RetentionHeatmapProps {
  data: RetentionData | null
}

function getCellColor(rate: number): string {
  if (rate >= 80) return "bg-emerald-500"
  if (rate >= 60) return "bg-emerald-400"
  if (rate >= 40) return "bg-emerald-300"
  if (rate >= 20) return "bg-emerald-200"
  if (rate > 0) return "bg-emerald-100"
  return "bg-muted/30"
}

function getTextColor(rate: number): string {
  if (rate >= 40) return "text-white"
  return "text-foreground"
}

export function RetentionHeatmap({ data }: RetentionHeatmapProps) {
  if (!data || !data.cohorts || data.cohorts.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-500" />
            Retention Cohorts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Insufficient data for retention analysis
          </div>
        </CardContent>
      </Card>
    )
  }

  const weeks = ['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4']

  return (
    <Card className="border-border/50">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-500" />
          Retention Cohorts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Cohort</th>
                <th className="text-center py-2 px-2 text-muted-foreground font-medium">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    Size
                  </div>
                </th>
                {weeks.map(week => (
                  <th key={week} className="text-center py-2 px-2 text-muted-foreground font-medium">
                    {week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((cohort) => {
                const formattedDate = new Date(cohort.cohort).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
                
                return (
                  <tr key={cohort.cohort} className="border-t border-border/30">
                    <td className="py-2 px-2 font-medium text-foreground">{formattedDate}</td>
                    <td className="py-2 px-2 text-center text-muted-foreground">{cohort.size.toLocaleString()}</td>
                    {cohort.retention.map((week) => (
                      <td key={week.week} className="py-2 px-2">
                        <div 
                          className={cn(
                            "w-12 h-8 rounded flex items-center justify-center font-medium mx-auto transition-all",
                            getCellColor(week.rate),
                            getTextColor(week.rate)
                          )}
                        >
                          {week.rate > 0 ? `${week.rate}%` : '-'}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center gap-4">
          <span className="text-xs text-muted-foreground">Retention Rate:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted/30" />
            <span className="text-xs text-muted-foreground">0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-200" />
            <span className="text-xs text-muted-foreground">20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-400" />
            <span className="text-xs text-muted-foreground">60%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-500" />
            <span className="text-xs text-muted-foreground">80%+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
