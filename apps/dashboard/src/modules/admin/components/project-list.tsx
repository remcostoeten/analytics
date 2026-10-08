import type { Project } from "@spoar/contract";
import Link from "next/link";

type Props = { projects: Project[] };

export function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return <p className="caps text-muted py-8 text-center">No projects yet</p>;
  }
  return (
    <ul className="card divide-y divide-line">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/admin/projects/${encodeURIComponent(project.id)}`}
            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-bg"
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
