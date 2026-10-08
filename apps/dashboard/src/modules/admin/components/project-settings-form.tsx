"use client";

import { notify } from "@remcostoeten/notifier";
import type { Project, UpdateProject } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { updateProject } from "../actions";
import { fieldErrors, lines } from "../form";
import type { FieldErrors } from "../form";

type Props = { project: Project };

type Draft = {
  name: string;
  visibility: Project["visibility"];
  allowedOrigins: string;
  retentionDays: string;
  publicVisitorData: boolean;
  sqlEnabled: boolean;
  widgetReports: boolean;
};

function draftOf(project: Project): Draft {
  return {
    name: project.name,
    visibility: project.visibility,
    allowedOrigins: project.allowedOrigins.join("\n"),
    retentionDays: String(project.retentionDays),
    publicVisitorData: project.publicVisitorData,
    sqlEnabled: project.sqlEnabled,
    widgetReports: project.widgetReports,
  };
}

function changesOf(project: Project, draft: Draft): UpdateProject {
  const changes: UpdateProject = {};
  const name = draft.name.trim();
  if (name !== project.name) changes.name = name;
  if (draft.visibility !== project.visibility) changes.visibility = draft.visibility;
  const origins = lines(draft.allowedOrigins);
  if (origins.join("\n") !== project.allowedOrigins.join("\n")) changes.allowedOrigins = origins;
  const retention = Number(draft.retentionDays);
  if (retention !== project.retentionDays) changes.retentionDays = retention;
  if (draft.publicVisitorData !== project.publicVisitorData)
    changes.publicVisitorData = draft.publicVisitorData;
  if (draft.sqlEnabled !== project.sqlEnabled) changes.sqlEnabled = draft.sqlEnabled;
  if (draft.widgetReports !== project.widgetReports) changes.widgetReports = draft.widgetReports;
  return changes;
}

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 accent-accent"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="grid gap-0.5">
        <span className="text-sm">{label}</span>
        <span className="text-muted text-xs">{hint}</span>
      </span>
    </label>
  );
}

export function ProjectSettingsForm({ project }: Props) {
  const [draft, setDraft] = useState(() => draftOf(project));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const changes = changesOf(project, draft);
  const dirty = Object.keys(changes).length > 0;

  return (
    <form
      className="grid gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!dirty) return;
        setBusy(true);
        setErrors({});
        const result = await updateProject(project.id, changes);
        setBusy(false);
        if (!result.ok) {
          setErrors(fieldErrors(result.error));
          notify.error(result.error.message);
          return;
        }
        notify.success("Settings saved");
      }}
    >
      <Field label="Name" htmlFor="name" error={errors.name}>
        <input
          id="name"
          className="control"
          autoComplete="off"
          maxLength={128}
          required
          value={draft.name}
          aria-invalid={errors.name ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </Field>
      <Field label="Visibility" htmlFor="visibility" error={errors.visibility}>
        <select
          id="visibility"
          className="control"
          value={draft.visibility}
          onChange={(event) =>
            setDraft({
              ...draft,
              visibility: event.target.value === "private" ? "private" : "public",
            })
          }
        >
          <option value="public">public: anyone may read the aggregates</option>
          <option value="private">private: members and tokens only</option>
        </select>
      </Field>
      <Field
        label="Allowed origins"
        htmlFor="allowedOrigins"
        error={errors.allowedOrigins}
        hint="One origin per line, matched exactly. Empty accepts events from every origin."
      >
        <textarea
          id="allowedOrigins"
          className="control min-h-20 font-mono"
          spellCheck={false}
          placeholder="Every origin is accepted"
          value={draft.allowedOrigins}
          aria-invalid={errors.allowedOrigins ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, allowedOrigins: event.target.value })}
        />
      </Field>
      <Field
        label="Retention days"
        htmlFor="retentionDays"
        error={errors.retentionDays}
        hint="Events and sessions older than this are deleted by the cleanup job."
      >
        <input
          id="retentionDays"
          className="control max-w-32 font-mono"
          type="number"
          min={1}
          max={3650}
          required
          value={draft.retentionDays}
          aria-invalid={errors.retentionDays ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, retentionDays: event.target.value })}
        />
      </Field>
      <div className="grid gap-3">
        <Toggle
          id="publicVisitorData"
          label="Public visitor data"
          hint="On a public project, anyone may also read events, visitors and sessions."
          checked={draft.publicVisitorData}
          onChange={(publicVisitorData) => setDraft({ ...draft, publicVisitorData })}
        />
        <Toggle
          id="sqlEnabled"
          label="SQL console"
          hint="Admins, analysts and sql tokens may run read-only SQL on this project."
          checked={draft.sqlEnabled}
          onChange={(sqlEnabled) => setDraft({ ...draft, sqlEnabled })}
        />
        <Toggle
          id="widgetReports"
          label="Widget reports"
          hint="Accept SDK outcome reports from the dev widget."
          checked={draft.widgetReports}
          onChange={(widgetReports) => setDraft({ ...draft, widgetReports })}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? "Saving" : "Save"}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setDraft(draftOf(project))}>
            Reset
          </Button>
        ) : null}
      </div>
    </form>
  );
}
