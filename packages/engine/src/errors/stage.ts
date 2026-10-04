import { ok } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import { defineStage } from "../define";
import { fingerprintParts, normaliseFile, topFrame } from "./fingerprint";
import { scrubText } from "./scrub";
import { parseStack } from "./stack";

export type IssueDraft = {
  fingerprint: string;
  title: string;
  culprit: Nullable<string>;
  level: "error" | "warning";
  release: Nullable<string>;
};

const maxTitle = 200;
// A breadcrumb line: the Unix milliseconds, then the rest.
const crumbLine = /^(\d+) (.*)$/;

function scrubCrumbs(trail: string) {
  return trail
    .split("\n")
    .map((line) => {
      const match = crumbLine.exec(line);
      return match ? `${match[1]} ${scrubText(match[2] ?? "")}` : scrubText(line);
    })
    .join("\n");
}

function text(value: unknown): Nullable<string> {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * @name errorStage
 * @description For `error` events: scrubs the message, stack and breadcrumbs, then fingerprints
 * the error from its type, normalised message and top in-app frame (or the `fingerprint` prop
 * when the app sets one) and attaches the issue it belongs to, with its title, culprit, level
 * and release. Other events pass through.
 *
 * @example
 * const stages = [...defaultStages, errorStage];
 */
export const errorStage = defineStage({
  name: "error",
  rescores: false,
  run: async (draft, context) => {
    const { event } = draft;
    if (event.name !== "error") return ok(draft);
    const props = { ...event.props };
    const type = text(props.type) ?? "Error";
    const message = scrubText(text(props.message) ?? "");
    const stack = scrubText(text(props.stack) ?? "");
    props.message = message;
    if (text(props.stack)) props.stack = stack;
    const breadcrumbs = text(props.breadcrumbs);
    if (breadcrumbs) props.breadcrumbs = scrubCrumbs(breadcrumbs);
    const frames = parseStack(stack);
    const custom = text(props.fingerprint);
    const fingerprint = await context.ports.hasher.sha256(
      custom ? `custom\n${custom}` : fingerprintParts(type, message, frames).join("\n"),
    );
    const frame = topFrame(frames);
    return ok({
      ...draft,
      event: { ...event, props },
      issue: {
        fingerprint,
        title: (message ? `${type}: ${message}` : type).slice(0, maxTitle),
        culprit: frame ? `${normaliseFile(frame.file)} in ${frame.function ?? "?"}` : null,
        level: props.level === "warning" ? "warning" : "error",
        release: text(props.release) ?? event.context?.release ?? null,
      },
    });
  },
});
