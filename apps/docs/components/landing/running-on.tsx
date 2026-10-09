import { apiEndpoint } from "@/lib/api-endpoint";
import { formatCount } from "@/lib/format";
import { readProjects, showcasePeriod } from "@/lib/showcase";

import { ArrowUpRightIcon } from "./icons";

export async function RunningOn() {
  const projects = await readProjects();
  if (projects.length === 0) return null;
  return (
    <section className="container-land py-14 sm:py-20">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-md">
          <h2 className="reveal font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
            Running on
          </h2>
          <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
            Every public project on the production API, with its visitors over the last 30 days.
            Projects are public by default, so anyone can read these numbers.
          </p>
        </div>
        <a
          href={`${apiEndpoint()}/v2/projects`}
          className="pill-dark w-fit px-5! py-2.5!"
          rel="noreferrer"
        >
          The list as JSON
        </a>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id} className="reveal">
            <a
              href={`${apiEndpoint()}/v2/projects/${encodeURIComponent(project.id)}/stats?period=${showcasePeriod}`}
              rel="noreferrer"
              className="visual-frame group flex h-full flex-col gap-5 rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex flex-col">
                  <span className="font-serif text-[1.15rem] text-fg">{project.name}</span>
                  <span className="font-mono text-[0.7rem] text-muted">{project.domain}</span>
                </span>
                <ArrowUpRightIcon className="size-4 shrink-0 text-muted transition-colors group-hover:text-fg" />
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-[1.6rem] font-medium text-fg tabular-nums">
                  {project.visitors === null ? "?" : formatCount(project.visitors)}
                </span>
                <span className="text-[0.75rem] text-muted">visitors, 30 days</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
