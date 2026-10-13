"use client";

import { useState } from "react";

import { formatCount } from "@/lib/format";
import type { ShowcaseProject } from "@/lib/showcase";

import { CountUp } from "./count-up";
import { ArrowUpRightIcon } from "./icons";
import { ProjectDialog } from "./project-dialog";
import { Change, Sparkline } from "./project-sparkline";

type Props = {
  project: ShowcaseProject;
  href: string;
  gradient: string;
};

export function ProjectCard({ project, href, gradient }: Props) {
  const values = project.series.map((point) => point.value);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="project-card group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5"
      >
        <span aria-hidden="true" className="project-card-glow" />
        <span className="relative flex items-start gap-3 p-5 pb-0">
          <span className="tile-glow flex size-10 shrink-0 items-center justify-center rounded-xl font-serif text-[1.15rem] text-white">
            {project.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-serif text-[1.15rem] leading-tight text-fg">
              {project.name}
            </span>
            <span className="flex items-center gap-1.5 truncate font-mono text-[0.68rem] text-muted">
              <span className="animate-live size-1.5 shrink-0 rounded-full bg-ok" />
              {project.domain}
            </span>
          </span>
          <ArrowUpRightIcon className="size-4 shrink-0 text-muted transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
        </span>
        <span className="relative mt-6 flex items-end justify-between gap-4 px-5">
          <span className="flex flex-col gap-1">
            <span className="flex items-baseline gap-2">
              {project.visitors === null ? (
                <span className="font-mono text-[2rem] leading-none font-medium text-fg tabular-nums">
                  ?
                </span>
              ) : (
                <CountUp
                  value={project.visitors}
                  className="font-mono text-[2rem] leading-none font-medium text-fg tabular-nums"
                />
              )}
              <Change value={project.change} />
            </span>
            <span className="text-[0.72rem] text-muted">visitors, 30 days</span>
          </span>
          {project.pageviews === null ? null : (
            <span className="flex flex-col items-end gap-1">
              <span className="font-mono text-[0.95rem] leading-none text-fg tabular-nums">
                {formatCount(project.pageviews)}
              </span>
              <span className="text-[0.72rem] text-muted">pageviews</span>
            </span>
          )}
        </span>
        <Sparkline values={values} gradient={gradient} />
      </button>
      {open ? (
        <ProjectDialog
          project={project}
          href={href}
          gradient={`${gradient}-detail`}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
