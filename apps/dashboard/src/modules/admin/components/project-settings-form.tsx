"use client";

import { notify } from "@remcostoeten/notifier";
import type { Project, UpdateProject } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { ChoiceCards } from "@/shared/ui/choice-cards";
import { Field } from "@/shared/ui/field";
import { SwitchRow } from "@/shared/ui/switch-row";
import { TagInput } from "@/shared/ui/tag-input";
import { updateProject } from "../actions";
import { fieldErrors, isOrigin, originOf, visibilityChoices } from "../form";
import type { FieldErrors } from "../form";

type Props = { project: Project };

type Draft = {
  name: string;
  visibility: Project["visibility"];
  allowedOrigins: string[];
  retentionDays: string;
  publicVisitorData: boolean;
  sqlEnabled: boolean;
  widgetReports: boolean;
  debugConsole: boolean;
};

function draftOf(project: Project): Draft {
  return {
    name: project.name,
    visibility: project.visibility,
    allowedOrigins: project.allowedOrigins,
    retentionDays: String(project.retentionDays),
    publicVisitorData: project.publicVisitorData,
    sqlEnabled: project.sqlEnabled,
    widgetReports: project.widgetReports,
    debugConsole: project.debugConsole,
  };
}

function changesOf(project: Project, draft: Draft): UpdateProject {
  const changes: UpdateProject = {};
  const name = draft.name.trim();
  if (name !== project.name) changes.name = name;
  if (draft.visibility !== project.visibility) changes.visibility = draft.visibility;
  if (draft.allowedOrigins.join("\n") !== project.allowedOrigins.join("\n"))
    changes.allowedOrigins = draft.allowedOrigins;
  const retention = Number(draft.retentionDays);
  if (retention !== project.retentionDays) changes.retentionDays = retention;
  if (draft.publicVisitorData !== project.publicVisitorData)
    changes.publicVisitorData = draft.publicVisitorData;
  if (draft.sqlEnabled !== project.sqlEnabled) changes.sqlEnabled = draft.sqlEnabled;
  if (draft.widgetReports !== project.widgetReports) changes.widgetReports = draft.widgetReports;
  if (draft.debugConsole !== project.debugConsole) changes.debugConsole = draft.debugConsole;
  return changes;
}

export function ProjectSettingsForm({ project }: Props) {
  const [draft, setDraft] = useState(() => draftOf(project));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const changes = changesOf(project, draft);
  const dirty = Object.keys(changes).length > 0;

  return (
    <form
      className="grid gap-7"
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
      <section className="grid gap-4">
        <h3 className="text-sm font-medium">General</h3>
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
        <ChoiceCards
          name="visibility"
          label="Visibility"
          value={draft.visibility}
          choices={visibilityChoices}
          onChange={(visibility) => setDraft({ ...draft, visibility })}
        />
        {errors.visibility ? <p className="text-err text-xs">{errors.visibility}</p> : null}
      </section>
      <section className="grid gap-4">
        <h3 className="text-sm font-medium">Ingest</h3>
        <Field
          label="Allowed origins"
          htmlFor="allowedOrigins"
          error={errors.allowedOrigins}
          hint="Press Enter after each origin, matched exactly. None accepts events from every origin."
        >
          <TagInput
            id="allowedOrigins"
            values={draft.allowedOrigins}
            placeholder="Every origin is accepted"
            normalize={originOf}
            isValid={isOrigin}
            invalid={Boolean(errors.allowedOrigins)}
            onChange={(allowedOrigins) => setDraft({ ...draft, allowedOrigins })}
          />
        </Field>
        <Field
          label="Retention"
          htmlFor="retentionDays"
          error={errors.retentionDays}
          hint="Events and sessions older than this are deleted by the cleanup job."
        >
          <div className="flex items-center gap-2">
            <input
              id="retentionDays"
              className="control max-w-28 font-mono"
              type="number"
              min={1}
              max={3650}
              required
              value={draft.retentionDays}
              aria-invalid={errors.retentionDays ? "true" : undefined}
              onChange={(event) => setDraft({ ...draft, retentionDays: event.target.value })}
            />
            <span className="text-muted text-sm">days</span>
          </div>
        </Field>
      </section>
      <section className="grid gap-3">
        <h3 className="text-sm font-medium">Access</h3>
        <div className="settings-group">
          <SwitchRow
            id="publicVisitorData"
            label="Public visitor data"
            hint="On a public project, anyone may also read events, visitors and sessions."
            checked={draft.publicVisitorData}
            onChange={(publicVisitorData) => setDraft({ ...draft, publicVisitorData })}
          />
          <SwitchRow
            id="sqlEnabled"
            label="SQL console"
            hint="Admins, analysts and sql tokens may run read-only SQL on this project."
            checked={draft.sqlEnabled}
            onChange={(sqlEnabled) => setDraft({ ...draft, sqlEnabled })}
          />
          <SwitchRow
            id="widgetReports"
            label="Widget reports"
            hint="Accept SDK outcome reports from the dev widget."
            checked={draft.widgetReports}
            onChange={(widgetReports) => setDraft({ ...draft, widgetReports })}
          />
          <SwitchRow
            id="debugConsole"
            label="Debug console"
            hint="Admins may open the debug console with Ctrl+Shift+K on sites that render <Analytics debugConsole />."
            checked={draft.debugConsole}
            onChange={(debugConsole) => setDraft({ ...draft, debugConsole })}
          />
        </div>
      </section>
      <div className="flex items-center gap-3 border-line border-t pt-4">
        <Button type="submit" disabled={busy || !dirty}>
          {busy ? "Saving" : "Save"}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setDraft(draftOf(project))}>
            Reset
          </Button>
        ) : null}
        {dirty ? <span className="text-muted ml-auto text-xs">Unsaved changes</span> : null}
      </div>
    </form>
  );
}
