"use client";

import { notify } from "@remcostoeten/notifier";
import type { GithubProfile } from "@spoar/contract";
import { useEffect, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field } from "@/shared/ui/field";
import { addMember, lookupGithubLogin } from "../actions";
import { fieldErrors } from "../form";
import type { FieldErrors } from "../form";
import { grantedRoleOf, isLogin, loginOf, projectsOf } from "../member-form";
import { ProjectsField } from "./projects-field";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "found"; profile: GithubProfile }
  | { state: "missing" }
  | { state: "failed"; message: string };

const roles = [
  { value: "viewer", label: "viewer: aggregates of the listed projects" },
  { value: "analyst", label: "analyst: adds visitor-level data and SQL" },
  { value: "admin", label: "admin: also changes the listed projects" },
];

const lookupDelayMs = 400;

export function AddMemberForm() {
  const [login, setLogin] = useState("");
  const [role, setRole] = useState("viewer");
  const [everyProject, setEveryProject] = useState(false);
  const [projects, setProjects] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const typed = loginOf(login);
    if (typed === "" || !isLogin(typed)) {
      setCheck({ state: "idle" });
      return;
    }
    let current = true;
    setCheck({ state: "checking" });
    const timer = setTimeout(async () => {
      const result = await lookupGithubLogin(typed);
      if (!current) return;
      if (result.ok) setCheck({ state: "found", profile: result.value.data });
      else if (result.error.code === "NOT_FOUND") setCheck({ state: "missing" });
      else setCheck({ state: "failed", message: result.error.message });
    }, lookupDelayMs);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [login]);

  const typed = loginOf(login);
  const shapeError = typed !== "" && !isLogin(typed) ? "That is not a GitHub login." : undefined;
  const checkError =
    check.state === "missing"
      ? "GitHub has no user with that login."
      : check.state === "failed"
        ? check.message
        : undefined;

  return (
    <form
      className="grid max-w-xl gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        const result = await addMember({
          login: typed,
          role: grantedRoleOf(role),
          projectIds: projectsOf(everyProject, projects),
        });
        setBusy(false);
        if (!result.ok) {
          setErrors(fieldErrors(result.error));
          notify.error(result.error.message);
          return;
        }
        notify.success(`Allowed ${result.value.data.login}`);
        setLogin("");
        setRole("viewer");
        setEveryProject(false);
        setProjects("");
        setCheck({ state: "idle" });
      }}
    >
      <Field
        label="GitHub login"
        htmlFor="member-login"
        error={errors.login ?? shapeError ?? checkError}
        hint="A login or a profile link. GitHub confirms it exists."
      >
        <input
          id="member-login"
          className="control font-mono"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="octocat"
          required
          value={login}
          aria-invalid={errors.login || shapeError || checkError ? "true" : undefined}
          onChange={(event) => setLogin(event.target.value)}
        />
        <LoginCheck check={check} />
      </Field>
      <Field label="Role" htmlFor="member-role" error={errors.role}>
        <select
          id="member-role"
          className="control"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <ProjectsField
        id="member"
        everyProject={everyProject}
        projects={projects}
        error={errors.projectIds}
        onChange={(next) => {
          setEveryProject(next.everyProject);
          setProjects(next.projects);
        }}
      />
      <div>
        <Button type="submit" disabled={busy || check.state !== "found"}>
          {busy ? "Allowing" : "Allow sign-in"}
        </Button>
      </div>
    </form>
  );
}

function LoginCheck({ check }: { check: Check }) {
  if (check.state === "checking") {
    return <p className="text-muted text-xs">Asking GitHub</p>;
  }
  if (check.state !== "found") return null;
  const { profile } = check;
  return (
    <p className="flex items-center gap-2 text-sm">
      <img src={profile.avatarUrl} alt="" width={24} height={24} className="size-6 rounded-full" />
      <span>
        <b className="font-medium">{profile.login}</b>
        {profile.name ? <span className="text-muted"> · {profile.name}</span> : null}
      </span>
    </p>
  );
}
