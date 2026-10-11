import { describe, expect, test } from "bun:test";

import { defaultSections, resolveSections } from "../src/sections";

describe("resolveSections", () => {
  test("turns every section on except the agent pane", () => {
    expect(resolveSections()).toEqual(defaultSections);
    expect(defaultSections.agent).toBe(false);
  });

  test("keeps what the caller set and defaults the rest", () => {
    const sections = resolveSections({ agent: true, library: false });
    expect(sections.agent).toBe(true);
    expect(sections.library).toBe(false);
    expect(sections.editor).toBe(true);
  });
});
