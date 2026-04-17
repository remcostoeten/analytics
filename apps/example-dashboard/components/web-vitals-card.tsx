"use client"

import { cn } from "@/lib/utils"
import { Inbox } from "lucide-react"

interface VitalMetric {
  avg: number
  p75?: number
  unit: string
}

interface WebVitalsData {
  ttfb: VitalMetric
  fcp: VitalMetric
  lcp: VitalMetric
  cls: VitalMetric
  inp: VitalMetric
  sampleCount: number
}

interface WebVitalsCardProps {
  data: WebVitalsData | null
  className?: string
}

// Thresholds based on Core Web Vitals standards
const thresholds = {
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
}

function getVitalStatus(metric: keyof typeof thresholds, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = thresholds[metric]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

const statusColors = {
  good: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  'needs-improvement': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  poor: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
}

const statusBgColors = {
  good: 'bg-emerald-500',
  'needs-improvement': 'bg-amber-500',
  poor: 'bg-red-500',
}

function VitalItem({ 
  label, 
  shortLabel,
  value, 
  p75,
  unit, 
  metric 
}: { 
  label: string
  shortLabel: string
  value: number
  p75?: number
  unit: string
  metric: keyof typeof thresholds
}) {
  const status = getVitalStatus(metric, value)
  const t = thresholds[metric]
  const percentage = Math.min(100, (value / t.poor) * 100)
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "inline-flex items-center justify-center w-8 h-4 text-[9px] font-bold rounded border",
            statusColors[status]
          )}>
            {shortLabel}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {metric === 'cls' ? value.toFixed(3) : Math.round(value)}{unit}
          </span>
          {p75 !== undefined && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              p75: {metric === 'cls' ? p75.toFixed(3) : Math.round(p75)}{unit}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full flex">
          <div 
            className={cn("h-full transition-all", statusBgColors[status])}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>0</span>
        <span className="text-emerald-600 dark:text-emerald-400">{metric === 'cls' ? t.good : t.good + 'ms'}</span>
        <span className="text-amber-600 dark:text-amber-400">{metric === 'cls' ? t.poor : t.poor + 'ms'}</span>
      </div>
    </div>
  )
}

export function WebVitalsCard({ data, className }: WebVitalsCardProps) {
  if (!data || data.sampleCount === 0) {
    return (
      <div className={cn("bg-card border border-border rounded-sm", className)}>
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-medium text-foreground">Core Web Vitals</h3>
        </div>
        <div className="p-6 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">No performance data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-card border border-border rounded-sm", className)}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground">Core Web Vitals</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {data.sampleCount.toLocaleString()} samples
        </span>
      </div>
      <div className="p-3 space-y-4">
        <VitalItem 
          label="Time to First Byte"
          shortLabel="TTFB"
          value={data.ttfb.avg}
          unit="ms"
          metric="ttfb"
        />
        <VitalItem 
          label="First Contentful Paint"
          shortLabel="FCP"
          value={data.fcp.avg}
          p75={data.fcp.p75}
          unit="ms"
          metric="fcp"
        />
        <VitalItem 
          label="Largest Contentful Paint"
          shortLabel="LCP"
          value={data.lcp.avg}
          p75={data.lcp.p75}
          unit="ms"
          metric="lcp"
        />
        <VitalItem 
          label="Cumulative Layout Shift"
          shortLabel="CLS"
          value={data.cls.avg}
          unit=""
          metric="cls"
        />
        <VitalItem 
          label="Interaction to Next Paint"
          shortLabel="INP"
          value={data.inp.avg}
          p75={data.inp.p75}
          unit="ms"
          metric="inp"
        />
      </div>
    </div>
  )
}
