"use client";

import { notify } from "@remcostoeten/notifier";
import type { CreatedProject, Visibility } from "@spoar/contract";
import { useState } from "react";

import { apiEndpoint } from "@/shared/api/endpoint";
import { Button } from "@/shared/ui/button";
import { Code } from "@/shared/ui/code";
import { CopyButton } from "@/shared/ui/copy-button";
import { Field } from "@/shared/ui/field";
import { createProject } from "../actions";
import { envBlock } from "../env-block";
import { defaultOrigins, fieldErrors, lines, suggestId } from "../form";
import type { FieldErrors } from "../form";
import { KeyReveal } from "./key-reveal";

type Draft = {
  domain: string;
  id: string;
  name: string;
  visibility: Visibility;
  allowedOrigins: string;
  idTouched: boolean;
  originsTouched: boolean;
};

const empty: Draft = {
  domain: "",
  id: "",
  name: "",
  visibility: "public",
  allowedOrigins: "",
  idTouched: false,
  originsTouched: false,
};

function Created({ project }: { project: CreatedProject }) {
  const env = envBlock({
    endpoint: apiEndpoint(),
    publicKey: project.data.publicKey,
    secretKey: project.data.secretKey,
  });
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        <b>{project.data.name}</b> is ready. The secret key below is shown once; rotate it from the
        project page if it is lost.
      </p>
      <KeyReveal
        title="Secret key"
        value={project.data.secretKey}
        note="For server-side ingest, sent as Authorization: Bearer. Stored as a hash."
      />
      <section className="card grid gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="caps">Environment</h2>
          <CopyButton value={env} />
        </div>
        <Code value={env} />
      </section>
    </div>
  );
}

export function CreateProjectForm() {
  const [draft, setDraft] = useState(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedProject | null>(null);

  if (created) return <Created project={created} />;

  function setDomain(domain: string) {
    setDraft((current) => ({
      ...current,
      domain,
      id: current.idTouched ? current.id : suggestId(domain),
      allowedOrigins: current.originsTouched
        ? current.allowedOrigins
        : defaultOrigins(domain).join("\n"),
    }));
  }

  return (
    <form
      className="grid max-w-xl gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        const result = await createProject({
          id: draft.id,
          name: draft.name.trim() || draft.domain.trim(),
          domain: draft.domain.trim(),
          visibility: draft.visibility,
          allowedOrigins: lines(draft.allowedOrigins),
        });
        setBusy(false);
        if (!result.ok) {
          setErrors(fieldErrors(result.error));
          notify.error(result.error.message);
          return;
        }
        notify.success(`Created ${result.value.data.id}`);
        setCreated(result.value);
      }}
    >
      <Field
        label="Domain"
        htmlFor="domain"
        error={errors.domain}
        hint="The site's host. The id and origins fill in from it."
      >
        <input
          id="domain"
          className="control"
          autoComplete="off"
          spellCheck={false}
          placeholder="example.com"
          required
          value={draft.domain}
          aria-invalid={errors.domain ? "true" : undefined}
          onChange={(event) => setDomain(event.target.value)}
        />
      </Field>
      <Field
        label="Project id"
        htmlFor="id"
        error={errors.id}
        hint="Lowercase letters, digits, dots and dashes. Used in every URL and cannot change."
      >
        <input
          id="id"
          className="control font-mono"
          autoComplete="off"
          spellCheck={false}
          pattern="[a-z0-9][a-z0-9.-]*"
          maxLength={64}
          required
          value={draft.id}
          aria-invalid={errors.id ? "true" : undefined}
          onChange={(event) => setDraft({ ...draft, id: event.target.value, idTouched: true })}
        />
      </Field>
      <Field label="Name" htmlFor="name" error={errors.name} hint="Defaults to the domain.">
        <input
          id="name"
          className="control"
          autoComplete="off"
          maxLength={128}
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
        hint="One origin per line. Empty accepts events from every origin."
      >
        <textarea
          id="allowedOrigins"
          className="control min-h-20 font-mono"
          spellCheck={false}
          placeholder="https://example.com"
          value={draft.allowedOrigins}
          aria-invalid={errors.allowedOrigins ? "true" : undefined}
          onChange={(event) =>
            setDraft({ ...draft, allowedOrigins: event.target.value, originsTouched: true })
          }
        />
      </Field>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
