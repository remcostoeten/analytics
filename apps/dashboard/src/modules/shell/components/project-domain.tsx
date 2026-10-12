import { notFound } from "next/navigation";

import { findProject } from "@/modules/analytics/reads";

type Props = { project: string };

export async function ProjectDomain({ project }: Props) {
  const found = await findProject(project);
  if (!found) notFound();
  return <span className="font-mono text-xs text-muted">{found.domain}</span>;
}
