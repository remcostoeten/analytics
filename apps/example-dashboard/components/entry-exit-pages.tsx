"use client"

import { cn } from "@/lib/utils"
import { Inbox, LogIn, LogOut } from "lucide-react"
import { useState } from "react"

interface PageData {
  path: string
  count: number
}

interface EntryExitPagesData {
  entryPages: PageData[]
  exitPages: PageData[]
}

interface EntryExitPagesProps {
  data: EntryExitPagesData | null
  className?: string
}

export function EntryExitPages({ data, className }: EntryExitPagesProps) {
  const [activeTab, setActiveTab] = useState<'entry' | 'exit'>('entry')
  
  if (!data) {
    return (
      <div className={cn("bg-card border border-border rounded-sm", className)}>
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-xs font-medium text-foreground">Entry / Exit Pages</h3>
        </div>
        <div className="p-6 text-center">
          <Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-[11px] text-muted-foreground">No data available</p>
        </div>
      </div>
    )
  }
  
  const activeData = activeTab === 'entry' ? data.entryPages : data.exitPages
  const maxCount = Math.max(...activeData.map(p => p.count), 1)

  return (
    <div className={cn("bg-card border border-border rounded-sm", className)}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground">Entry / Exit Pages</h3>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('entry')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors",
            activeTab === 'entry' 
              ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 -mb-px bg-emerald-500/5" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LogIn className="h-3 w-3" />
          Entry Pages
        </button>
        <button
          onClick={() => setActiveTab('exit')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors",
            activeTab === 'exit' 
              ? "text-red-600 dark:text-red-400 border-b-2 border-red-500 -mb-px bg-red-500/5" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LogOut className="h-3 w-3" />
          Exit Pages
        </button>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {activeData.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-[10px] text-muted-foreground">No pages recorded</p>
          </div>
        ) : (
          activeData.slice(0, 8).map((page, i) => (
            <div key={page.path} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-foreground font-mono truncate max-w-[180px]">
                  {page.path}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {page.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full",
                    activeTab === 'entry' ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                  style={{ width: `${(page.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
