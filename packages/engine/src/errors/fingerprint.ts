import type { Frame } from "./stack";

// A UUID.
const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
// A hexadecimal id: 0x-prefixed, or a run of 8 or more hex digits.
const hex = /\b(?:0x[0-9a-f]+|[0-9a-f]{8,})\b/gi;
// A digit.
const digit = /\d/;
// A number.
const number = /\d+(?:\.\d+)?/g;
// A scheme and host at the start of a URL.
const origin = /^[a-z][a-z0-9+.-]*:\/\/[^/]+/i;
// A content hash before the extension, such as "-4f2a9c1b" or ".a1b2c3d4" in "page-4f2a9c1b.js".
const fileHash = /[.-][0-9a-f]{6,}(?=\.[a-z]+$)/i;

/**
 * @name normaliseMessage
 * @description An error message with the parts that change between occurrences replaced: UUIDs,
 * hex ids and numbers.
 *
 * @example
 * normaliseMessage("Item 4521 not found"); // "Item <n> not found"
 */
export function normaliseMessage(message: string): string {
  return message
    .replaceAll(uuid, "<id>")
    .replaceAll(hex, (run) => (run.startsWith("0x") || digit.test(run) ? "<id>" : run))
    .replaceAll(number, "<n>")
    .trim();
}

/**
 * @name normaliseFile
 * @description A stack frame's file without its origin, query, fragment and content hash, so the
 * same file on a new deploy looks the same.
 *
 * @example
 * normaliseFile("https://site.test/_next/static/chunks/page-4f2a9c1b.js?v=2"); // "/_next/static/chunks/page.js"
 */
export function normaliseFile(file: string): string {
  const path = file.replace(origin, "").split(/[?#]/)[0] ?? "";
  return path.replace(fileHash, "");
}

/**
 * @name topFrame
 * @description The first in-app frame, or the first frame when none is in-app.
 *
 * @example
 * topFrame(parseStack(stack));
 */
export function topFrame(frames: Frame[]): Frame | null {
  return frames.find((frame) => frame.inApp) ?? frames[0] ?? null;
}

/**
 * @name fingerprintParts
 * @description What groups an error into an issue: the error type, the normalised message and the
 * top in-app frame's file and function, without line numbers.
 *
 * @example
 * fingerprintParts("TypeError", "Item 4 not found", frames).join("\n");
 */
export function fingerprintParts(type: string, message: string, frames: Frame[]): string[] {
  const frame = topFrame(frames);
  return [
    type,
    normaliseMessage(message),
    frame ? `${normaliseFile(frame.file)} ${frame.function ?? "?"}` : "",
  ];
}
