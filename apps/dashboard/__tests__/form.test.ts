import { describe, expect, test } from "bun:test";

import { defaultOrigins, fieldErrors, hostOf, lines, suggestId } from "../src/modules/admin/form";

describe("hostOf", () => {
  test("strips scheme, path and port", () => {
    expect(hostOf("https://www.Example.com:443/path?q=1")).toBe("www.example.com");
    expect(hostOf("  example.com  ")).toBe("example.com");
  });
});

describe("suggestId", () => {
  test("drops www and keeps the id alphabet", () => {
    expect(suggestId("https://www.remcostoeten.nl")).toBe("remcostoeten.nl");
    expect(suggestId("My Site.com")).toBe("my-site.com");
    expect(suggestId("-.lead")).toBe("lead");
  });
});

describe("defaultOrigins", () => {
  test("adds the www twin unless the host already has it", () => {
    expect(defaultOrigins("example.com")).toEqual([
      "https://example.com",
      "https://www.example.com",
    ]);
    expect(defaultOrigins("www.example.com")).toEqual(["https://www.example.com"]);
    expect(defaultOrigins("")).toEqual([]);
  });
});

describe("lines", () => {
  test("keeps trimmed non-empty lines", () => {
    expect(lines(" https://a.com \r\n\n https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
});

describe("fieldErrors", () => {
  test("maps validation fields by name", () => {
    const errors = fieldErrors({
      code: "VALIDATION_FAILED",
      message: "Validation failed",
      status: 400,
      requestId: null,
      details: { fields: [{ path: "/id", message: "bad id" }, { path: 7 }] },
    });
    expect(errors).toEqual({ id: "bad id" });
  });

  test("is empty for other errors", () => {
    expect(
      fieldErrors({
        code: "FORBIDDEN",
        message: "no",
        status: 403,
        requestId: null,
        details: null,
      }),
    ).toEqual({});
  });
});
