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
 * @name accountHintScript
 * @description Inline script for the landing pages that runs before the first paint. When a
 * stored account exists it marks the document with `data-account` and hands the avatar or the
 * initial to CSS, so the server-rendered nav shows the avatar slot instead of "Log in" until
 * hydration takes over.
 *
 * @example
 * <script dangerouslySetInnerHTML={{ __html: accountHintScript }} />
 */
export const accountHintScript = `try{var u=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})).user,r=document.documentElement,n=u.name||u.login;r.dataset.account="";if(/^https:/.test(u.avatarUrl))r.style.setProperty("--account-avatar","url("+JSON.stringify(u.avatarUrl)+")");else r.style.setProperty("--account-initial",JSON.stringify(n.slice(0,1).toUpperCase()))}catch(e){}`;

/**
 * @name clearAccountHint
 * @description Removes what `accountHintScript` set, once the nav renders the account itself.
 *
 * @example
 * clearAccountHint();
 */
export function clearAccountHint() {
  const root = document.documentElement;
  delete root.dataset.account;
  root.style.removeProperty("--account-avatar");
  root.style.removeProperty("--account-initial");
}

/**
 * @name sameAccount
 * @description Whether two session results describe the same account, so a check that returns
 * what the nav already shows does not render it again.
 *
 * @example
 * setAccount((current) => (sameAccount(current, next) ? current : next));
 */
export function sameAccount(left: Account | null, right: Account | null) {
  return JSON.stringify(left) === JSON.stringify(right);
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
