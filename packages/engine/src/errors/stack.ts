export type Frame = {
  file: string;
  line: number | null;
  column: number | null;
  function: string | null;
  inApp: boolean;
};

// The trailing ":line:column" of a frame's location.
const position = /:(\d+):(\d+)$/;
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

function frameOf(name: string, location: string): Frame | null {
  const match = position.exec(location);
  if (!match) return null;
  const file = location.slice(0, match.index);
  if (file.length === 0) return null;
  return {
    file,
    line: Number(match[1]),
    column: Number(match[2]),
    function: name.length > 0 && name !== "global code" ? name : null,
    inApp: !outside.some((marker) => file.includes(marker)),
  };
}

function parseLine(line: string): Frame | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("at ")) {
    const after = trimmed.slice(3);
    const rest = after.startsWith("async ") ? after.slice(6) : after;
    const open = rest.lastIndexOf(" (");
    if (open !== -1 && rest.endsWith(")"))
      return frameOf(rest.slice(0, open), rest.slice(open + 2, -1));
    return frameOf("", rest);
  }
  const at = trimmed.indexOf("@");
  return at === -1 ? null : frameOf(trimmed.slice(0, at), trimmed.slice(at + 1));
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
  return stack.split("\n").flatMap((line) => {
    const frame = parseLine(line);
    return frame ? [frame] : [];
  });
}
