"use client";

import { notify } from "@remcostoeten/notifier";
import type { CreatedToken, TokenScope } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { createToken } from "../actions";
import { fieldErrors } from "../form";
import type { FieldErrors } from "../form";
import { expiresAtOf, projectIdsOf } from "../token-form";
import { KeyReveal } from "./key-reveal";

type Draft = { name: string; scope: TokenScope; projectIds: string; expiresOn: string };

const empty: Draft = { name: "", scope: "read", projectIds: "", expiresOn: "" };

const scopes: { value: TokenScope; label: string }[] = [
  { value: "read", label: "read: aggregates and visitor data of the listed projects" },
  { value: "sql", label: "sql: read, plus the SQL console where the project allows it" },
  {
    value: "admin",
    label: "admin: everything, including settings and, with no list, new projects",
  },
];

function scopeOf(value: string): TokenScope {
  return value === "sql" || value === "admin" ? value : "read";
}

export function CreateTokenForm() {
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
      <Field label="Scope" htmlFor="token-scope" error={errors.scope}>
        <select
          id="token-scope"
          className="control"
          value={draft.scope}
          onChange={(event) => setDraft({ ...draft, scope: scopeOf(event.target.value) })}
        >
          {scopes.map((scope) => (
            <option key={scope.value} value={scope.value}>
              {scope.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Projects"
        htmlFor="token-projects"
        error={errors.projectIds}
        hint="One project id per line. Empty allows every project."
      >
        <textarea
          id="token-projects"
          className="control min-h-20 font-mono"
          spellCheck={false}
          placeholder="Every project"
          value={draft.projectIds}
          aria-invalid={errors.projectIds ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, projectIds: event.target.value })}
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
