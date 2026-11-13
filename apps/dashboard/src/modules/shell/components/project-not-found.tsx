"use client";

import { useParams } from "next/navigation";

import { useProject } from "@/modules/analytics/use-projects";
import { useSession } from "@/modules/session/use-session";
import { EmptyState, SearchIllustration } from "@/shared/ui/empty-state";
import { Link } from "@/shared/ui/link";

import { DocumentTitle } from "./document-title";

export function ProjectNotFound() {
  const { project } = useParams<{ project: string }>();
  const found = useProject(project);
  const session = useSession();
  const missing = found.status === "missing";
  const title = missing ? "Project not found" : "Page not found";

  return (
    <>
      <DocumentTitle title={title} />
      <EmptyState
        className="[--es-surface:var(--bg)]"
        size="lg"
        headingLevel="h1"
        title={title}
        description={
          missing ? (
            <>
              There is no project <code className="font-mono">{project}</code>
              {session.user ? " that you can read." : ". Sign in to see private projects."}
            </>
          ) : (
            "This project has no page at this address. The record may have been removed."
          )
        }
        illustration={<SearchIllustration />}
      >
        {missing ? (
          <Link href="/" className="solid-button">
            All projects
          </Link>
        ) : (
          <Link href={`/projects/${encodeURIComponent(project)}`} className="solid-button">
            Back to the project
          </Link>
        )}
        {missing && !session.user ? (
          <Link href="/sign-in" className="ghost-button">
            Sign in
          </Link>
        ) : null}
      </EmptyState>
    </>
  );
}
