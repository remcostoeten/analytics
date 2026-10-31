"use client";

import type { PublicProject } from "@spoar/contract";
import { Link } from "@/shared/ui/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ComponentType, CSSProperties, SVGProps } from "react";

import { logPath, trafficOptions } from "@/modules/analytics/logs";
import { metricPath, metricView, metricViews } from "@/modules/analytics/metrics";
import { vitalView, vitalViews } from "@/modules/analytics/speed";

import { siteUrl } from "@/shared/config/site";
import { iconMotionHandlers } from "@/shared/ui/icon-motion";
import {
  BookIcon,
  BugIcon,
  ChartIcon,
  FolderIcon,
  GaugeIcon,
  GearIcon,
  ChevronDownIcon,
  GridIcon,
  HomeIcon,
  KeyIcon,
  ListIcon,
  PulseIcon,
  UsersIcon,
} from "@/shared/ui/icons";
import { Logo } from "@/shared/ui/logo";
import { Select } from "@/shared/ui/select";

import { SidebarToggle } from "./sidebar-toggle";

type Props = {
  projects: PublicProject[];
  isAdmin: boolean;
  isOwner: boolean;
  signedIn: boolean;
};

type SubItem = { label: string; hint?: string; href: string; active: boolean };

type Item = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active: boolean;
  children?: SubItem[];
};

type NavItemProps = { item: Item; open: boolean; onToggle: () => void };

const projectSections = ["overview", "speed", "issues", "realtime", "logs", "visitors", "sessions"];

export function currentProject(pathname: string) {
  const match = /^\/(?:admin\/)?projects\/([^/]+)/.exec(pathname);
  const id = match?.[1] ? decodeURIComponent(match[1]) : null;
  return id === "new" ? null : id;
}

export function SidebarFoot() {
  return (
    <div className="sidebar-foot">
      <a href={`${siteUrl()}/docs`} className="nav-item" {...iconMotionHandlers}>
        <BookIcon className="size-4 shrink-0 text-muted" />
        <span className="nav-label">Documentation</span>
      </a>
      <SidebarToggle />
    </div>
  );
}

function projectHue(id: string) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return hash;
}

function NavLink({ item }: { item: Item }) {
  const Glyph = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      className="nav-item"
      {...iconMotionHandlers}
    >
      <Glyph className="size-4 shrink-0 text-muted" />
      <span className="nav-label">{item.label}</span>
    </Link>
  );
}

