import type { ReactNode } from "react";

import { siteUrl } from "@/shared/config/site";
import { BookIcon } from "@/shared/ui/icons";
import { Logo } from "@/shared/ui/logo";

type BoneProps = { width?: number | string; height: number; className?: string };

type ChildProps = { children?: ReactNode };

const navRows = 9;

/**
 * @name Bone
 * @description One shimmering placeholder block with a fixed height, sized like the content it
 * stands in for.
 *
 * @example
 * <Bone width={110} height={28} />
 */
export function Bone({ width = "100%", height, className = "" }: BoneProps) {
  return (
    <span
      className={`skeleton block max-w-full shrink-0 ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * @name ListBones
 * @description Placeholder rows for a list whose rows are `rowHeight` tall with `gap` between them.
 *
 * @example
 * <ListBones rows={5} />
 */
export function ListBones({
  rows,
  rowHeight = 26,
  gap = 2,
}: {
  rows: number;
  rowHeight?: number;
  gap?: number;
}) {
  return (
    <span className="grid" style={{ gap }} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Bone key={index} height={rowHeight} />
      ))}
    </span>
  );
}

/**
 * @name ControlBones
 * @description The filter button and time range control row, before the URL is known.
 *
 * @example
 * <ControlBones />
 */
export function ControlBones({ children }: ChildProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex flex-wrap items-center gap-3">
        <Bone width={110} height={28} />
        {children}
      </span>
      <Bone width={174} height={32} />
    </div>
  );
}

/**
 * @name ChipBones
 * @description The filter chip row, which shows the bot filter by default.
 *
 * @example
 * <ChipBones />
 */
export function ChipBones() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bone width={184} height={28} />
    </div>
  );
}

/**
 * @name DomainBone
 * @description A placeholder for the project domain that sits on the title's baseline like the
 * real domain does.
 *
 * @example
 * <DomainBone />
 */
export function DomainBone() {
  return (
    <span className="skeleton font-mono text-xs text-transparent select-none" aria-hidden="true">
      example.com
    </span>
  );
}

/**
 * @name TitleBones
 * @description A page title and the project domain on one line, before the project is read. Both
 * placeholders are text, so they share the baseline the real title and domain sit on.
 *
 * @example
 * <TitleBones />
 */
export function TitleBones({ title, width = 300 }: { title?: string; width?: number }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h1 className="font-serif text-3xl tracking-tight">
        {title ?? (
          <span
            className="skeleton inline-block max-w-full text-transparent select-none"
            style={{ width }}
            aria-hidden="true"
          >
            Project
          </span>
        )}
      </h1>
      <DomainBone />
    </div>
  );
}

/**
 * @name PanelHeadBones
 * @description The tinted header of a project panel, with its title row and the given rows below.
 *
 * @example
 * <PanelHeadBones>
 *   <ControlBones />
 * </PanelHeadBones>
 */
export function PanelHeadBones({ children }: ChildProps) {
  return (
    <header className="panel-section panel-head grid gap-3">
      <TitleBones />
      {children}
    </header>
  );
}

/**
 * @name SectionHeadBones
 * @description A panel section heading with its one-line description.
 *
 * @example
 * <SectionHeadBones title="Routes" />
 */
export function SectionHeadBones({ title, action }: { title?: string; action?: boolean }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <span className="grid gap-1">
        {title ? (
          <h2 className="text-base font-semibold">{title}</h2>
        ) : (
          <Bone width={200} height={30} />
        )}
        <Bone width={420} height={20} />
      </span>
      {action ? <Bone width={96} height={28} /> : null}
    </header>
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
          <Bone height={34} />
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Dashboard">
        <ul>
          {Array.from({ length: navRows }, (_, index) => (
            <li key={index}>
              <span className="nav-item">
                <Bone width={16} height={16} />
                <Bone width={96} height={16} />
              </span>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-foot">
        <a href={`${siteUrl()}/docs`} className="nav-item">
          <BookIcon className="size-4 shrink-0 text-muted" />
          Documentation
        </a>
      </div>
    </aside>
  );
}
