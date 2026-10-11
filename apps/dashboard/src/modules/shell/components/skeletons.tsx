import { Logo } from "@/shared/ui/logo";

type Props = { height: number };

const navRows = ["home", "analytics", "speed", "realtime"];
const railRows = ["visitors", "pageviews", "bounce", "duration"];

export function SectionSkeleton({ height }: Props) {
  return (
    <div className="panel-section" aria-hidden="true">
      <div className="skeleton" style={{ height }} />
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="panel-section panel-head grid gap-3" aria-hidden="true">
      <div className="skeleton h-9 w-72 max-w-full" />
      <div className="skeleton h-8 w-full" />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]"
      aria-busy="true"
    >
      <aside className="grid gap-6">
        <div className="rail" aria-hidden="true">
          {railRows.map((row) => (
            <div key={row} className="skeleton h-[104px]" />
          ))}
        </div>
      </aside>
      <div className="panel">
        <HeaderSkeleton />
        <SectionSkeleton height={380} />
        <SectionSkeleton height={200} />
      </div>
    </div>
  );
}

export function PanelSkeleton({ height }: Props) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6" aria-busy="true">
      <div className="panel">
        <HeaderSkeleton />
        <SectionSkeleton height={height} />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6" aria-busy="true">
      <div className="skeleton h-9 w-64" />
      <div className="skeleton h-[320px]" />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="sidebar" aria-busy="true">
      <div className="sidebar-head">
        <div className="sidebar-brand">
          <Logo className="size-6" />
          <span className="text-sm font-medium">Spoar</span>
        </div>
        <div className="sidebar-switch">
          <div className="skeleton h-8" />
        </div>
      </div>
      <div className="sidebar-nav grid gap-2">
        {navRows.map((row) => (
          <div key={row} className="skeleton h-7" />
        ))}
      </div>
    </aside>
  );
}