function NavItem({ item, open, onToggle }: NavItemProps) {
  const children = item.children ?? [];
  if (children.length === 0) return <NavLink item={item} />;
  const id = `nav-sub-${item.label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <>
      <div className="nav-row">
        <NavLink item={item} />
        <button
          type="button"
          className="nav-expand"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`${open ? "Hide" : "Show"} ${item.label} pages`}
          onClick={onToggle}
        >
          <ChevronDownIcon className="size-3.5" />
        </button>
      </div>
      <div id={id} className="nav-sub" data-open={open} inert={!open}>
        <ul>
          {children.map((child, index) => (
            <li key={child.href}>
              <Link
                href={child.href}
                aria-current={child.active ? "page" : undefined}
                className="nav-sub-item"
                style={{ "--nav-index": index } as CSSProperties}
              >
                <span className="truncate">{child.label}</span>
                {child.hint ? <span className="nav-sub-hint">{child.hint}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function Sidebar({ projects, isAdmin, isOwner, signedIn }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [toggled, setToggled] = useState<{ [label: string]: boolean }>({});
  const project = currentProject(pathname);
  const encoded = project ? encodeURIComponent(project) : null;

  const workspace: Item[] = [
    { label: "Home", href: "/", icon: HomeIcon, active: pathname === "/" },
  ];
  if (encoded) {
    const projectPath = `/projects/${encoded}`;
    const segments = pathname.slice(projectPath.length).split("/");
    const section = segments[1] ?? "";
    const detail = segments[2];
    const analytics = pathname.startsWith(projectPath) && !projectSections.includes(section);
    const currentMetric = metricView(section === "" ? undefined : section);
    const currentVital = vitalView(detail);
    workspace.push(
      {
        label: "Overview",
        href: `${projectPath}/overview`,
        icon: GridIcon,
        active: section === "overview",
      },
      {
        label: "Web analytics",
        href: projectPath,
        icon: ChartIcon,
        active: analytics,
        children: metricViews.map((view) => ({
          label: view.label,
          href: metricPath(projectPath, view),
          active: analytics && view.slug === currentMetric.slug,
        })),
      },
      {
        label: "Speed",
        href: `${projectPath}/speed`,
        icon: GaugeIcon,
        active: section === "speed",
        children: vitalViews.map((view) => ({
          label: view.short,
          hint: view.label,
          href: `${projectPath}/speed/${view.slug}`,
          active: section === "speed" && view.slug === currentVital.slug,
        })),
      },
      {
        label: "Realtime",
        href: `${projectPath}/realtime`,
        icon: PulseIcon,
        active: section === "realtime",
      },
    );
    if (signedIn) {
      workspace.push(
        {
          label: "Logs",
          href: `${projectPath}/logs`,
          icon: ListIcon,
          active: section === "logs",
          children: trafficOptions.map((option) => ({
            label: option.label,
            href: logPath(projectPath, option.value),
            active: section === "logs" && (detail ?? "all") === option.value,
          })),
        },
        {
          label: "Issues",
          href: `${projectPath}/issues`,
          icon: BugIcon,
          active: section === "issues",
        },
        {
          label: "Visitors",
          href: `${projectPath}/visitors`,
          icon: UsersIcon,
          active: section === "visitors" || section === "sessions",
        },
      );
    }
    if (isAdmin) {
      workspace.push({
        label: "Settings",
        href: `/admin/projects/${encoded}`,
        icon: GearIcon,
        active: pathname === `/admin/projects/${encoded}`,
      });
    }
  }
  const manage: Item[] = [
    {
      label: "Projects",
      href: "/admin/projects",
      icon: FolderIcon,
      active: pathname === "/admin/projects" || pathname === "/admin/projects/new",
    },
    {
      label: "API tokens",
      href: "/admin/tokens",
      icon: KeyIcon,
      active: pathname === "/admin/tokens",
    },
    ...(isOwner
      ? [
          {
            label: "Members",
            href: "/admin/members",
            icon: UsersIcon,
            active: pathname === "/admin/members",
          },
        ]
      : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-panel">
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <Logo className="size-6" />
            <span className="nav-label text-sm font-medium">Spoar</span>
          </div>
          <div className="sidebar-switch">
            <Select
              variant="switcher"
              label="Project"
              value={project ?? ""}
              options={[
                { value: "", label: "All projects" },
                ...projects.map((entry) => ({ value: entry.id, label: entry.name })),
              ]}
              onChange={(next) => router.push(next ? `/projects/${encodeURIComponent(next)}` : "/")}
            />
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard">
          <ul>
            {workspace.map((item) => (
              <li key={item.href}>
                <NavItem
                  item={item}
                  open={toggled[item.label] ?? item.active}
                  onToggle={() =>
                    setToggled((current) => ({
                      ...current,
                      [item.label]: !(current[item.label] ?? item.active),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
          {projects.length > 0 ? (
            <div className="sidebar-group sidebar-projects">
              <p className="sidebar-group-label">Projects</p>
              <ul>
                {projects.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/projects/${encodeURIComponent(entry.id)}`}
                      aria-current={entry.id === project ? "true" : undefined}
                      className="nav-item nav-project"
                      title={entry.domain}
                    >
                      <span
                        className="nav-avatar"
                        style={{ "--avatar-hue": projectHue(entry.id) } as CSSProperties}
                        aria-hidden="true"
                      >
                        {entry.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="nav-label grid min-w-0">
                        <span className="truncate">{entry.name}</span>
                        <span className="nav-project-domain truncate">{entry.domain}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {isAdmin ? (
            <div className="sidebar-group">
              <p className="sidebar-group-label">Manage</p>
              <ul>
                {manage.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>

        <SidebarFoot />
      </div>
    </aside>
  );
}
