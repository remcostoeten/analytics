import { noop } from "@spoar/shared/noop";

export type Account = {
  user: { login: string; name: string | null; avatarUrl: string | null };
  isAdmin: boolean;
  projects: { id: string; name: string }[];
  projectTotal: number;
};

const storageKey = "spoar:account";

/**
 * @name readStoredAccount
 * @description The account the last session check returned, or null when none was stored or
 * storage is unavailable. The landing nav paints it before the check resolves.
 *
 * @example
 * const account = readStoredAccount();
 */
export function readStoredAccount(): Account | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

/**
 * @name storeAccount
 * @description Remembers the account for the next visit, or forgets it when signed out.
 *
 * @example
 * storeAccount(null);
 */
export function storeAccount(account: Account | null) {
  try {
    if (account) localStorage.setItem(storageKey, JSON.stringify(account));
    else localStorage.removeItem(storageKey);
  } catch {
    noop();
  }
}

/**
 * @name fetchAccount
 * @description Asks the dashboard who the session cookie belongs to. Resolves to the account,
 * to null when signed out, and to undefined when the check itself failed.
 *
 * @example
 * const account = await fetchAccount(controller.signal);
 */
export async function fetchAccount(signal: AbortSignal): Promise<Account | null | undefined> {
  try {
    const response = await fetch("/dashboard/session", { credentials: "same-origin", signal });
    if (!response.ok) return undefined;
    const body = await response.json();
    return body.signedIn === true ? (body as Account) : null;
  } catch {
    return undefined;
  }
}
