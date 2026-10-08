import { describe, expect, test } from "bun:test";

import { labelPosition } from "../src/modules/session/sign-in-state";

describe("labelPosition", () => {
  test("the active label is active and the others sit on either side", () => {
    expect(labelPosition("busy", "busy")).toBe("active");
    expect(labelPosition("idle", "busy")).toBe("before");
    expect(labelPosition("error", "busy")).toBe("after");
  });

  test("returning to idle puts busy and error after it", () => {
    expect(labelPosition("idle", "idle")).toBe("active");
    expect(labelPosition("busy", "idle")).toBe("after");
    expect(labelPosition("error", "idle")).toBe("after");
  });
});
