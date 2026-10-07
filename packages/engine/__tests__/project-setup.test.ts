import { describe, expect, test } from "bun:test";

import { defaultOrigins, envBlock, suggestProjectId } from "../src/projects/setup";

describe("defaultOrigins", () => {
  test("gives the apex and www origins", () => {
    expect(defaultOrigins("remcostoeten.nl")).toEqual([
      "https://remcostoeten.nl",
      "https://www.remcostoeten.nl",
    ]);
  });

  test("keeps one origin for a www domain and strips scheme, path and port", () => {
    expect(defaultOrigins("www.example.com")).toEqual(["https://www.example.com"]);
    expect(defaultOrigins("https://Example.com/path?x=1")).toEqual([
      "https://example.com",
      "https://www.example.com",
    ]);
    expect(defaultOrigins("localhost:3000")).toEqual([
      "https://localhost",
      "https://www.localhost",
    ]);
  });

  test("gives no origins for an empty domain", () => {
    expect(defaultOrigins("  ")).toEqual([]);
  });
});

describe("suggestProjectId", () => {
  test("derives an id from the domain", () => {
    expect(suggestProjectId("www.Remco_Stoeten.nl")).toBe("remco-stoeten.nl");
    expect(suggestProjectId("https://docs.example.com/")).toBe("docs.example.com");
    expect(suggestProjectId("")).toBeNull();
    expect(suggestProjectId("---")).toBeNull();
  });
});

describe("envBlock", () => {
  test("prints the three variables", () => {
    expect(
      envBlock({
        project: "blog",
        publicKey: "pk_live_1",
        secretKey: "sk_live_2",
        endpoint: "https://api.example.com",
      }),
    ).toBe(
      `NEXT_PUBLIC_RA_CONFIG='{"project":"blog","key":"pk_live_1","endpoint":"/_ra"}'\nRA_SECRET=sk_live_2\nRA_ENDPOINT=https://api.example.com`,
    );
  });
});
