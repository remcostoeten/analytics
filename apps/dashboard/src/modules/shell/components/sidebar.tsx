"use client";

import type { PublicProject } from "@spoar/contract";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { siteUrl } from "@/shared/config/site";
import {
  BookIcon,
  BugIcon,
  ChartIcon,
  FolderIcon,
  GaugeIcon,
  GearIcon,
  HomeIcon,
  KeyIcon,
  SelectorIcon,
} from "@/shared/ui/icons";
import { Logo } from "@/shared/ui/logo";

type Props = { projects: PublicProject[]; isAdmin: boolean; signedIn: boolean };

type Item = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active: boolean;
};

const projectSections = ["speed", "issues", "realtime", "visitors", "sessions"];

function currentProject(pathname: string) {
  const match = /^\/(?:admin\/)?projects\/([^/]+)/.exec(pathname);
  const id = match?.[1] ? decodeURIComponent(match[1]) : null;
  return id === "new" ? null : id;
}

function NavLink({ item }: { item: Item }) {
  const Glyph = item.icon;
  return (
    <Link href={item.href} aria-current={item.active ? "page" : undefined} className="nav-item">
      <Glyph className="size-4 shrink-0 text-muted" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ projects, isAdmin, signedIn }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const project = currentProject(pathname);
  const encoded = project ? encodeURIComponent(project) : null;

  const workspace: Item[] = [
    { label: "Home", href: "/", icon: HomeIcon, active: pathname === "/" },
  ];
  if (encoded) {
    const projectPath = `/projects/${encoded}`;
    const section = pathname.slice(projectPath.length).split("/")[1] ?? "";
    workspace.push(
      {
        label: "Web analytics",
        href: projectPath,
        icon: ChartIcon,
        active: pathname.startsWith(projectPath) && !projectSections.includes(section),
      },
      {
        label: "Speed",
        href: `${projectPath}/speed`,
        icon: GaugeIcon,
        active: section === "speed",
      },
    );
    if (signedIn) {
      workspace.push({
        label: "Issues",
        href: `${projectPath}/issues`,
        icon: BugIcon,
        active: section === "issues",
      });
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
  ];

  return (
    <aside className="sidebar">
      <div className="flex h-12 items-center gap-2 px-4">
        <Logo className="size-6" />
        <span className="text-sm font-medium">Spoar</span>
      </div>

      <div className="px-3 pb-2">
        <label className="sr-only" htmlFor="project-switcher">
          Project
        </label>
        <div className="relative">
          <select
            id="project-switcher"
            className="switcher"
            value={project ?? ""}
            onChange={(event) => {
              const next = event.target.value;
              router.push(next ? `/projects/${encodeURIComponent(next)}` : "/");
            }}
          >
            <option value="">All projects</option>
            {projects.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <SelectorIcon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <nav className="grid gap-4 px-3 py-2" aria-label="Dashboard">
        <ul className="grid gap-0.5">
          {workspace.map((item) => (
            <li key={item.href}>
              <NavLink item={item} />
            </li>
          ))}
        </ul>
        {isAdmin ? (
          <div className="grid gap-1">
            <p className="px-2 text-xs text-muted">Manage</p>
            <ul className="grid gap-0.5">
              {manage.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-line p-3">
        <a href={`${siteUrl()}/docs`} className="nav-item">
          <BookIcon className="size-4 shrink-0 text-muted" />
          Documentation
        </a>
      </div>
    </aside>
  );
}
