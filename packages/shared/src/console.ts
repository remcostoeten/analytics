import { noop } from "./noop";
import type { Nullable, Timestamp } from "./semantic";

export type ConsoleGrant = {
  project: string;
  token: string;
  expiresAt: Timestamp;
};

const grantKey = "spoar.console.grant";
const armedKey = "spoar.console";
const marginMs = 30_000;

function local(): Nullable<Storage> {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function tab(): Nullable<Storage> {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/**
 * @name readConsoleGrant
 * @description The widget grant this tab holds for the site, while it has more than 30 seconds
 * left, from `sessionStorage`. Gives null without one, after it expired, or where storage is
 * blocked.
 *
 * @example
 * const grant = readConsoleGrant(new Date());
 */
export function readConsoleGrant(now: Date): Nullable<ConsoleGrant> {
  try {
    // Only this module writes the key; the fields are checked below before use.
    const stored = JSON.parse(tab()?.getItem(grantKey) ?? "null") as Partial<ConsoleGrant> | null;
    const { project, token, expiresAt } = stored ?? {};
    if (!project || !token || !expiresAt) return null;
    return Date.parse(expiresAt) - now.getTime() < marginMs ? null : { project, token, expiresAt };
  } catch {
    return null;
  }
}

/**
 * @name saveConsoleGrant
 * @description Keeps a widget grant in this tab's `sessionStorage`, so a reload reopens the
 * console without asking the API again until it expires.
 *
 * @example
 * saveConsoleGrant({ project: "site", token: "wt_x", expiresAt: "2026-10-20T12:15:00.000Z" });
 */
export function saveConsoleGrant(grant: ConsoleGrant): void {
  try {
    tab()?.setItem(grantKey, JSON.stringify(grant));
  } catch {
    noop();
  }
}

/**
 * @name isConsoleArmed
 * @description Whether this browser opened the debug console on this site before, read from
 * `localStorage`. Only an armed browser asks the API on page load; every other visitor never does.
 *
 * @example
 * if (isConsoleArmed()) start();
 */
export function isConsoleArmed(): boolean {
  return Boolean(local()?.getItem(armedKey));
}

/**
 * @name armConsole
 * @description Marks this browser as one that opened the debug console for the project.
 *
 * @example
 * armConsole("remcostoeten.nl");
 */
export function armConsole(project: string): void {
  try {
    local()?.setItem(armedKey, project);
  } catch {
    noop();
  }
}

/**
 * @name disarmConsole
 * @description Forgets that this browser opened the debug console, after the API refused it, so
 * later page loads stop asking.
 *
 * @example
 * disarmConsole();
 */
export function disarmConsole(): void {
  try {
    local()?.removeItem(armedKey);
  } catch {
    noop();
  }
}
