import { startDebugtools } from "./loader/start";
import type { DebugtoolsOptions } from "./options";

export type { DebugtoolsOptions } from "./options";

/**
 * @name mount
 * @description Starts the debug console on any page, without React on the host: it checks for
 * an admin session and only then downloads the console, which brings its own React. Returns a
 * function that removes it.
 *
 * @example
 * const unmount = mount({ endpoint: "https://api.example.com", project: "site" });
 */
export function mount(options: DebugtoolsOptions): () => void {
  return startDebugtools(options, () =>
    import("./widget/mount-widget").then((widget) => widget.mountWidget),
  );
}
