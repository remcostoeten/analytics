import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Widget } from "../src/widget/widget";

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function render(open = false) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Widget open={open} />));
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

function press(init: KeyboardEventInit) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", init));
  });
}

describe("Widget", () => {
  test("shows the launcher until opened", () => {
    const container = render();
    expect(container.querySelector('[aria-label="Open the debug console"]')).not.toBeNull();
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  test("toggles with Ctrl+Shift+K and closes with Escape", () => {
    const container = render();
    press({ key: "K", ctrlKey: true, shiftKey: true });
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
    press({ key: "Escape" });
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  test("opens from the launcher and closes from the close button", () => {
    const container = render();
    act(() =>
      container.querySelector<HTMLButtonElement>('[aria-label="Open the debug console"]')?.click(),
    );
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
    act(() =>
      container.querySelector<HTMLButtonElement>('[aria-label="Close the debug console"]')?.click(),
    );
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  test("moves focus into the panel and back to the launcher on close", () => {
    const container = render();
    const launcher = container.querySelector<HTMLButtonElement>(
      '[aria-label="Open the debug console"]',
    );
    act(() => launcher?.click());
    expect(document.activeElement === container.querySelector("[role=dialog]")).toBe(true);
    press({ key: "Escape" });
    const back = container.querySelector('[aria-label="Open the debug console"]');
    expect(document.activeElement === back).toBe(true);
  });

  test("shows the status bar above the console", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(<Widget open statusBar={<p>Token live until 12:15</p>} />));
    expect(container.querySelector("[role=dialog]")?.textContent).toContain(
      "Token live until 12:15",
    );
    act(() => root.unmount());
    container.remove();
  });

  test("starts open with the open prop", () => {
    const container = render(true);
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
  });
});
