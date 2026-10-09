import type { ProjectScope } from "@spoar/client";

const showcaseDays = 30;

const minuteMs = 60_000;
const dayMs = 24 * 60 * minuteMs;

/**
 * @name showcaseWindow
 * @description The window the landing page reads: the last 30 days up to the current minute, so a
 * visit counts the moment it lands. The API's `30d` period ends at midnight UTC and would leave
 * today out.
 *
 * @example
 * const { from, to } = showcaseWindow();
 */
export function showcaseWindow(now = new Date()) {
  const to = new Date(Math.floor(now.getTime() / minuteMs) * minuteMs);
  return { from: new Date(to.getTime() - showcaseDays * dayMs), to };
}

/**
 * @name showcaseReads
 * @description A project scope over the showcase window, built at call time so a later read runs
 * up to now.
 *
 * @example
 * const stats = await showcaseReads(client.project("docs")).stats();
 */
export function showcaseReads(project: ProjectScope) {
  const { from, to } = showcaseWindow();
  return project.between(from, to);
}
