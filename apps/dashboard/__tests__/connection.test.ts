import { describe, expect, test } from "bun:test";

import { connectionOf } from "../src/modules/admin/connection";

const quiet = { accepted: 0, duplicates: 0, rejected: 0, rateLimited: 0 };

describe("connectionOf", () => {
  test("accepted events mean the site is connected, even with some refused", () => {
    expect(connectionOf({ ...quiet, accepted: 8 })).toBe("connected");
    expect(connectionOf({ ...quiet, accepted: 3, rejected: 2 })).toBe("connected");
  });

  test("rejected or rate-limited batches with nothing accepted mean the ingest refuses the site", () => {
    expect(connectionOf({ ...quiet, rejected: 4 })).toBe("rejected");
    expect(connectionOf({ ...quiet, rateLimited: 1 })).toBe("rejected");
  });

  test("no traffic at all is still waiting for the first event", () => {
    expect(connectionOf(quiet)).toBe("waiting");
    expect(connectionOf({ ...quiet, duplicates: 2 })).toBe("waiting");
  });
});
