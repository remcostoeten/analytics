import type { Project } from "@spoar/contract";
import { Link } from "@/shared/ui/link";

import { EmptyState, ProjectIllustration } from "@/shared/ui/empty-state";

type Props = { projects: Project[] };

export function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <EmptyState
        className="[--es-surface:var(--bg)]"
        title="No projects yet"
        description="A project holds a site's events and the keys it sends them with."
        illustration={<ProjectIllustration />}
      >
        <Link href="/admin/projects/new" className="solid-button">
          Add a project
        </Link>
      </EmptyState>
    );
  }
  return (
    <ul className="card divide-y divide-line">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/admin/projects/${encodeURIComponent(project.id)}`}
            className="flex items-center justify-between gap-4 px-4 py-3 outline-none transition-colors hover:bg-bg focus-visible:bg-bg"
          >
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{project.name}</span>
              <span className="text-muted font-mono text-xs">{project.id}</span>
            </span>
            <span className="caps text-muted">
              {project.visibility} · {project.domain}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
