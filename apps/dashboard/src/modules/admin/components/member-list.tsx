"use client";

import { notify } from "@remcostoeten/notifier";
import type { Member } from "@spoar/contract";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { formatDay } from "../token-form";
import { removeMember, updateMember } from "../actions";
import { avatarOf, formatSignIn, grantedRoleOf, inviteMessage, projectsOf } from "../member-form";
import { ProjectsField, projectsText } from "./projects-field";

type Props = { members: Member[] };

const roles = ["viewer", "analyst", "admin"];

export function MemberList({ members }: Props) {
  return (
    <ul className="card divide-y divide-line">
      {members.map((member) => (
        <MemberRow key={member.login} member={member} />
      ))}
    </ul>
  );
}

function MemberRow({ member }: { member: Member }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [everyProject, setEveryProject] = useState(member.projectIds === null);
  const [projects, setProjects] = useState(projectsText(member.projectIds));
  const owner = member.role === "owner";

  async function change(changes: Parameters<typeof updateMember>[1], done: string) {
    setBusy(true);
    const result = await updateMember(member.login, changes);
    setBusy(false);
    if (!result.ok) {
      notify.error(result.error.message);
      return false;
    }
    notify.success(done);
    return true;
  }

  async function remove() {
    const confirmed = await notify.confirm(
      `Remove ${member.login}? They are signed out and cannot sign in again.`,
      { confirmLabel: "Remove", cancelLabel: "Keep" },
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await removeMember(member.login);
    setBusy(false);
    if (!result.ok) {
      notify.error(result.error.message);
      return;
    }
    notify.success(`Removed ${member.login}`);
  }

  return (
    <li className="grid gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-3">
          <img
            src={avatarOf(member.login, member.githubId)}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full"
          />
          <span className="grid gap-0.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              {member.login}
              {member.joined ? null : <span className="caps text-accent">pending</span>}
            </span>
            <span className="text-muted font-mono text-xs">
              {member.projectIds === null
                ? "every project"
                : member.projectIds.length === 0
                  ? "no projects"
                  : member.projectIds.join(", ")}
              {" · added "}
              {formatDay(member.addedAt)}
              {" · last sign-in "}
              {formatSignIn(member.lastSignInAt)}
            </span>
          </span>
        </span>
        {owner ? (
          <span className="caps text-muted">owner</span>
        ) : (
          <span className="flex items-center gap-2">
            <select
              aria-label={`Role of ${member.login}`}
              className="control h-8 py-0"
              value={member.role}
              disabled={busy}
              onChange={(event) =>
                change({ role: grantedRoleOf(event.target.value) }, `Updated ${member.login}`)
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {member.joined ? null : <InviteButton login={member.login} />}
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(!editing)}>
              {editing ? "Close" : "Projects"}
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              Remove
            </Button>
          </span>
        )}
      </div>
      {editing && !owner ? (
        <div className="grid max-w-xl gap-3">
          <ProjectsField
            id={member.login}
            everyProject={everyProject}
            projects={projects}
            onChange={(next) => {
              setEveryProject(next.everyProject);
              setProjects(next.projects);
            }}
          />
          <div>
            <Button
              disabled={busy}
              onClick={async () => {
                const saved = await change(
                  { projectIds: projectsOf(everyProject, projects) },
                  `Updated ${member.login}`,
                );
                if (saved) setEditing(false);
              }}
            >
              {busy ? "Saving" : "Save projects"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function InviteButton({ login }: { login: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(inviteMessage(login, window.location.origin));
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : "Copy invite"}
    </Button>
  );
}
