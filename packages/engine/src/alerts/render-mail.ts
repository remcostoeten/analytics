import type { AlertEvent, ChannelName } from "@remcostoeten/analytics-contract";

import type { DeliveryBatch } from "../ports/alerts";
import { alertEventNames, alertLabels, newestFirst } from "./events";

export type RenderedMail = { subject: string; text: string; html: string };

const tagWidth = 12;
const escapes: { [char: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => escapes[char] ?? char);
}

function times(count: number) {
  return count === 1 ? "once" : `${count} times`;
}

function detail(event: AlertEvent) {
  const release = event.issue.lastRelease;
  const parts = [event.issue.culprit, times(event.issue.count)];
  if (event.name === "issue.regression") {
    parts.push(release ? `resolved, seen again in ${release}` : "resolved, seen again");
  } else if (release) {
    parts.push(`release ${release}`);
  }
  return parts.filter((part) => part !== null).join(" · ");
}

function counts(events: AlertEvent[]) {
  return alertEventNames
    .map((name) => {
      const count = events.filter((event) => event.name === name).length;
      if (count === 0) return null;
      return `${count} ${count === 1 ? alertLabels[name].one : alertLabels[name].many}`;
    })
    .filter((part) => part !== null)
    .join(", ");
}

function projectsOf(events: AlertEvent[]) {
  return [...new Set(events.map((event) => event.project))].join(", ");
}

function textBlock(event: AlertEvent) {
  const indent = " ".repeat(tagWidth);
  return [
    `${alertLabels[event.name].tag.padEnd(tagWidth)}${event.issue.title}`,
    `${indent}${detail(event)}`,
    `${indent}${event.issue.url}`,
  ].join("\n");
}

function htmlRow(event: AlertEvent) {
  return `<tr><td style="padding:12px 16px 12px 0;vertical-align:top;color:#a3a3a3;font-size:11px;letter-spacing:0.08em;white-space:nowrap">${alertLabels[event.name].tag}</td><td style="padding:12px 0;border-top:1px solid #262626"><a href="${escapeHtml(event.issue.url)}" style="color:#fafafa;text-decoration:none;font-weight:600">${escapeHtml(event.issue.title)}</a><div style="color:#a3a3a3;font-size:13px;margin-top:4px">${escapeHtml(detail(event))}</div></td></tr>`;
}

/**
 * @name alertSubject
 * @description The one-line summary of a batch, such as `[remcostoeten.nl] 2 new issues, 1
 * regression`, used as the mail subject and the Discord message.
 *
 * @example
 * alertSubject(batch); // "[remcostoeten.nl] 1 new issue"
 */
export function alertSubject<Name extends ChannelName>(batch: DeliveryBatch<Name>) {
  const events = batch.deliveries.map((delivery) => delivery.event);
  return `[${projectsOf(events) || batch.target.projectId}] ${counts(events)}`;
}

/**
 * @name renderMail
 * @description One mail for a batch: a subject such as `[remcostoeten.nl] 2 new issues, 1
 * regression`, and every alert newest first as plain text and as dark, neutral HTML.
 *
 * @example
 * const { subject, text, html } = renderMail(batch);
 */
export function renderMail<Name extends ChannelName>(batch: DeliveryBatch<Name>): RenderedMail {
  const events = newestFirst(batch.deliveries.map((delivery) => delivery.event));
  const subject = alertSubject(batch);
  const text = events.map(textBlock).join("\n\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"><div style="max-width:640px;margin:0 auto"><p style="margin:0 0 16px;color:#a3a3a3;font-size:13px">${escapeHtml(subject)}</p><table role="presentation" style="width:100%;border-collapse:collapse">${events.map(htmlRow).join("")}</table></div></body></html>`;
  return { subject, text: `${text}\n`, html };
}
