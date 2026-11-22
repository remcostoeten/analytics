import type { AutocaptureKind } from "@spoar/contract";
import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import { definePlugin } from "../core/plugin-host";

export type AutocaptureOptions = {
  kinds?: AutocaptureKind[];
};

const excluded = "[data-spoar-ignore],[data-spoar-click],[data-ra-click],[contenteditable]";
const fields = "input,select,textarea";
const targets: { [type: string]: string } = {
  click: "a,button,[role=button],input[type=submit],summary,label",
  submit: "form",
  change: fields,
};

// Field types and autocomplete tokens for personal data, such as `password`, `tel-national` or `cc-number`.
const sensitive = /mail|tel|cc-|name|word|one-time|addr|postal|bday/i;
// An email, six digits in a row, or a run of 8+ letters and digits holding at least one digit.
const tokenLike = /@|%40|\d{6}|(^|[^a-z\d])(?=[a-z]*\d)[a-z\d]{8,}/i;

function redact(path: string) {
  return path.replace(/[^/]+/g, (part) => (tokenLike.test(part) ? ":redacted" : part));
}

function pathOf(raw: Nullable<string>) {
  const link = document.createElement("a");
  link.href = raw ?? "";
  return raw && link.protocol.startsWith("http") ? redact(link.pathname) : "";
}

function selectorOf(node: Element, depth = 2): string {
  const { localName, parentElement } = node;
  const key = ["id", "data-testid", "name"].find((name) => {
    const value = node.getAttribute(name);
    return value && !tokenLike.test(value);
  });
  if (key) return `${localName}[${key}=${JSON.stringify(node.getAttribute(key))}]`;
  const position = [...(parentElement?.children ?? [])].indexOf(node) + 1;
  const part = `${localName}:nth-child(${position})`;
  return parentElement && depth ? `${selectorOf(parentElement, depth - 1)}>${part}` : part;
}

/**
 * @name autocapture
 * @description Sends one `autocapture` event per interaction, with `kind`, `selector`, `tag`,
 * `route` and, where they apply, `text` and a redacted `href`. Records `click` and `submit` unless
 * `kinds` lists others. Input values are never read.
 *
 * @example
 * createAnalytics({ ...config, plugins: [autocapture({ kinds: ["click", "submit", "rage"] })] });
 */
export function autocapture({ kinds = ["click", "submit"] }: AutocaptureOptions = {}) {
  return definePlugin({
    name: "autocapture",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      const enabled = new Set<string>(kinds);
      const listeners = new AbortController();
      let recent: [number, number, number][] = [];
      let fired = false;

      function isRage({ clientX, clientY, timeStamp }: MouseEvent) {
        recent = recent.filter(
          ([x, y, at]) => timeStamp - at <= 1000 && Math.hypot(clientX - x, clientY - y) <= 30,
        );
        recent.push([clientX, clientY, timeStamp]);
        if (!recent[1]) fired = false;
        const rage = !fired && !!recent[2];
        fired ||= rage;
        return rage;
      }

      function onEvent(event: Event) {
        const { target, type } = event;
        if (!(target instanceof Element) || target.closest(excluded)) return;
        const element = target.closest(targets[type] ?? fields);
        if (!element) return;
        const control = element instanceof HTMLLabelElement ? element.control : null;
        const field = control ?? element;
        if (
          control === target ||
          sensitive.test(`${field.getAttribute("type")} ${field.getAttribute("autocomplete")}`)
        )
          return;
        const props: { [key: string]: string } = {
          selector: selectorOf(element),
          tag: element.localName,
          route: client.status().route ?? pathOf(location.href),
        };
        const href = pathOf(element.getAttribute("href") ?? element.getAttribute("action"));
        const text =
          type === "click" &&
          !element.closest("[data-spoar-mask]") &&
          !element.querySelector(`${excluded},[data-spoar-mask],${fields}`) &&
          element.textContent?.replace(/\s+/g, " ").trim().slice(0, 64);
        if (href) props.href = href;
        if (text) props.text = text;
        if (enabled.has(type)) client.track("autocapture", { ...props, kind: type });
        if (enabled.has("rage") && event instanceof MouseEvent && event.detail > 0 && isRage(event))
          client.track("autocapture", { ...props, kind: "rage" });
      }

      for (const type of Object.keys(targets))
        document.addEventListener(type, onEvent, { capture: true, signal: listeners.signal });
      return () => listeners.abort();
    },
  });
}
