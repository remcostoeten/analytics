"use client";

import { notify } from "@remcostoeten/notifier";
import type { Project, UpdateProject } from "@spoar/contract";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { projectsKey } from "@/modules/analytics/use-projects";

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
  retentionEnabled: boolean;
  retentionDays: string;
  publicVisitorData: boolean;
  sqlEnabled: boolean;
  widgetReports: boolean;
  debugConsole: boolean;
  replayEnabled: boolean;
  llmEnabled: boolean;
};

function draftOf(project: Project): Draft {
  return {
    name: project.name,
    visibility: project.visibility,
    allowedOrigins: project.allowedOrigins,
    retentionEnabled: project.retentionEnabled,
    retentionDays: String(project.retentionDays),
    publicVisitorData: project.publicVisitorData,
    sqlEnabled: project.sqlEnabled,
    widgetReports: project.widgetReports,
    debugConsole: project.debugConsole,
    replayEnabled: project.replayEnabled,
    llmEnabled: project.llmEnabled,
  };
}

function changesOf(project: Project, draft: Draft): UpdateProject {
  const changes: UpdateProject = {};
  const name = draft.name.trim();
  if (name !== project.name) changes.name = name;
  if (draft.visibility !== project.visibility) changes.visibility = draft.visibility;
  if (draft.allowedOrigins.join("\n") !== project.allowedOrigins.join("\n"))
    changes.allowedOrigins = draft.allowedOrigins;
  if (draft.retentionEnabled !== project.retentionEnabled)
    changes.retentionEnabled = draft.retentionEnabled;
  const retention = Number(draft.retentionDays);
  if (draft.retentionEnabled && retention !== project.retentionDays)
    changes.retentionDays = retention;
  if (draft.publicVisitorData !== project.publicVisitorData)
    changes.publicVisitorData = draft.publicVisitorData;
  if (draft.sqlEnabled !== project.sqlEnabled) changes.sqlEnabled = draft.sqlEnabled;
  if (draft.widgetReports !== project.widgetReports) changes.widgetReports = draft.widgetReports;
  if (draft.debugConsole !== project.debugConsole) changes.debugConsole = draft.debugConsole;
  if (draft.replayEnabled !== project.replayEnabled) changes.replayEnabled = draft.replayEnabled;
  if (draft.llmEnabled !== project.llmEnabled) changes.llmEnabled = draft.llmEnabled;
  return changes;
}

export function ProjectSettingsForm({ project }: Props) {
  const [draft, setDraft] = useState(() => draftOf(project));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
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
        void queryClient.invalidateQueries({ queryKey: projectsKey });
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
          tip="Who can read this project's numbers. Public: anyone, even signed out, sees totals like page views. Private: only team members and tokens added to this project."
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
          tip="The websites allowed to send data to this project. An origin is the address a site loads from, like https://example.com. Data from any other address is turned away, so list every address your site uses, including the www version."
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
      </section>
      <section className="grid gap-3">
        <h3 className="text-sm font-medium">Data retention</h3>
        <div className="settings-group">
          <SwitchRow
            id="retentionEnabled"
            label="Automatic deletion"
            tip="Off keeps all of this project's data. On makes the cleanup and rollup jobs permanently delete its events, sessions, speed samples, logs and alert history older than the chosen number of days. Deleted data cannot be restored."
            hint="Off by default. Turning this on permanently deletes data older than the chosen days."
            checked={draft.retentionEnabled}
            onChange={(retentionEnabled) => setDraft({ ...draft, retentionEnabled })}
          />
        </div>
        {draft.retentionEnabled ? (
          <Field
            label="Keep data for"
            htmlFor="retentionDays"
            error={errors.retentionDays}
            hint="Data older than this is permanently deleted and cannot be restored."
          >
            <div className="flex items-center gap-2">
              <input
                id="retentionDays"
                className="control max-w-28 font-mono [--control-focus-background:color-mix(in_srgb,var(--accent)_10%,var(--surface))] [--control-focus-shadow:0_1px_2px_rgb(60_30_10/0.04)]"
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
        ) : null}
      </section>
      <section className="grid gap-3">
        <h3 className="text-sm font-medium">Access</h3>
        <div className="settings-group">
          <SwitchRow
            id="publicVisitorData"
            label="Public visitor data"
            tip="Only matters when the project is public. Off: the public sees totals only. On: anyone can also browse individual visits, visitors and sessions. Team members with detail access see them either way."
            hint="On a public project, anyone may also read events, visitors and sessions."
            checked={draft.publicVisitorData}
            onChange={(publicVisitorData) => setDraft({ ...draft, publicVisitorData })}
          />
          <SwitchRow
            id="sqlEnabled"
            label="SQL console"
            tip="Lets trusted people type their own questions about the data in a query language called SQL. It is read only, so nothing can be changed or deleted this way."
            hint="Admins, analysts and sql tokens may run read-only SQL on this project."
            checked={draft.sqlEnabled}
            onChange={(sqlEnabled) => setDraft({ ...draft, sqlEnabled })}
          />
          <SwitchRow
            id="debugConsole"
            label="Debug console"
            tip="A hidden panel on your own site for checking this project's data while you build: SQL queries and the events the project rejected. Admins of this project open it with Ctrl+Shift+K after signing in through a popup. The site must be listed in the project's allowed origins and render the debug console. Nobody else sees it. The SQL tab needs the SQL console switch on."
            hint="Admins may open the debug console with Ctrl+Shift+K on sites that render <Analytics debugConsole />. Its SQL tab needs the SQL console on."
            checked={draft.debugConsole}
            onChange={(debugConsole) => setDraft({ ...draft, debugConsole })}
          />
        </div>
      </section>
      <section className="grid gap-3">
        <h3 className="text-sm font-medium">Features</h3>
        <div className="settings-group">
          <SwitchRow
            id="replayEnabled"
            label="Session replay"
            tip="Records what visitors saw on your site so you can play a visit back next to its events. Needs the @spoar/replay package on the site, and a visitor's consent. Form inputs are hidden in recordings."
            hint="Off by default. While off, replay recordings are refused."
            checked={draft.replayEnabled}
            onChange={(replayEnabled) => setDraft({ ...draft, replayEnabled })}
          />
          <SwitchRow
            id="llmEnabled"
            label="LLM observability"
            tip="Stores the cost, duration and errors of the language model calls your app makes through @spoar/llm. Your provider key never leaves your app."
            hint="Off by default. While off, LLM call telemetry is refused."
            checked={draft.llmEnabled}
            onChange={(llmEnabled) => setDraft({ ...draft, llmEnabled })}
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
