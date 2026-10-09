import { Logo } from "@/components/logo";
import { apiEndpoint } from "@/lib/api-endpoint";
import { dashboardUrl } from "@/lib/dashboard-url";
import { readShowcase } from "@/lib/showcase";

import { DashboardPanel } from "./dashboard-panel";
import { ArrowUpRightIcon } from "./icons";

const nav = ["Overview", "Pages", "Sources", "Events", "Web Vitals", "Errors", "SQL"];

export async function LiveDashboard() {
  const showcase = await readShowcase();
  return (
    <div className="panel-rise relative grid w-full grid-cols-1 overflow-hidden rounded-t-xl border border-b-0 border-line bg-surface text-left shadow-[0_30px_60px_-30px_rgb(var(--shade)/0.35)] sm:grid-cols-[168px_1fr]">
      <aside className="hidden flex-col gap-4 border-r border-line bg-bg/60 p-3 sm:flex">
        <a
          href={dashboardUrl(`/admin/projects/${encodeURIComponent(showcase.project)}`)}
          rel="noreferrer"
          title="Open this project in the dashboard"
          className="group flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5 transition-colors duration-200 hover:border-fg/20"
        >
          <Logo className="size-4" />
          <span className="truncate text-[0.72rem] font-medium text-fg">{showcase.project}</span>
          <ArrowUpRightIcon className="ml-auto size-3 shrink-0 text-muted transition-colors group-hover:text-fg" />
        </a>
        <ul className="flex flex-col gap-0.5">
          {nav.map((item, index) => (
            <li
              key={item}
              className={`rounded-md px-2 py-1.5 text-[0.7rem] ${index === 0 ? "bg-fg/6 font-medium text-fg" : "text-muted"}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <DashboardPanel endpoint={apiEndpoint()} showcase={showcase} />
    </div>
  );
}
