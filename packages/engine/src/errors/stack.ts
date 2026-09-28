export type Frame = {
  file: string;
  line: number | null;
  column: number | null;
  function: string | null;
  inApp: boolean;
};

// Chrome and Edge: "    at fn (https://x.test/a.js:10:5)" or "    at https://x.test/a.js:10:5".
const chromeFrame = /^\s*at (?:(?:async )?(.+?) \()?(.+?):(\d+):(\d+)\)?$/;
// Firefox and Safari: "fn@https://x.test/a.js:10:5" or "@https://x.test/a.js:10:5".
const geckoFrame = /^\s*(.*?)@(.+?):(\d+):(\d+)$/;
const outside = [
  "node_modules",
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "webkit-masked-url://",
  "<anonymous>",
  "[native code]",
];

function frameOf(match: RegExpExecArray): Frame {
  const [, name, file = "", line, column] = match;
  return {
    file,
    line: line ? Number(line) : null,
    column: column ? Number(column) : null,
    function: name && name !== "global code" ? name : null,
    inApp: !outside.some((marker) => file.includes(marker)),
  };
}

/**
 * @name parseStack
 * @description The frames of a Chrome, Edge, Firefox or Safari stack trace, top first, marking
 * frames from `node_modules`, browser extensions and native code as not in-app. Lines that are not
 * frames, such as the message line, are skipped.
 *
 * @example
 * parseStack("TypeError: x\n    at render (https://site.test/app.js:10:5)");
 * // [{ file: "https://site.test/app.js", line: 10, column: 5, function: "render", inApp: true }]
 */
export function parseStack(stack: string): Frame[] {
  const frames: Frame[] = [];
  for (const line of stack.split("\n")) {
    const match = chromeFrame.exec(line) ?? geckoFrame.exec(line);
    if (match) frames.push(frameOf(match));
  }
  return frames;
}
