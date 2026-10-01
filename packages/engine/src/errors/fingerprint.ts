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
// A content hash before the extension: hex such as "-4f2a9c1b" or ".a1b2c3d4", an 8 character
// base64url hash with a digit, an uppercase letter or "_" such as Vite's "-BxK3_q9Z", or a file
// named by 16 or more hex digits such as Next's "a1b2c3d4e5f6a7b8".
const fileHash =
  /(?:[.-](?:[0-9a-fA-F]{6,}|(?=[\w-]{0,7}[0-9A-Z_])[\w-]{8})|(?<=\/)[0-9a-fA-F]{16,})(?=\.[a-z]+$)/;
// A function name of 3 characters or fewer, which a minifier gives a new name on each build.
const minified = 3;

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

function functionName(name: string | null) {
  return name && name.length > minified ? name : "?";
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
 * top in-app frame's file and function, without line numbers. A function name of 3 characters or
 * fewer counts as minified and is left out.
 *
 * @example
 * fingerprintParts("TypeError", "Item 4 not found", frames).join("\n");
 */
export function fingerprintParts(type: string, message: string, frames: Frame[]): string[] {
  const frame = topFrame(frames);
  return [
    type,
    normaliseMessage(message),
    frame ? `${normaliseFile(frame.file)} ${functionName(frame.function)}` : "",
  ];
}
