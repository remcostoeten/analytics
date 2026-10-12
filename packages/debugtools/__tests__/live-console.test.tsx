import { afterEach, describe, expect, test } from "bun:test";
import type { QueryHistory, QueryResult, QuerySchema } from "@spoar/contract";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { LiveConsole } from "../src/live/live-console";
import type { ConsoleSource } from "../src/source";
import { Widget } from "../src/widget/widget";

type Run = { sql: string; range: string };

const schema: QuerySchema = {
  data: [
    {
      name: "events",
      description: "One row per event",
      columns: [
        { name: "ts", type: "timestamptz", description: "" },
        { name: "path", type: "text", description: "" },
      ],
    },
  ],
  params: [],
};

const history: QueryHistory = {
  data: [
    {
      id: "qr_1",
      actor: { kind: "token", id: "tok_1" },
      projectIds: ["site"],
      sql: "select path from events",
      durationMs: 3,
      rowCount: 1,
      blocked: false,
      error: null,
      createdAt: "2026-10-11T11:00:00.000Z",
    },
  ],
  nextCursor: null,
};

const answer: QueryResult = {
  columns: ["path", "views"],
  rows: [
    ["/pricing", 12],
    ["/blog", null],
  ],
  rowCount: 2,
  truncated: false,
  durationMs: 7,
};

function memorySource(runs: Run[]): ConsoleSource {
  return {
    project: "site",
    schema: async () => ({ ok: true, value: schema }),
    history: async () => ({ ok: true, value: history }),
    run: async (sql, range) => {
      runs.push({ sql, range });
      return { ok: true, value: answer };
    },
  };
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function render(node: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(node));
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

function button(container: HTMLElement, name: string) {
  return [...container.querySelectorAll("button")].find(
    (item) => item.textContent?.trim().startsWith(name) || item.getAttribute("aria-label") === name,
  );
}

describe("LiveConsole", () => {
  test("lists the views, the recent queries, and runs SQL over the time range", async () => {
    const runs: Run[] = [];
    const container = await render(<LiveConsole source={memorySource(runs)} />);
    expect(container.textContent).toContain("events");
    expect(container.textContent).toContain("select path from events");
    await act(async () => button(container, "Run")?.click());
    expect(runs).toHaveLength(1);
    expect(runs[0]?.range).toBe("24h");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(container.textContent).toContain("2 rows in 7 ms");
    expect(container.textContent).toContain("null");
  });

  test("runs a quick query on the selected dataset", async () => {
    const runs: Run[] = [];
    const container = await render(<LiveConsole source={memorySource(runs)} />);
    await act(async () => button(container, "Latest rows")?.click());
    expect(runs[0]?.sql).toBe(
      "select *\nfrom events\nwhere ts >= :from and ts < :to\norder by ts desc\nlimit 100",
    );
    const editor = container.querySelector("textarea");
    expect(editor?.value).toBe(runs[0]?.sql ?? "");
  });

  test("shows a failed run's message", async () => {
    const source: ConsoleSource = {
      ...memorySource([]),
      run: async () => ({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "You may not run SQL on this project",
          status: 403,
          details: null,
          requestId: null,
        },
      }),
    };
    const container = await render(<LiveConsole source={source} />);
    await act(async () => button(container, "Run")?.click());
    expect(container.querySelector("[role=alert]")?.textContent).toBe(
      "You may not run SQL on this project",
    );
  });
});

describe("Widget panel", () => {
  test("opens docked and switches between floating, maximised and docked", async () => {
    const container = await render(<Widget label="site" source={memorySource([])} />);
    await act(async () => button(container, "Open the debug console")?.click());
    function panel() {
      return container.querySelector<HTMLElement>("[role=dialog]");
    }
    expect(panel()?.dataset.mode).toBe("docked");
    await act(async () => button(container, "Pop out as a floating window")?.click());
    expect(panel()?.dataset.mode).toBe("floating");
    await act(async () => button(container, "Maximise")?.click());
    expect(panel()?.dataset.mode).toBe("maximized");
    await act(async () => button(container, "Restore size")?.click());
    expect(panel()?.dataset.mode).toBe("docked");
    await act(async () => button(container, "Close the debug console")?.click());
    expect(panel()).toBeNull();
  });
});
