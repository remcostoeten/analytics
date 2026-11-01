import { afterEach, describe, expect, test } from "bun:test";
import { createClient } from "@spoar/client";
import type { Nullable } from "@spoar/shared/semantic";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Actions } from "../src/actions/actions";
import type { ConsoleHost } from "../src/host";
import type { ViewContext } from "../src/widget/view";

type Seen = { method: string; url: string; authorization: Nullable<string>; body: string };

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fakeHost(optedOut = false) {
  const calls: string[] = [];
  let out = optedOut;
  const host: ConsoleHost = {
    on: () => () => {},
    optOut: () => {
      calls.push("optOut");
      out = true;
    },
    optIn: () => {
      calls.push("optIn");
      out = false;
    },
    isOptedOut: () => out,
    status: () => ({
      queued: 0,
      consent: "unset",
      endpoint: "/_ra",
      lastError: null,
      lastSend: null,
    }),
  };
  return {
    host,
    calls,
    setOut: (value: boolean) => {
      out = value;
    },
  };
}

function fakeClient(seen: Seen[], answer: () => Response) {
  return async () =>
    createClient({
      endpoint: "https://api.example.com",
      token: "wt_test",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        seen.push({
          method: request.method,
          url: request.url,
          authorization: request.headers.get("authorization"),
          body: await request.text(),
        });
        return answer();
      },
    });
}

function render(context: ViewContext) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Actions context={context} />));
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

function find<Element extends HTMLElement>(container: HTMLElement, selector: string) {
  const found = container.querySelector<Element>(selector);
  if (!found) throw new Error(`Nothing matches ${selector}`);
  return found;
}

function type(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = Object.getPrototypeOf(field) as object;
  act(() => {
    // React tracks the value it last set, so the change goes through the prototype's setter.
    Reflect.set(prototype, "value", value, field);
    field.dispatchEvent(
      new Event(field instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}

function annotateButton(container: HTMLElement) {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === "Annotate",
  );
  if (!button) throw new Error("No Annotate button");
  return button;
}

async function submit(container: HTMLElement) {
  await act(async () => {
    find<HTMLFormElement>(container, "form").requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const created = {
  data: {
    id: "ann_1",
    project: "site",
    title: "v2.1 released",
    date: "2026-11-01T12:00:00.000Z",
    endDate: null,
    kind: "release",
    note: null,
    url: "https://site.example/cars",
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
  },
};

describe("Count my visits", () => {
  test("is hidden without a host", () => {
    const container = render({
      project: "site",
      client: fakeClient([], () => Response.json({})),
      host: null,
    });
    expect(container.querySelector("[role=switch]")).toBeNull();
    expect(annotateButton(container)).not.toBeNull();
  });

  test("reads the opt-out and toggles it through the host", () => {
    const fake = fakeHost(true);
    const container = render({
      project: "site",
      client: fakeClient([], () => Response.json({})),
      host: fake.host,
    });
    const toggle = find<HTMLButtonElement>(container, "[role=switch]");
    expect(toggle.textContent).toBe("Count my visits");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    act(() => toggle.click());
    expect(fake.calls).toEqual(["optIn"]);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    act(() => toggle.click());
    expect(fake.calls).toEqual(["optIn", "optOut"]);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  test("follows a change another tab stores", () => {
    const fake = fakeHost(false);
    const container = render({
      project: "site",
      client: fakeClient([], () => Response.json({})),
      host: fake.host,
    });
    fake.setOut(true);
    act(() => {
      window.dispatchEvent(new Event("storage"));
    });
    expect(find(container, "[role=switch]").getAttribute("aria-checked")).toBe("false");
  });
});

describe("Annotate", () => {
  test("posts the annotation with the page url and reports success", async () => {
    const seen: Seen[] = [];
    const container = render({
      project: "site",
      client: fakeClient(seen, () => Response.json(created, { status: 201 })),
      host: null,
    });
    act(() => annotateButton(container).click());
    expect(find<HTMLInputElement>(container, "input[type=url]").value).toBe(
      "https://site.example/cars",
    );
    type(find<HTMLInputElement>(container, "input[maxlength='120']"), "v2.1 released");
    type(find<HTMLTextAreaElement>(container, "textarea"), "Faster loads");
    type(find<HTMLSelectElement>(container, "select"), "post");
    await submit(container);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.method).toBe("POST");
    expect(seen[0]?.url).toBe("https://api.example.com/v2/projects/site/annotations");
    expect(seen[0]?.authorization).toBe("Bearer wt_test");
    const body = JSON.parse(seen[0]?.body ?? "{}") as { [key: string]: string };
    expect(body).toMatchObject({
      title: "v2.1 released",
      kind: "post",
      note: "Faster loads",
      url: "https://site.example/cars",
    });
    expect(Number.isNaN(Date.parse(body.date ?? ""))).toBe(false);
    expect(container.querySelector("form")).toBeNull();
    expect(find(container, "[role=status]").textContent).toBe('Added "v2.1 released"');
  });

  test("asks for a title before sending anything", async () => {
    const seen: Seen[] = [];
    const container = render({
      project: "site",
      client: fakeClient(seen, () => Response.json(created, { status: 201 })),
      host: null,
    });
    act(() => annotateButton(container).click());
    await submit(container);
    expect(seen).toHaveLength(0);
    expect(find(container, "[role=alert]").textContent).toBe("Give the annotation a title.");
  });

  test("refuses a link that is not http or https", async () => {
    const seen: Seen[] = [];
    const container = render({
      project: "site",
      client: fakeClient(seen, () => Response.json(created, { status: 201 })),
      host: null,
    });
    act(() => annotateButton(container).click());
    type(find<HTMLInputElement>(container, "input[maxlength='120']"), "Launch");
    type(find<HTMLInputElement>(container, "input[type=url]"), "javascript:alert(1)");
    await submit(container);
    expect(seen).toHaveLength(0);
    expect(find(container, "[role=alert]").textContent).toBe(
      "The link must start with http:// or https://.",
    );
  });

  test("shows the API's error message and keeps the form open", async () => {
    const seen: Seen[] = [];
    const container = render({
      project: "site",
      client: fakeClient(seen, () =>
        Response.json(
          { error: { code: "FORBIDDEN", message: "Adding an annotation needs a project admin" } },
          { status: 403 },
        ),
      ),
      host: null,
    });
    act(() => annotateButton(container).click());
    type(find<HTMLInputElement>(container, "input[maxlength='120']"), "Launch");
    const url = find<HTMLInputElement>(container, "input[type=url]");
    type(url, "");
    await submit(container);
    expect(JSON.parse(seen[0]?.body ?? "{}")).not.toHaveProperty("url");
    expect(find(container, "[role=alert]").textContent).toBe(
      "Adding an annotation needs a project admin",
    );
    expect(container.querySelector("form")).not.toBeNull();
  });
});
