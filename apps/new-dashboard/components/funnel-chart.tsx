"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDown, TrendingDown, Target } from "lucide-react"

interface FunnelStep {
  name: string
  path: string
  visitors: number
  dropoff: number
  conversionRate: number
}

interface FunnelData {
  steps: FunnelStep[]
  overallConversion: number
}

interface FunnelChartProps {
  data: FunnelData | null
}

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data || !data.steps || data.steps.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No funnel data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxVisitors = Math.max(...data.steps.map(s => s.visitors))

  return (
    <Card className="border-border/50">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Conversion Funnel
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Overall conversion:</span>
            <span className="font-semibold text-emerald-500">{data.overallConversion}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {data.steps.map((step, index) => {
            const widthPercent = maxVisitors > 0 ? (step.visitors / maxVisitors) * 100 : 0
            const isLast = index === data.steps.length - 1
            
            return (
              <div key={step.path}>
                {/* Step Bar */}
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-semibold text-violet-400">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{step.name}</span>
                          <span className="text-xs text-muted-foreground">{step.path}</span>
                        </div>
                        <div className="text-sm font-semibold">{step.visitors.toLocaleString()}</div>
                      </div>
                      <div className="h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-3"
                          style={{ width: `${Math.max(widthPercent, 5)}%` }}
                        >
                          {widthPercent > 30 && (
                            <span className="text-xs font-medium text-white">
                              {step.conversionRate}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropoff indicator */}
                {!isLast && step.dropoff > 0 && (
                  <div className="flex items-center gap-3 ml-9 my-2">
                    <div className="flex-1 flex items-center gap-2 text-xs text-rose-400">
                      <ArrowDown className="h-3 w-3" />
                      <TrendingDown className="h-3 w-3" />
                      <span>{step.dropoff}% drop-off</span>
                      <div className="flex-1 h-px bg-rose-400/30" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{data.steps[0]?.visitors.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Entered</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{data.steps[data.steps.length - 1]?.visitors.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-emerald-500">{data.overallConversion}%</p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
