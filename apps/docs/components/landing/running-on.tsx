import { apiEndpoint } from "@/lib/api-endpoint";
import { dashboardUrl } from "@/lib/dashboard-url";
import { readProjects } from "@/lib/showcase";

import { CodeWindow } from "./code-window";
import { ProjectCard } from "./project-card";
import { ProjectCarousel } from "./project-carousel";
import { RunningOnViews } from "./running-on-views";
import { stagger } from "./stagger";

export async function RunningOn() {
  const { projects, list } = await readProjects();
  if (projects.length === 0) return null;
  return (
    <section className="container-land py-14 sm:py-20">
      <RunningOnViews
        endpoint={`${apiEndpoint()}/v2/projects`}
        intro={
          <div className="max-w-md">
            <h2 className="font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
              Running on
            </h2>
            <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
              Every public project on the production API, with its visitors over the last 30 days.
              Projects are public by default, so anyone can read these numbers.
            </p>
          </div>
        }
        cards={
          <ProjectCarousel count={projects.length}>
            {projects.map((project, index) => (
              <li
                key={project.id}
                style={stagger(index)}
                className={`reveal w-[85%] shrink-0 snap-start ${projects.length > 3 ? "sm:w-[calc((100%-2rem)/2.25)] lg:w-[calc((100%-3rem)/3.25)]" : "sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"}`}
              >
                <ProjectCard
                  project={project}
                  href={dashboardUrl(`/projects/${encodeURIComponent(project.id)}`)}
                  gradient={`spark-${index}`}
                />
              </li>
            ))}
          </ProjectCarousel>
        }
        json={
          <CodeWindow title="GET /v2/projects" lang="json" code={JSON.stringify(list, null, 2)} />
        }
      />
    </section>
  );
}
