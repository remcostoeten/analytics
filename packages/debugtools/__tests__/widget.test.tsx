import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Widget } from "../src/widget/widget";

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function render() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Widget />));
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
    expect(container.querySelector(".spd-launcher")).not.toBeNull();
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
    act(() => container.querySelector<HTMLButtonElement>(".spd-launcher")?.click());
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
    act(() => container.querySelector<HTMLButtonElement>(".spd-close")?.click());
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });
});
