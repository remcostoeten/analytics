"use client";

import { noop } from "@spoar/shared/noop";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { storeAccount } from "@/lib/account";
import type { Account } from "@/lib/account";
import { dashboardUrl } from "@/lib/dashboard-url";

type Props = {
  account: Account;
  onSignedOut: () => void;
};

type Entry = { id: string; label: string; href?: string; projects?: boolean };

const apiEndpoint = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.analytics.remcostoeten.nl"
).replace(/\/+$/, "");

const itemClass =
  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.85rem] text-fg transition-colors hover:bg-fg/5 focus-visible:bg-fg/5 focus-visible:outline-none";
const hintClass = "ml-auto rounded border border-line px-1.5 text-[0.68rem] text-fg/50";

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

function entriesOf(account: Account): Entry[] {
  const admin = account.isAdmin;
  return [
    { id: "dashboard", label: "Dashboard", href: dashboardUrl() },
    ...(admin
      ? [{ id: "settings", label: "Settings", href: dashboardUrl("/admin/projects") }]
      : []),
    ...(admin
      ? [{ id: "create", label: "Create project", href: dashboardUrl("/admin/projects/new") }]
      : []),
    ...(account.projects.length > 0
      ? [{ id: "projects", label: "Go to project", projects: true }]
      : []),
    ...(admin ? [{ id: "members", label: "Members", href: dashboardUrl("/admin/members") }] : []),
    ...(admin ? [{ id: "tokens", label: "API tokens", href: dashboardUrl("/admin/tokens") }] : []),
    { id: "docs", label: "Documentation", href: "/docs/getting-started/quick-start" },
  ];
}

function projectEntries(account: Account): Entry[] {
  const more: Entry = account.isAdmin
    ? { id: "more", label: "View all projects", href: dashboardUrl("/admin/projects") }
    : { id: "more", label: "View all projects", href: dashboardUrl() };
  const listed = account.projects.map((project) => ({
    id: project.id,
    label: project.name,
    href: dashboardUrl(`/projects/${encodeURIComponent(project.id)}`),
  }));
  return account.projectTotal > account.projects.length || account.isAdmin
    ? [...listed, more]
    : listed;
}

/**
 * @name AccountMenu
 * @description The signed-in user's avatar in the landing nav and the menu behind it: dashboard
 * links, a project picker and sign out. Every entry has a number, fired with Shift plus that
 * digit from anywhere on the page, and Shift+D signs out. Inside the menu the arrow keys move,
 * Right opens the project list and Left or Escape closes it.
 *
 * @example
 * <AccountMenu account={account} onSignedOut={() => setAccount(null)} />
 */
export function AccountMenu({ account, onSignedOut }: Props) {
  const [open, setOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const entries = useMemo(() => entriesOf(account), [account]);
  const projects = useMemo(() => projectEntries(account), [account]);
  const name = account.user.name ?? account.user.login;

  async function signOut() {
    try {
      await fetch(`${apiEndpoint}/v2/auth/sign-out`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
    } catch {
      noop();
    }
    storeAccount(null);
    onSignedOut();
  }

  function go(entry: Entry) {
    if (entry.projects) {
      setOpen(true);
      setProjectsOpen(true);
      return;
    }
    if (entry.href) location.assign(entry.href);
  }

  function focusItems(position: "first" | "last" | number) {
    const items = root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items || items.length === 0) return;
    const index = position === "first" ? 0 : position === "last" ? items.length - 1 : position;
    items[Math.max(0, Math.min(index, items.length - 1))].focus();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
      if (isTyping(event.target)) return;
      if (event.code === "KeyD") {
        event.preventDefault();
        void signOut();
        return;
      }
      const digit = /^Digit([1-9])$/.exec(event.code);
      if (!digit) return;
      const list = open && projectsOpen ? projects : entries;
      const entry = list[Number(digit[1]) - 1];
      if (!entry) return;
      event.preventDefault();
      go(entry);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
      setProjectsOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function onMenuKey(event: React.KeyboardEvent) {
    const items = Array.from(
      root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") focusItems(index + 1 >= items.length ? "first" : index + 1);
    else if (event.key === "ArrowUp") focusItems(index <= 0 ? "last" : index - 1);
    else if (event.key === "Home") focusItems("first");
    else if (event.key === "End") focusItems("last");
    else if (event.key === "ArrowRight" && document.activeElement?.id === `${menuId}-projects`) {
      setProjectsOpen(true);
      requestAnimationFrame(() => focusItems(index + 1));
    } else if (event.key === "ArrowLeft" && projectsOpen) {
      setProjectsOpen(false);
      document.getElementById(`${menuId}-projects`)?.focus();
    } else if (event.key === "Escape") {
      if (projectsOpen) {
        setProjectsOpen(false);
        document.getElementById(`${menuId}-projects`)?.focus();
      } else {
        setOpen(false);
        trigger.current?.focus();
      }
    } else if (event.key === "Tab") {
      setOpen(false);
      setProjectsOpen(false);
      return;
    } else return;
    event.preventDefault();
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        onClick={() => {
          setOpen((value) => !value);
          setProjectsOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => focusItems("first"));
        }}
        className="pill-ghost size-8 overflow-hidden px-0! text-[0.75rem] font-medium"
      >
        {account.user.avatarUrl ? (
          <img src={account.user.avatarUrl} alt="" className="size-6 rounded-full" />
        ) : (
          <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        )}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="nav-popover animate-menu-in absolute top-[calc(100%+12px)] right-0 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-20px_rgb(var(--shade)/0.35)]"
        >
          <div className="px-3 py-2">
            <p className="truncate text-[0.85rem] font-medium text-fg">{name}</p>
            <p className="truncate text-[0.75rem] text-fg/50">@{account.user.login}</p>
          </div>
          <hr className="my-1 border-line" />
          {entries.map((entry, index) => (
            <div key={entry.id}>
              {entry.projects ? (
                <button
                  id={`${menuId}-projects`}
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={projectsOpen}
                  onClick={() => setProjectsOpen((value) => !value)}
                  className={itemClass}
                >
                  {entry.label}
                  <span aria-hidden="true" className="text-fg/50">
                    {projectsOpen ? "▾" : "▸"}
                  </span>
                  <kbd className={hintClass}>⇧{index + 1}</kbd>
                </button>
              ) : (
                <a role="menuitem" href={entry.href} className={itemClass}>
                  {entry.label}
                  <kbd className={hintClass}>⇧{index + 1}</kbd>
                </a>
              )}
              {entry.projects && projectsOpen ? (
                <div
                  role="group"
                  aria-label="Projects"
                  className="mt-0.5 mb-1 ml-3 border-l border-line pl-1"
                >
                  {projects.map((project, projectIndex) => (
                    <a key={project.id} role="menuitem" href={project.href} className={itemClass}>
                      <span className="truncate">{project.label}</span>
                      <kbd className={hintClass}>⇧{projectIndex + 1}</kbd>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <hr className="my-1 border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className={itemClass}
          >
            Log out
            <kbd className={hintClass}>⇧D</kbd>
          </button>
        </div>
      ) : null}
    </div>
  );
}
