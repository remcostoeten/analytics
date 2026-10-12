export type ConsoleSection =
  | "nav"
  | "toolbar"
  | "editor"
  | "results"
  | "library"
  | "recent"
  | "agent";

export type ConsoleSections = { [Section in ConsoleSection]?: boolean };

export type ResolvedSections = { [Section in ConsoleSection]: boolean };

export const defaultSections: ResolvedSections = {
  nav: true,
  toolbar: true,
  editor: true,
  results: true,
  library: true,
  recent: true,
  agent: false,
};

/**
 * @name resolveSections
 * @description Fills the sections a caller left out with their defaults. Every section is on
 * except the agent pane, which stays off until a caller turns it on.
 *
 * @example
 * resolveSections({ agent: true, library: false }).agent;
 * // true
 */
export function resolveSections(sections?: ConsoleSections): ResolvedSections {
  return { ...defaultSections, ...sections };
}
