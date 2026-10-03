import { startDevtools } from "./loader/start";
import type { DevtoolsOptions } from "./options";

export type { DevtoolsOptions } from "./options";

/**
 * @name mount
 * @description Starts the dev widget on any page, without React on the host: it checks for an
 * admin session and only then downloads the panel, which brings its own React. Returns a
 * function that removes the widget.
 *
 * @example
 * const unmount = mount({ endpoint: "https://api.example.com", project: "site" });
 */
export function mount(options: DevtoolsOptions): () => void {
  return startDevtools(options, () =>
    import("./panel/mount-panel").then((panel) => panel.mountPanel),
  );
}
export type {
  Bootstrap,
  BotSignal,
  ClientReport,
  Consent,
  JsonValue,
  LiveSession,
  LogEntry,
  LogKind,
  LogLevel,
  LogOutcome,
  LogSource,
  OnlineVisitor,
  Overview,
  SessionSignal,
  Share,
  VisitorDetail,
  Vitals,
} from "./client/types";
