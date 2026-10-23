import type { Nullable } from "@spoar/shared/semantic";

import { Field } from "@/shared/ui/field";

type Props = {
  id: string;
  everyProject: boolean;
  projects: string;
  error?: string;
  onChange: (next: { everyProject: boolean; projects: string }) => void;
};

export function ProjectsField({ id, everyProject, projects, error, onChange }: Props) {
  return (
    <Field
      label="Projects"
      htmlFor={`${id}-projects`}
      error={error}
      hint="One project id per line. A member sees nothing until a project is listed."
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={everyProject}
          onChange={(event) => onChange({ everyProject: event.target.checked, projects })}
        />
        Every project
      </label>
      <textarea
        id={`${id}-projects`}
        className="control min-h-20 font-mono disabled:opacity-50"
        spellCheck={false}
        placeholder="docs"
        disabled={everyProject}
        value={projects}
        aria-invalid={error ? "true" : undefined}
        onChange={(event) => onChange({ everyProject, projects: event.target.value })}
      />
    </Field>
  );
}

export function projectsText(projectIds: Nullable<string[]>) {
  return projectIds === null ? "" : projectIds.join("\n");
}
