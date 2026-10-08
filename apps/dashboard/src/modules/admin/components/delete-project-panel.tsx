"use client";

import { notify } from "@remcostoeten/notifier";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { removeProject } from "../actions";

type Props = { project: string; name: string };

export function DeleteProjectPanel({ project, name }: Props) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    const confirmed = await notify.confirm(
      `Delete ${name}? Its keys stop at once and every event, session and visitor is purged.`,
      { confirmLabel: "Delete", cancelLabel: "Keep" },
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await removeProject(project);
    setBusy(false);
    if (!result.ok) notify.error(result.error.message);
  }

  return (
    <section className="card grid gap-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="caps">Delete project</h2>
        <Button variant="danger" disabled={busy} onClick={remove}>
          {busy ? "Deleting" : "Delete"}
        </Button>
      </div>
      <p className="text-muted text-xs">
        Owner only. The id stays reserved until the cleanup job has purged the project's rows.
      </p>
    </section>
  );
}
