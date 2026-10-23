"use client";

import { notify } from "@remcostoeten/notifier";
import type { CreatedToken, TokenScope } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { ChoiceCards } from "@/shared/ui/choice-cards";
import { Field } from "@/shared/ui/field";
import { TagInput } from "@/shared/ui/tag-input";
import { createToken } from "../actions";
import { fieldErrors } from "../form";
import type { FieldErrors } from "../form";
import { expiresAtOf, projectIdsOf } from "../token-form";
import { KeyReveal } from "./key-reveal";

type Props = { projects: string[] };

type Draft = { name: string; scope: TokenScope; projectIds: string[]; expiresOn: string };

const empty: Draft = { name: "", scope: "read", projectIds: [], expiresOn: "" };

const scopes: { value: TokenScope; label: string; hint: string }[] = [
  { value: "read", label: "Read", hint: "Aggregates and visitor data of the listed projects." },
  { value: "sql", label: "SQL", hint: "Read, plus the SQL console where the project allows it." },
  {
    value: "admin",
    label: "Admin",
    hint: "Everything, including settings and, with no list, new projects.",
  },
];

export function CreateTokenForm({ projects }: Props) {
  const [draft, setDraft] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedToken | null>(null);

  if (created) {
    return (
      <div className="grid gap-4">
        <KeyReveal
          title={created.data.name}
          value={created.data.token}
          note="Send it as Authorization: Bearer. Shown once and stored as a hash."
        />
        <div>
          <Button variant="ghost" onClick={() => setCreated(null)}>
            Create another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid max-w-xl gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        const expiresAt = expiresAtOf(draft.expiresOn);
        const projectIds = projectIdsOf(draft.projectIds);
        const result = await createToken({
          name: draft.name.trim(),
          scope: draft.scope,
          ...(projectIds === null ? {} : { projectIds }),
          ...(expiresAt === null ? {} : { expiresAt }),
        });
        setBusy(false);
        if (!result.ok) {
          setErrors(fieldErrors(result.error));
          notify.error(result.error.message);
          return;
        }
        notify.success(`Created ${result.value.data.name}`);
        setDraft(empty);
        setCreated(result.value);
      }}
    >
      <Field label="Name" htmlFor="token-name" error={errors.name} hint="A label for people.">
        <input
          id="token-name"
          className="control"
          autoComplete="off"
          maxLength={128}
          placeholder="CI report"
          required
          value={draft.name}
          aria-invalid={errors.name ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </Field>
      <ChoiceCards
        name="token-scope"
        label="Scope"
        value={draft.scope}
        choices={scopes}
        onChange={(scope) => setDraft({ ...draft, scope })}
      />
      {errors.scope ? <p className="text-err text-xs">{errors.scope}</p> : null}
      <Field
        label="Projects"
        htmlFor="token-projects"
        error={errors.projectIds}
        hint="Type to pick a project. None allows every project."
      >
        <TagInput
          id="token-projects"
          values={draft.projectIds}
          placeholder="Every project"
          suggestions={projects}
          isValid={(id) => projects.length === 0 || projects.includes(id)}
          invalid={Boolean(errors.projectIds)}
          onChange={(projectIds) => setDraft({ ...draft, projectIds })}
        />
      </Field>
      <Field
        label="Expires on"
        htmlFor="token-expires"
        error={errors.expiresAt}
        hint="End of that day in UTC. Empty never expires."
      >
        <input
          id="token-expires"
          className="control max-w-48 font-mono"
          type="date"
          value={draft.expiresOn}
          aria-invalid={errors.expiresAt ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, expiresOn: event.target.value })}
        />
      </Field>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating" : "Create token"}
        </Button>
      </div>
    </form>
  );
}
